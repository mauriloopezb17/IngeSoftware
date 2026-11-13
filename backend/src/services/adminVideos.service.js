// Gestión de videos de YouTube en el panel CMS (docs/api/admin.md, sección 8).
import { transaccion } from '../db/index.js';
import { ErrorApp } from '../errores/ErrorApp.js';
import * as modelo from '../models/videos.model.js';
import { reordenarPorSede } from '../utils/adminContenido.js';
import { exigirSedeDelRecurso, sedeParaCrear } from '../utils/alcanceSede.js';
import { formatearFecha } from '../utils/formato.js';
import { registrarCambio } from './bitacora.service.js';
import { urlsYoutube } from './videos.service.js';

function aVideoAdmin(fila) {
  return {
    id: fila.id,
    sede: { id: fila.sede_id, nombre: fila.sede_nombre, slug: fila.sede_slug },
    titulo: fila.titulo,
    descripcion: fila.descripcion,
    youtubeVideoId: fila.youtube_video_id,
    ...urlsYoutube(fila.youtube_video_id),
    duracionSegundos: fila.duracion_segundos,
    destacado: fila.destacado,
    orden: fila.orden,
    fechaPublicacion: formatearFecha(fila.fecha_publicacion),
  };
}

async function videoDelUsuario(usuario, id) {
  const fila = await modelo.buscarPorId(id);
  if (!fila) throw ErrorApp.noEncontrado('El video no existe.');
  exigirSedeDelRecurso(usuario, fila.sede_id);
  return fila;
}

function traducirErrorYoutubeUnico(err) {
  if (err?.code === '23505') {
    throw ErrorApp.conflicto('Ya existe un video registrado con ese identificador de YouTube.');
  }
  throw err;
}

export async function listarVideos(sedeFiltro, consulta) {
  const filas = await modelo.listarAdmin({
    sedeSlug: sedeFiltro,
    destacado: consulta.destacado,
  });
  return filas.map(aVideoAdmin);
}

export async function obtenerVideo(usuario, id) {
  return aVideoAdmin(await videoDelUsuario(usuario, id));
}

export async function crearVideo(usuario, datos, contexto) {
  const sedeId = sedeParaCrear(usuario, datos.sedeId ?? usuario.sedeId ?? undefined);
  if (sedeId === undefined || sedeId === null) {
    throw ErrorApp.validacion(undefined, [
      { campo: 'sedeId', mensaje: 'Indica la sede del video.' },
    ]);
  }
  if (!(await modelo.existeSede(sedeId))) {
    throw ErrorApp.validacion(undefined, [
      { campo: 'sedeId', mensaje: 'La sede indicada no existe.' },
    ]);
  }

  let idCreado;
  try {
    idCreado = await transaccion(async (db) => {
      const fila = await modelo.crear(
        {
          sedeId,
          youtubeVideoId: datos.youtube,
          titulo: datos.titulo,
          descripcion: datos.descripcion,
          duracionSegundos: datos.duracionSegundos,
          destacado: datos.destacado,
          fechaPublicacion: datos.fechaPublicacion,
        },
        db,
      );
      await registrarCambio(db, contexto, {
        entidad: 'video',
        entidadId: fila.id,
        accion: 'INSERT',
        nuevo: fila,
      });
      return fila.id;
    });
  } catch (err) {
    traducirErrorYoutubeUnico(err);
  }

  return aVideoAdmin(await modelo.buscarPorId(idCreado));
}

export async function actualizarVideo(usuario, id, datos, contexto) {
  await videoDelUsuario(usuario, id);

  const cambios = {
    youtubeVideoId: datos.youtube,
    titulo: datos.titulo,
    descripcion: datos.descripcion,
    duracionSegundos: datos.duracionSegundos,
    destacado: datos.destacado,
    fechaPublicacion: datos.fechaPublicacion,
  };

  try {
    await transaccion(async (db) => {
      const anterior = await modelo.filaParaModificar(id, db);
      if (!anterior) throw ErrorApp.noEncontrado('El video no existe.');

      const nuevo = await modelo.actualizar(id, cambios, db);
      await registrarCambio(db, contexto, {
        entidad: 'video',
        entidadId: id,
        accion: 'UPDATE',
        anterior,
        nuevo,
      });
    });
  } catch (err) {
    traducirErrorYoutubeUnico(err);
  }

  return aVideoAdmin(await modelo.buscarPorId(id));
}

export async function eliminarVideo(usuario, id, contexto) {
  await videoDelUsuario(usuario, id);

  await transaccion(async (db) => {
    const borrado = await modelo.eliminar(id, db);
    if (!borrado) throw ErrorApp.noEncontrado('El video no existe.');

    await registrarCambio(db, contexto, {
      entidad: 'video',
      entidadId: id,
      accion: 'DELETE',
      anterior: borrado,
    });
  });
}

export async function reordenarVideos(usuario, ids, contexto) {
  const sedeId = await reordenarPorSede({
    tabla: 'video',
    entidad: 'video',
    usuario,
    ids,
    contexto,
    baseOrden: 1,
  });
  const filas = await modelo.listarAdmin({ sedeId });
  return filas.map(aVideoAdmin);
}
