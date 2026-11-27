// Gestión de grupos pastorales en el panel CMS (docs/api/admin.md, sección 7).
import { transaccion } from '../db/index.js';
import { ErrorApp } from '../errores/ErrorApp.js';
import * as modelo from '../models/gruposPastorales.model.js';
import { generarSlug, reordenarPorSede, validarImagenDeSede } from '../utils/adminContenido.js';
import { exigirSedeDelRecurso, sedeParaCrear } from '../utils/alcanceSede.js';
import { imagen } from '../utils/formato.js';
import { armarPaginacion, desplazamiento } from '../utils/paginacion.js';
import { archivosDelContenido, tieneContenido } from '../validacion/blocknote.js';
import { registrarCambio } from './bitacora.service.js';
import { verificarArchivos } from './referencias.service.js';

function aGrupoAdmin(fila) {
  return {
    id: fila.id,
    sede: { id: fila.sede_id, nombre: fila.sede_nombre, slug: fila.sede_slug },
    slug: fila.slug,
    nombre: fila.nombre,
    descripcion: fila.descripcion,
    horarioReunion: fila.horario_reunion,
    responsable: fila.responsable,
    whatsapp: fila.whatsapp,
    correo: fila.correo,
    icono: fila.icono,
    imagen: fila.imagen_id
      ? imagen({
          id: fila.imagen_id,
          url: fila.imagen_url,
          textoAlternativo: fila.imagen_texto_alternativo,
          ancho: fila.imagen_ancho,
          alto: fila.imagen_alto,
        })
      : null,
    detalle: fila.detalle ?? null,
    orden: fila.orden,
    visible: fila.visible,
  };
}

async function grupoDelUsuario(usuario, id) {
  const fila = await modelo.buscarPorId(id);
  if (!fila) throw ErrorApp.noEncontrado('El grupo pastoral no existe.');
  exigirSedeDelRecurso(usuario, fila.sede_id);
  return fila;
}

function normalizarDetalle(detalle) {
  if (detalle === undefined || detalle === null) return detalle;
  const contenido = tieneContenido(detalle.contenido) ? detalle.contenido : null;
  const galeria = detalle.galeria ?? [];
  const videoYoutubeId = detalle.videoYoutubeId ?? null;
  if (!contenido && galeria.length === 0 && !videoYoutubeId) return null;
  return { contenido, galeria, videoYoutubeId };
}

async function validarReferenciasDetalle(sedeId, { imagenId, detalle }, db) {
  const referencias = [];
  if (imagenId !== undefined && imagenId !== null) {
    referencias.push({ campo: 'imagenId', clase: 'IMAGEN', id: imagenId });
  }
  if (detalle?.galeria?.length) {
    detalle.galeria.forEach((archivoId, indice) => {
      referencias.push({
        campo: `detalle.galeria.${indice}`,
        clase: ['IMAGEN', 'VIDEO'],
        id: archivoId,
      });
    });
  }
  if (detalle?.contenido) {
    referencias.push(...archivosDelContenido(detalle.contenido, 'detalle.contenido'));
  }
  if (referencias.length === 0) return;

  const { detalles } = await verificarArchivos(sedeId, referencias, db);
  if (detalles.length > 0) throw ErrorApp.validacion(undefined, detalles);
}

async function resolverSlugAlCrear(sedeId, slugEnviado, nombre, db) {
  if (slugEnviado !== null && slugEnviado !== undefined) return slugEnviado;
  const base = generarSlug(nombre, 110) || 'grupo';
  const existentes = new Set(await modelo.slugsSimilares(sedeId, base, db));
  if (!existentes.has(base)) return base;
  let sufijo = 2;
  while (existentes.has(`${base}-${sufijo}`)) sufijo += 1;
  return `${base}-${sufijo}`;
}

function traducirErrorUnicoSlug(err, slugValor) {
  if (err?.code === '23505') {
    throw ErrorApp.conflicto(
      `Ya existe un grupo pastoral con el slug "${slugValor}" en esta sede.`,
      [{ campo: 'slug', mensaje: 'Ya está en uso en esta sede.' }],
    );
  }
  throw err;
}

export async function listarGrupos(sedeFiltro, consulta = {}, coordinadorUsuarioId = undefined) {
  const pagina = consulta.pagina ?? 1;
  const porPagina = consulta.porPagina ?? 10;
  const { filas, total } = await modelo.listarAdmin({
    sedeSlug: sedeFiltro,
    coordinadorUsuarioId,
    visible: consulta.visible,
    buscar: consulta.buscar,
    orden: consulta.orden,
    limite: porPagina,
    desplazamiento: desplazamiento(pagina, porPagina),
  });
  return {
    datos: filas.map(aGrupoAdmin),
    paginacion: armarPaginacion({ total, pagina, porPagina }),
  };
}

export async function obtenerGrupo(usuario, id) {
  return aGrupoAdmin(await grupoDelUsuario(usuario, id));
}

