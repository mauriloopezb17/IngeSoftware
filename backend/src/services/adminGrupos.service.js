// Gestión de grupos pastorales en el panel CMS (docs/api/admin.md, sección 7).
import { transaccion } from '../db/index.js';
import { ErrorApp } from '../errores/ErrorApp.js';
import * as modelo from '../models/gruposPastorales.model.js';
import { reordenarPorSede, validarImagenDeSede } from '../utils/adminContenido.js';
import { exigirSedeDelRecurso, sedeParaCrear } from '../utils/alcanceSede.js';
import { imagen } from '../utils/formato.js';
import { registrarCambio } from './bitacora.service.js';

function aGrupoAdmin(fila) {
  return {
    id: fila.id,
    sede: { id: fila.sede_id, nombre: fila.sede_nombre, slug: fila.sede_slug },
    nombre: fila.nombre,
    descripcion: fila.descripcion,
    horarioReunion: fila.horario_reunion,
    contacto: fila.contacto,
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

export async function listarGrupos(sedeFiltro, consulta) {
  const filas = await modelo.listarAdmin({
    sedeSlug: sedeFiltro,
    visible: consulta.visible,
  });
  return filas.map(aGrupoAdmin);
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

  if (datos.imagenId !== null) {
    await validarImagenDeSede(datos.imagenId, sedeId, 'imagenId');
  }

  const idCreado = await transaccion(async (db) => {
    const fila = await modelo.crear(
      {
        sedeId,
        imagenId: datos.imagenId,
        nombre: datos.nombre,
        descripcion: datos.descripcion,
        horarioReunion: datos.horarioReunion,
        contacto: datos.contacto,
        icono: datos.icono,
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

  return aGrupoAdmin(await modelo.buscarPorId(idCreado));
}

export async function actualizarGrupo(usuario, id, datos, contexto) {
  const actual = await grupoDelUsuario(usuario, id);

  if (datos.imagenId !== undefined && datos.imagenId !== null) {
    await validarImagenDeSede(datos.imagenId, actual.sede_id, 'imagenId');
  }

  await transaccion(async (db) => {
    const anterior = await modelo.filaParaModificar(id, db);
    if (!anterior) throw ErrorApp.noEncontrado('El grupo pastoral no existe.');

    const nuevo = await modelo.actualizar(id, datos, db);
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
  const filas = await modelo.listarAdmin({ sedeId });
  return filas.map(aGrupoAdmin);
}
