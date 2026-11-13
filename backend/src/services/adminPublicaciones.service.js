// Publicaciones en el panel: lista, detalle, creación, edición y eliminación
// (contrato: docs/api/admin.md, sección 3, y docs/api/estados-publicacion.md, secciones 5 y 6).
// Toda modificación se hace en una transacción, con la fila bloqueada, y queda en la bitácora.
import { ESTADOS_PUBLICACION, TIPOS_PUBLICACION } from '../constantes/catalogos.js';
import { transaccion } from '../db/index.js';
import { ErrorApp } from '../errores/ErrorApp.js';
import * as modelo from '../models/adminPublicaciones.model.js';
import { actualizarFila, eliminarFila, slugsOcupados } from '../models/comunes.model.js';
import {
  accionesDisponibles,
  errorSinPermisoParaCrear,
  exigirAccion,
  puedeCrear,
} from '../utils/accionesPublicacion.js';
import { exigirSedeDelRecurso } from '../utils/alcanceSede.js';
import { patronBusqueda } from '../utils/busqueda.js';
import { formatearFechaHora, imagen } from '../utils/formato.js';
import { armarPaginacion, desplazamiento } from '../utils/paginacion.js';
import { slugDesde, slugLibre } from '../utils/slugs.js';
import { archivosDelContenido } from '../validacion/blocknote.js';
import { registrarCambio } from './bitacora.service.js';
import { sedeDelRecursoNuevo, verificarArchivos } from './referencias.service.js';

const ENTIDAD = 'publicacion';
const publicado = () => ESTADOS_PUBLICACION.nombreDe('PUBLICADO');

// ---- Respuesta ----

// Lo que necesitan las reglas de acciones: { tipo, estado, autorId } con los códigos de la API.
const situacionDe = (tipoNombre, estadoNombre, autorId) => ({
  tipo: TIPOS_PUBLICACION.codigoDe(tipoNombre),
  estado: ESTADOS_PUBLICACION.codigoDe(estadoNombre),
  autorId,
});

function aRevision(fila) {
  if (fila.revisado_por === null) return null;
  return {
    revisadoPor: { id: fila.revisado_por, nombreCompleto: fila.revisor_nombre },
    fecha: formatearFechaHora(fila.fecha_revision),
    observacion: fila.observacion_revision,
  };
}

// Objeto publicación del panel. La lista no lleva "contenido".
function aPublicacion(fila, usuario, { conContenido = false } = {}) {
  const publicacion = {
    id: fila.id,
    sede: { id: fila.sede_id, nombre: fila.sede_nombre, slug: fila.sede_slug },
    tipo: TIPOS_PUBLICACION.aEnumeracion(fila.tipo_nombre),
    estado: ESTADOS_PUBLICACION.aEnumeracion(fila.estado_nombre),
    titulo: fila.titulo,
    slug: fila.slug,
    resumen: fila.resumen,
    categoria: fila.categoria,
    imagenPortada: imagen({
      id: fila.imagen_id,
      url: fila.imagen_url,
      textoAlternativo: fila.imagen_texto_alternativo,
      ancho: fila.imagen_ancho,
      alto: fila.imagen_alto,
    }),
    urlExterna: fila.url_externa,
    destacada: fila.destacada,
    fechaPublicacion: formatearFechaHora(fila.fecha_publicacion),
    fechaExpiracion: formatearFechaHora(fila.fecha_expiracion),
  };
  if (conContenido) publicacion.contenido = fila.contenido;

  return {
    ...publicacion,
    autor: { id: fila.autor_id, nombreCompleto: fila.autor_nombre },
    revision: aRevision(fila),
    fechaCreacion: formatearFechaHora(fila.fecha_creacion),
    visibleEnPortal: fila.visible_en_portal,
    acciones: accionesDisponibles(
      situacionDe(fila.tipo_nombre, fila.estado_nombre, fila.autor_id),
      usuario,
    ),
  };
}

// ---- Lectura ----

// GET /api/admin/publicaciones. sedeFiltro: slug ya restringido a la sede del usuario.
export async function listarPublicaciones(usuario, sedeFiltro, consulta) {
  const { pagina, porPagina, orden } = consulta;

  const { filas, total } = await modelo.listar(
    {
      estadoPublicado: publicado(),
      sedeSlug: sedeFiltro,
      tipos: consulta.tipo?.map((codigo) => TIPOS_PUBLICACION.nombreDe(codigo)),
      estados: consulta.estado?.map((codigo) => ESTADOS_PUBLICACION.nombreDe(codigo)),
      categoria: consulta.categoria,
      autorId: consulta.autor === 'yo' ? usuario.id : consulta.autor,
      patron: consulta.buscar ? patronBusqueda(consulta.buscar) : undefined,
    },
    {
      limite: porPagina,
      desplazamiento: desplazamiento(pagina, porPagina),
      campo: orden.replace(/^-/, ''),
      ascendente: !orden.startsWith('-'),
    },
  );

  return {
    datos: filas.map((fila) => aPublicacion(fila, usuario)),
    paginacion: armarPaginacion({ total, pagina, porPagina }),
  };
}

