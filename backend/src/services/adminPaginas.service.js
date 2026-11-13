// Páginas y bloques en el panel (contrato: docs/api/admin.md, sección 12; docs/api/contenido.md).
// Las páginas se publican directamente (BORRADOR, PUBLICADO o ARCHIVADO). El contenido de cada
// bloque se valida con Ajv contra el esquema de su tipo. Toda modificación va en una transacción
// con su bitácora.
//
// Bitácora: la página es la entidad "pagina" y cada bloque la entidad "bloque". A los datos de un
// bloque se les agrega sede_id (la tabla bloque no lo tiene) para que el Párroco vea los cambios
// de su sede aunque el bloque ya no exista. Cambiar un bloque actualiza también la página
// (actualizado_por y fecha_actualizacion), y eso queda registrado como un UPDATE de la página.
import { ESTADOS_PUBLICACION } from '../constantes/catalogos.js';
import { transaccion } from '../db/index.js';
import { ErrorApp } from '../errores/ErrorApp.js';
import {
  actualizarFila,
  eliminarFila,
  filaParaModificar,
  slugsOcupados,
} from '../models/comunes.model.js';
import * as modelo from '../models/adminPaginas.model.js';
import { exigirSedeDelRecurso } from '../utils/alcanceSede.js';
import { formatearFechaHora } from '../utils/formato.js';
import { slugDesde, slugLibre } from '../utils/slugs.js';
import { archivosDelBloque, validarContenidoDeBloque } from '../validacion/bloques.js';
import { registrarCambio } from './bitacora.service.js';
import { sedeDelRecursoNuevo, verificarArchivos } from './referencias.service.js';

const ENTIDAD = 'pagina';
const ENTIDAD_BLOQUE = 'bloque';
const LARGO_SLUG = 120;
// El portal depende de estas páginas (docs/api/admin.md, sección 12).
const PAGINAS_DEL_PORTAL = ['inicio', 'nosotros'];
const MENSAJE_BLOQUE_INVALIDO = 'El contenido del bloque no es válido.';

// ---- Respuesta ----

function aBloque(bloque) {
  return {
    id: bloque.id,
    tipo: bloque.tipo,
    orden: bloque.orden,
    visible: bloque.visible,
    contenido: bloque.contenido,
    fechaActualizacion: formatearFechaHora(bloque.fechaActualizacion),
  };
}

const aUsuario = (id, nombre) => (id === null ? null : { id, nombreCompleto: nombre });

// Objeto página del panel; "bloques" solo en el detalle.
function aPagina(fila, { conBloques = false } = {}) {
  const pagina = {
    id: fila.id,
    sede: { id: fila.sede_id, nombre: fila.sede_nombre, slug: fila.sede_slug },
    estado: ESTADOS_PUBLICACION.aEnumeracion(fila.estado_nombre),
    slug: fila.slug,
    titulo: fila.titulo,
    descripcionSeo: fila.descripcion_seo,
    paginaPadre: fila.pagina_padre,
    mostrarEnMenu: fila.mostrar_en_menu,
    ordenMenu: fila.orden_menu,
    creadoPor: aUsuario(fila.creado_por, fila.creado_por_nombre),
    actualizadoPor: aUsuario(fila.actualizado_por, fila.actualizado_por_nombre),
    fechaCreacion: formatearFechaHora(fila.fecha_creacion),
    fechaActualizacion: formatearFechaHora(fila.fecha_actualizacion),
  };
  if (conBloques) pagina.bloques = fila.bloques.map(aBloque);
  return pagina;
}

// ---- Lectura ----

export async function listarPaginas(sedeFiltro, { estado }) {
  const filas = await modelo.listar({
    sedeSlug: sedeFiltro,
    estados: estado?.map((codigo) => ESTADOS_PUBLICACION.nombreDe(codigo)),
  });
  return filas.map((fila) => aPagina(fila));
}