export async function crearGrupo(usuario, datos, contexto) {
  const sedeId = sedeParaCrear(usuario, datos.sedeId ?? usuario.sedeId ?? undefined);
  if (sedeId === undefined || sedeId === null) {
    throw ErrorApp.validacion(undefined, [
      { campo: 'sedeId', mensaje: 'Indica la sede del grupo pastoral.' },
    ]);
  }
  if (!(await modelo.existeSede(sedeId))) {
    throw ErrorApp.validacion(undefined, [
      { campo: 'sedeId', mensaje: 'La sede indicada no existe.' },
    ]);
  }

  const detalle = normalizarDetalle(datos.detalle) ?? null;
  if (datos.imagenId !== null && !detalle) {
    await validarImagenDeSede(datos.imagenId, sedeId, 'imagenId');
  }

  let idCreado;
  let slugFinal;
  try {
    idCreado = await transaccion(async (db) => {
      await validarReferenciasDetalle(sedeId, { imagenId: datos.imagenId, detalle }, db);
      slugFinal = await resolverSlugAlCrear(sedeId, datos.slug, datos.nombre, db);
      const fila = await modelo.crear(
        {
          sedeId,
          slug: slugFinal,
          imagenId: datos.imagenId,
          nombre: datos.nombre,
          descripcion: datos.descripcion,
          horarioReunion: datos.horarioReunion,
          responsable: datos.responsable,
          whatsapp: datos.whatsapp,
          correo: datos.correo,
          icono: datos.icono,
          detalle,
          visible: datos.visible,
        },
        db,
      );
      await registrarCambio(db, contexto, {
        entidad: 'grupo_pastoral',
        entidadId: fila.id,
        accion: 'INSERT',
        nuevo: fila,
      });
      return fila.id;
    });
  } catch (err) {
    traducirErrorUnicoSlug(err, slugFinal ?? datos.slug);
  }

  return aGrupoAdmin(await modelo.buscarPorId(idCreado));
}

export async function actualizarGrupo(usuario, id, datos, contexto) {
  const actual = await grupoDelUsuario(usuario, id);
  const cambios = { ...datos };
  if (cambios.detalle !== undefined) {
    cambios.detalle = normalizarDetalle(cambios.detalle);
  }
  if (cambios.slug === null) {
    delete cambios.slug;
  }

  try {
    await transaccion(async (db) => {
      const anterior = await modelo.filaParaModificar(id, db);
      if (!anterior) throw ErrorApp.noEncontrado('El grupo pastoral no existe.');

      await validarReferenciasDetalle(
        actual.sede_id,
        { imagenId: cambios.imagenId, detalle: cambios.detalle },
        db,
      );

      const nuevo = await modelo.actualizar(id, cambios, db);
      await registrarCambio(db, contexto, {
        entidad: 'grupo_pastoral',
        entidadId: id,
        accion: 'UPDATE',
        anterior,
        nuevo,
      });
    });
  } catch (err) {
    traducirErrorUnicoSlug(err, cambios.slug);
  }

  return aGrupoAdmin(await modelo.buscarPorId(id));
}

export async function actualizarDetalleGrupo(usuario, id, datos, contexto) {
  const actual = await grupoDelUsuario(usuario, id);
  const cambios = {
    ...(datos.descripcion !== undefined ? { descripcion: datos.descripcion } : {}),
    ...(datos.horarioReunion !== undefined ? { horarioReunion: datos.horarioReunion } : {}),
    ...(datos.responsable !== undefined ? { responsable: datos.responsable } : {}),
    ...(datos.whatsapp !== undefined ? { whatsapp: datos.whatsapp } : {}),
    ...(datos.correo !== undefined ? { correo: datos.correo } : {}),
    ...(datos.imagenId !== undefined ? { imagenId: datos.imagenId } : {}),
    ...(datos.detalle !== undefined ? { detalle: normalizarDetalle(datos.detalle) } : {}),
  };

  await transaccion(async (db) => {
    const anterior = await modelo.filaParaModificar(id, db);
    if (!anterior) throw ErrorApp.noEncontrado('El grupo pastoral no existe.');

    await validarReferenciasDetalle(
      actual.sede_id,
      { imagenId: cambios.imagenId, detalle: cambios.detalle },
      db,
    );

    const nuevo = await modelo.actualizar(id, cambios, db);
    await registrarCambio(db, contexto, {
      entidad: 'grupo_pastoral',
      entidadId: id,
      accion: 'UPDATE',
      anterior,
      nuevo,
    });
  });

  return aGrupoAdmin(await modelo.buscarPorId(id));
}

export async function eliminarGrupo(usuario, id, contexto) {
  await grupoDelUsuario(usuario, id);

  await transaccion(async (db) => {
    const borrado = await modelo.eliminar(id, db);
    if (!borrado) throw ErrorApp.noEncontrado('El grupo pastoral no existe.');

    await registrarCambio(db, contexto, {
      entidad: 'grupo_pastoral',
      entidadId: id,
      accion: 'DELETE',
      anterior: borrado,
    });
  });
}

export async function reordenarGrupos(usuario, ids, contexto) {
  const sedeId = await reordenarPorSede({
    tabla: 'grupo_pastoral',
    entidad: 'grupo_pastoral',
    usuario,
    ids,
    contexto,
    baseOrden: 1,
  });
  const { filas } = await modelo.listarAdmin({ sedeId });
  return filas.map(aGrupoAdmin);
}