// GET /api/admin/publicaciones/:id (404 si no existe, 403 si es de otra sede).
export async function obtenerPublicacion(usuario, id) {
  const fila = await modelo.buscarPorId(id, publicado());
  if (!fila) throw ErrorApp.noEncontrado('La publicación no existe.');
  exigirSedeDelRecurso(usuario, fila.sede_id);
  return aPublicacion(fila, usuario, { conContenido: true });
}

// ---- Apoyo de las modificaciones (también lo usan las acciones de estado) ----

// Bloquea la publicación para modificarla: 404 si no existe, 403 si es de otra sede.
// Devuelve { fila, situacion: { tipo, estado, autorId } }.
export async function publicacionParaModificar(usuario, id, db) {
  const bloqueada = await modelo.bloquearParaModificar(id, db);
  if (!bloqueada) throw ErrorApp.noEncontrado('La publicación no existe.');
  exigirSedeDelRecurso(usuario, bloqueada.fila.sede_id);

  const { fila, tipoNombre, estadoNombre } = bloqueada;
  return { fila, situacion: situacionDe(tipoNombre, estadoNombre, fila.autor_id) };
}

const errorSlugOcupado = (slug) =>
  ErrorApp.conflicto(`Ya existe una publicación con el slug «${slug}» en esta sede.`, [
    { campo: 'slug', mensaje: 'Ya está en uso en esta sede.' },
  ]);

// Slug pedido (si ya existe en la sede, 409) o generado desde el título (con sufijo si choca).
async function elegirSlug(db, { sedeId, slugPedido, titulo, excluirId = null }) {
  const base = slugPedido ?? slugDesde(titulo, { largoMaximo: 200, respaldo: 'publicacion' });
  const ocupados = await slugsOcupados(ENTIDAD, { sedeId, base, excluirId }, db);

  if (slugPedido) {
    if (ocupados.includes(slugPedido)) throw errorSlugOcupado(slugPedido);
    return slugPedido;
  }
  return slugLibre(base, ocupados, { largoMaximo: 200 });
}

// Comprueba las referencias del cuerpo que vienen con valor: la categoría, la imagen de portada
// (una imagen de la sede) y las imágenes y videos del contenido (archivos de la sede).
async function verificarReferencias(db, sedeId, { categoriaId, imagenPortadaId, contenido }) {
  const detalles = [];

  if (categoriaId !== undefined && categoriaId !== null) {
    if (!(await modelo.categoriaExiste(categoriaId, db))) {
      detalles.push({ campo: 'categoriaId', mensaje: 'La categoría no existe.' });
    }
  }

  const archivos = await verificarArchivos(
    sedeId,
    [
      { campo: 'imagenPortadaId', clase: 'IMAGEN', id: imagenPortadaId },
      ...(contenido ? archivosDelContenido(contenido) : []),
    ],
    db,
  );
  detalles.push(...archivos.detalles);

  if (detalles.length > 0) throw ErrorApp.validacion(undefined, detalles);
}

// Un slug repetido que se coló entre la comprobación y el INSERT/UPDATE (dos peticiones a la vez).
async function conSlugUnico(slug, operacion) {
  try {
    return await operacion();
  } catch (error) {
    if (error.code === '23505' && error.constraint === 'publicacion_ak_1') {
      throw errorSlugOcupado(slug);
    }
    throw error;
  }
}

// ---- Creación, edición y eliminación ----