export async function obtenerPagina(usuario, id) {
  const fila = await modelo.buscarPorId(id);
  if (!fila) throw ErrorApp.noEncontrado('La página no existe.');
  exigirSedeDelRecurso(usuario, fila.sede_id);
  return aPagina(fila, { conBloques: true });
}

// ---- Apoyo ----

const errorSlugOcupado = (slug) =>
  ErrorApp.conflicto(`Ya existe una página con el slug «${slug}» en esta sede.`, [
    { campo: 'slug', mensaje: 'Ya está en uso en esta sede.' },
  ]);

// Slug pedido (si ya existe en la sede, 409) o generado desde el título (con sufijo si choca).
async function elegirSlug(db, { sedeId, slugPedido, titulo, excluirId = null }) {
  const base = slugPedido ?? slugDesde(titulo, { largoMaximo: LARGO_SLUG, respaldo: 'pagina' });
  const ocupados = await slugsOcupados(ENTIDAD, { sedeId, base, excluirId }, db);

  if (slugPedido) {
    if (ocupados.includes(slugPedido)) throw errorSlugOcupado(slugPedido);
    return slugPedido;
  }
  return slugLibre(base, ocupados, { largoMaximo: LARGO_SLUG });
}

// Un slug repetido que se coló entre la comprobación y la escritura (dos peticiones a la vez).
async function conSlugUnico(slug, operacion) {
  try {
    return await operacion();
  } catch (error) {
    if (error.code === '23505' && error.constraint === 'pagina_ak_1') throw errorSlugOcupado(slug);
    throw error;
  }
}

// Niveles máximos del árbol de páginas: una raíz y hasta dos niveles de hijas (el menú del portal
// no se puede navegar con más). Contrato: docs/api/admin.md, sección 12.
export const PROFUNDIDAD_MAXIMA_PAGINAS = 3;

// La página padre debe ser de la misma sede, y al editar no puede ser la propia página ni una de
// sus descendientes (formaría un ciclo). Además, el árbol no puede pasar de PROFUNDIDAD_MAXIMA_PAGINAS
// niveles, contando la página con todas sus descendientes cuando se la mueve.
async function verificarPaginaPadre(db, sedeId, paginaPadreId, paginaId = null) {
  if (paginaPadreId === undefined || paginaPadreId === null) return;

  const detalle = (mensaje) =>
    ErrorApp.validacion(undefined, [{ campo: 'paginaPadreId', mensaje }]);
  if (!(await modelo.paginaDeLaSede(paginaPadreId, sedeId, db))) {
    throw detalle('La página padre no existe en esta sede.');
  }
  if (paginaId !== null && (await modelo.idsDeLaRama(paginaId, db)).includes(paginaPadreId)) {
    throw detalle('No puede ser la propia página ni una de sus páginas hijas.');
  }

  const nivelDelPadre = await modelo.nivelDe(paginaPadreId, db);
  const niveles = paginaId === null ? 1 : await modelo.alturaDeLaRama(paginaId, db);
  if (nivelDelPadre + niveles > PROFUNDIDAD_MAXIMA_PAGINAS) {
    throw detalle(`Las páginas se pueden anidar hasta ${PROFUNDIDAD_MAXIMA_PAGINAS} niveles.`);
  }
}

// ---- Páginas ----