// POST /api/admin/publicaciones: siempre en BORRADOR, con el usuario de la sesión como autor.
export async function crearPublicacion(usuario, cuerpo, contexto) {
  if (!puedeCrear(usuario.rol, cuerpo.tipo)) throw errorSinPermisoParaCrear(cuerpo.tipo);

  const id = await transaccion(async (db) => {
    const sedeId = await sedeDelRecursoNuevo(usuario, cuerpo.sedeId, db);
    await verificarReferencias(db, sedeId, cuerpo);
    const slug = await elegirSlug(db, { sedeId, slugPedido: cuerpo.slug, titulo: cuerpo.titulo });

    const fila = await conSlugUnico(slug, () =>
      modelo.insertar(
        {
          sedeId,
          tipoNombre: TIPOS_PUBLICACION.nombreDe(cuerpo.tipo),
          estadoNombre: ESTADOS_PUBLICACION.nombreDe('BORRADOR'),
          autorId: usuario.id,
          categoriaId: cuerpo.categoriaId ?? null,
          imagenPortadaId: cuerpo.imagenPortadaId ?? null,
          titulo: cuerpo.titulo,
          slug,
          resumen: cuerpo.resumen ?? null,
          contenido: cuerpo.contenido,
          urlExterna: cuerpo.urlExterna ?? null,
          destacada: cuerpo.destacada,
          fechaPublicacion: cuerpo.fechaPublicacion ?? null,
          fechaExpiracion: cuerpo.fechaExpiracion ?? null,
        },
        db,
      ),
    );

    await registrarCambio(db, contexto, {
      entidad: ENTIDAD,
      entidadId: fila.id,
      accion: 'INSERT',
      nuevo: fila,
    });
    return fila.id;
  });

  return obtenerPublicacion(usuario, id);
}

// Campo del cuerpo -> columna de la tabla.
const COLUMNAS = {
  titulo: 'titulo',
  resumen: 'resumen',
  categoriaId: 'categoria_id',
  imagenPortadaId: 'imagen_portada_id',
  contenido: 'contenido',
  urlExterna: 'url_externa',
  destacada: 'destacada',
  fechaPublicacion: 'fecha_publicacion',
  fechaExpiracion: 'fecha_expiracion',
};

// Con las fechas que quedarían guardadas, la expiración debe ser posterior a la publicación.
function exigirFechasEnOrden(fila, cambios) {
  const fechaPublicacion =
    cambios.fechaPublicacion !== undefined ? cambios.fechaPublicacion : fila.fecha_publicacion;
  const fechaExpiracion =
    cambios.fechaExpiracion !== undefined ? cambios.fechaExpiracion : fila.fecha_expiracion;

  if (
    fechaPublicacion &&
    fechaExpiracion &&
    new Date(fechaExpiracion) <= new Date(fechaPublicacion)
  ) {
    throw ErrorApp.validacion(undefined, [
      { campo: 'fechaExpiracion', mensaje: 'Debe ser posterior a la fecha de publicación.' },
    ]);
  }
}

// PATCH /api/admin/publicaciones/:id. Solo cambian los campos enviados.
export async function editarPublicacion(usuario, id, cambios, contexto) {
  await transaccion(async (db) => {
    const { fila, situacion } = await publicacionParaModificar(usuario, id, db);
    exigirAccion('EDITAR', situacion, usuario);

    const columnas = {};
    for (const [campo, columna] of Object.entries(COLUMNAS)) {
      if (cambios[campo] !== undefined) columnas[columna] = cambios[campo];
    }

    // slug: null lo vuelve a generar desde el título (el nuevo, si también cambia).
    if (cambios.slug !== undefined) {
      const slug =
        cambios.slug === fila.slug
          ? fila.slug
          : await elegirSlug(db, {
              sedeId: fila.sede_id,
              slugPedido: cambios.slug,
              titulo: cambios.titulo ?? fila.titulo,
              excluirId: id,
            });
      if (slug !== fila.slug && situacion.estado === 'PUBLICADO') {
        throw ErrorApp.conflicto(
          'El slug de una publicación publicada no se puede cambiar: rompería los enlaces compartidos.',
          [{ campo: 'slug', mensaje: 'No se puede cambiar en una publicación publicada.' }],
        );
      }
      columnas.slug = slug;
    }

    await verificarReferencias(db, fila.sede_id, cambios);
    exigirFechasEnOrden(fila, cambios);

    const nuevo = await conSlugUnico(columnas.slug, () =>
      actualizarFila(db, ENTIDAD, id, columnas, { jsonb: ['contenido'] }),
    );
    await registrarCambio(db, contexto, {
      entidad: ENTIDAD,
      entidadId: id,
      accion: 'UPDATE',
      anterior: fila,
      nuevo,
    });
  });

  return obtenerPublicacion(usuario, id);
}

// DELETE /api/admin/publicaciones/:id. Solo en BORRADOR o ARCHIVADO.
export async function eliminarPublicacion(usuario, id, contexto) {
  await transaccion(async (db) => {
    const { situacion } = await publicacionParaModificar(usuario, id, db);
    exigirAccion('ELIMINAR', situacion, usuario);

    const borrada = await eliminarFila(db, ENTIDAD, id);
    await registrarCambio(db, contexto, {
      entidad: ENTIDAD,
      entidadId: id,
      accion: 'DELETE',
      anterior: borrada,
    });
  });
}