export async function crearPagina(usuario, cuerpo, contexto) {
  const id = await transaccion(async (db) => {
    const sedeId = await sedeDelRecursoNuevo(usuario, cuerpo.sedeId, db);
    await verificarPaginaPadre(db, sedeId, cuerpo.paginaPadreId);
    const slug = await elegirSlug(db, { sedeId, slugPedido: cuerpo.slug, titulo: cuerpo.titulo });

    const fila = await conSlugUnico(slug, () =>
      modelo.insertar(
        {
          sedeId,
          paginaPadreId: cuerpo.paginaPadreId ?? null,
          estadoNombre: ESTADOS_PUBLICACION.nombreDe(cuerpo.estado),
          creadoPor: usuario.id,
          slug,
          titulo: cuerpo.titulo,
          descripcionSeo: cuerpo.descripcionSeo ?? null,
          mostrarEnMenu: cuerpo.mostrarEnMenu,
          ordenMenu: cuerpo.ordenMenu,
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
  return obtenerPagina(usuario, id);
}

const COLUMNAS = {
  titulo: 'titulo',
  descripcionSeo: 'descripcion_seo',
  paginaPadreId: 'pagina_padre_id',
  mostrarEnMenu: 'mostrar_en_menu',
  ordenMenu: 'orden_menu',
};

export async function editarPagina(usuario, id, cambios, contexto) {
  await transaccion(async (db) => {
    const fila = await filaParaModificar(db, ENTIDAD, id);
    if (!fila) throw ErrorApp.noEncontrado('La página no existe.');
    exigirSedeDelRecurso(usuario, fila.sede_id);

    await verificarPaginaPadre(db, fila.sede_id, cambios.paginaPadreId, id);

    const columnas = {};
    for (const [campo, columna] of Object.entries(COLUMNAS)) {
      if (cambios[campo] !== undefined) columnas[columna] = cambios[campo];
    }
    if (cambios.estado !== undefined) {
      columnas.estado_publicacion_id = await modelo.idDeEstado(
        ESTADOS_PUBLICACION.nombreDe(cambios.estado),
        db,
      );
    }

    // slug: null lo vuelve a generar desde el título (el nuevo, si también cambia).
    if (cambios.slug !== undefined && cambios.slug !== fila.slug) {
      const slug = await elegirSlug(db, {
        sedeId: fila.sede_id,
        slugPedido: cambios.slug,
        titulo: cambios.titulo ?? fila.titulo,
        excluirId: id,
      });
      if (slug !== fila.slug) {
        if (PAGINAS_DEL_PORTAL.includes(fila.slug)) {
          throw ErrorApp.conflicto(
            `El slug de la página «${fila.slug}» no se puede cambiar: el portal depende de ella.`,
            [{ campo: 'slug', mensaje: 'No se puede cambiar en esta página.' }],
          );
        }
        columnas.slug = slug;
      }
    }

    columnas.actualizado_por = usuario.id;
    columnas.fecha_actualizacion = new Date();
    const nuevo = await conSlugUnico(columnas.slug, () =>
      actualizarFila(db, ENTIDAD, id, columnas),
    );
    await registrarCambio(db, contexto, {
      entidad: ENTIDAD,
      entidadId: id,
      accion: 'UPDATE',
      anterior: fila,
      nuevo,
    });
  });
  return obtenerPagina(usuario, id);
}

// Elimina la página y sus bloques. 409 si tiene páginas hijas o si es "inicio" o "nosotros".
export async function eliminarPagina(usuario, id, contexto) {
  await transaccion(async (db) => {
    const fila = await filaParaModificar(db, ENTIDAD, id);
    if (!fila) throw ErrorApp.noEncontrado('La página no existe.');
    exigirSedeDelRecurso(usuario, fila.sede_id);

    if (PAGINAS_DEL_PORTAL.includes(fila.slug)) {
      throw ErrorApp.conflicto(
        `La página «${fila.slug}» no se puede eliminar: el portal depende de ella.`,
      );
    }
    if ((await modelo.contarHijas(id, db)) > 0) {
      throw ErrorApp.conflicto(
        'La página tiene páginas hijas: elimínalas o cámbiales la página padre primero.',
      );
    }

    const bloques = await modelo.filasDeBloques(id, db);
    await modelo.eliminarBloques(id, db);
    for (const bloque of bloques) {
      await registrarCambio(db, contexto, {
        entidad: ENTIDAD_BLOQUE,
        entidadId: bloque.id,
        accion: 'DELETE',
        anterior: { ...bloque, sede_id: fila.sede_id },
      });
    }

    const borrada = await modelo.eliminarPagina(id, db);
    await registrarCambio(db, contexto, {
      entidad: ENTIDAD,
      entidadId: id,
      accion: 'DELETE',
      anterior: borrada,
    });
  });
}

// ---- Bloques ----

// Página bloqueada para cambiar sus bloques: 404 si no existe, 403 si es de otra sede.
async function paginaParaCambiarBloques(usuario, paginaId, db) {
  const fila = await filaParaModificar(db, ENTIDAD, paginaId);
  if (!fila) throw ErrorApp.noEncontrado('La página no existe.');
  exigirSedeDelRecurso(usuario, fila.sede_id);
  return fila;
}

// Cambiar un bloque cuenta como cambiar la página: queda su autor y su fecha.
async function tocarPagina(db, usuario, pagina, contexto) {
  const nuevo = await actualizarFila(db, ENTIDAD, pagina.id, {
    actualizado_por: usuario.id,
    fecha_actualizacion: new Date(),
  });
  await registrarCambio(db, contexto, {
    entidad: ENTIDAD,
    entidadId: pagina.id,
    accion: 'UPDATE',
    anterior: pagina,
    nuevo,
  });
}

// Valida el contenido del bloque (Ajv + reglas de la API) y que sus imágenes y videos sean de la
// biblioteca de la sede. Lanza 400 con un detalle por error, con la ruta en "contenido.…".
async function validarBloque(db, sedeId, tipo, contenido) {
  const detalles = validarContenidoDeBloque(tipo.codigo, tipo.esquema_validacion, contenido);
  if (detalles.length === 0) {
    const archivos = await verificarArchivos(sedeId, archivosDelBloque(tipo.codigo, contenido), db);
    detalles.push(...archivos.detalles);
  }
  if (detalles.length > 0) throw ErrorApp.validacion(MENSAJE_BLOQUE_INVALIDO, detalles);
}

const conSede = (bloque, sedeId) => ({ ...bloque, sede_id: sedeId });

// Bloque ya guardado, tal como lo ve el panel.
async function bloqueGuardado(paginaId, bloqueId) {
  const pagina = await modelo.buscarPorId(paginaId);
  return aBloque(pagina.bloques.find((bloque) => bloque.id === bloqueId));
}

// POST /api/admin/paginas/:id/bloques: agrega el bloque al final.
export async function agregarBloque(usuario, paginaId, cuerpo, contexto) {
  const bloqueId = await transaccion(async (db) => {
    const pagina = await paginaParaCambiarBloques(usuario, paginaId, db);

    const tipo = await modelo.tipoBloquePorCodigo(cuerpo.tipo, db);
    if (!tipo) {
      throw ErrorApp.validacion(undefined, [
        { campo: 'tipo', mensaje: `El tipo de bloque «${cuerpo.tipo}» no existe.` },
      ]);
    }
    await validarBloque(db, pagina.sede_id, tipo, cuerpo.contenido);

    const fila = await modelo.insertarBloque(
      {
        paginaId,
        tipoBloqueId: tipo.id,
        contenido: cuerpo.contenido,
        visible: cuerpo.visible,
      },
      db,
    );
    await registrarCambio(db, contexto, {
      entidad: ENTIDAD_BLOQUE,
      entidadId: fila.id,
      accion: 'INSERT',
      nuevo: conSede(fila, pagina.sede_id),
    });
    await tocarPagina(db, usuario, pagina, contexto);
    return fila.id;
  });
  return bloqueGuardado(paginaId, bloqueId);
}

// PATCH /api/admin/paginas/:id/bloques/:bloqueId: cambia el contenido (completo, no se fusiona)
// o la visibilidad. El tipo no cambia.
export async function editarBloque(usuario, paginaId, bloqueId, cambios, contexto) {
  await transaccion(async (db) => {
    const pagina = await paginaParaCambiarBloques(usuario, paginaId, db);
    const {
      tipo_codigo: codigo,
      esquema_validacion: esquema,
      ...fila
    } = (await modelo.bloqueDeLaPagina(paginaId, bloqueId, db)) ?? {};
    if (fila.id === undefined) throw ErrorApp.noEncontrado('El bloque no existe en esta página.');

    if (cambios.contenido !== undefined) {
      await validarBloque(
        db,
        pagina.sede_id,
        { codigo, esquema_validacion: esquema },
        cambios.contenido,
      );
    }

    const columnas = { fecha_actualizacion: new Date() };
    if (cambios.contenido !== undefined) columnas.contenido = cambios.contenido;
    if (cambios.visible !== undefined) columnas.visible = cambios.visible;

    const nuevo = await actualizarFila(db, ENTIDAD_BLOQUE, bloqueId, columnas, {
      jsonb: ['contenido'],
    });
    await registrarCambio(db, contexto, {
      entidad: ENTIDAD_BLOQUE,
      entidadId: bloqueId,
      accion: 'UPDATE',
      anterior: conSede(fila, pagina.sede_id),
      nuevo: conSede(nuevo, pagina.sede_id),
    });
    await tocarPagina(db, usuario, pagina, contexto);
  });
  return bloqueGuardado(paginaId, bloqueId);
}

// DELETE /api/admin/paginas/:id/bloques/:bloqueId. Los bloques que quedan conservan su orden
// relativo (puede haber huecos en "orden").
export async function eliminarBloque(usuario, paginaId, bloqueId, contexto) {
  await transaccion(async (db) => {
    const pagina = await paginaParaCambiarBloques(usuario, paginaId, db);
    const fila = await modelo.bloqueDeLaPagina(paginaId, bloqueId, db);
    if (!fila) throw ErrorApp.noEncontrado('El bloque no existe en esta página.');

    const { tipo_codigo: _codigo, esquema_validacion: _esquema, ...datos } = fila;
    const borrado = await eliminarFila(db, ENTIDAD_BLOQUE, bloqueId);
    await registrarCambio(db, contexto, {
      entidad: ENTIDAD_BLOQUE,
      entidadId: bloqueId,
      accion: 'DELETE',
      anterior: conSede(borrado ?? datos, pagina.sede_id),
    });
    await tocarPagina(db, usuario, pagina, contexto);
  });
}

// POST /api/admin/paginas/:id/bloques/reordenar: recibe TODOS los ids de los bloques de la
// página, en el nuevo orden (1, 2, 3…). Responde con la lista de bloques ordenada.
export async function reordenarBloques(usuario, paginaId, { ids }, contexto) {
  await transaccion(async (db) => {
    const pagina = await paginaParaCambiarBloques(usuario, paginaId, db);
    const bloques = await modelo.filasDeBloques(paginaId, db);

    const actuales = new Set(bloques.map((bloque) => bloque.id));
    const completa = ids.length === actuales.size && new Set(ids).size === ids.length;
    if (!completa || !ids.every((id) => actuales.has(id))) {
      throw ErrorApp.validacion(undefined, [
        {
          campo: 'ids',
          mensaje: 'Debe incluir todos los bloques de la página, una vez cada uno, y ninguno más.',
        },
      ]);
    }

    const porId = new Map(bloques.map((bloque) => [bloque.id, bloque]));
    let hubo = false;
    for (const [indice, bloqueId] of ids.entries()) {
      const anterior = porId.get(bloqueId);
      const orden = indice + 1;
      if (anterior.orden === orden) continue;

      hubo = true;
      const nuevo = await actualizarFila(db, ENTIDAD_BLOQUE, bloqueId, { orden });
      await registrarCambio(db, contexto, {
        entidad: ENTIDAD_BLOQUE,
        entidadId: bloqueId,
        accion: 'UPDATE',
        anterior: conSede(anterior, pagina.sede_id),
        nuevo: conSede(nuevo, pagina.sede_id),
      });
    }
    if (hubo) await tocarPagina(db, usuario, pagina, contexto);
  });

  return (await modelo.buscarPorId(paginaId)).bloques.map(aBloque);
}
