// Gestión de horarios en el panel CMS (contrato: docs/api/admin.md, sección 5).
import { transaccion } from '../db/index.js';
import { ErrorApp } from '../errores/ErrorApp.js';
import * as modelo from '../models/horarios.model.js';
import { exigirSedeDelRecurso, sedeParaCrear } from '../utils/alcanceSede.js';
import { formatearHora } from '../utils/formato.js';
import { registrarCambio } from './bitacora.service.js';

function aHorarioAdmin(fila) {
  return {
    id: fila.id,
    sede: { id: fila.sede_id, nombre: fila.sede_nombre, slug: fila.sede_slug },
    tipo: { id: fila.tipo_id, nombre: fila.tipo_nombre },
    diaSemana: fila.dia_semana,
    horaInicio: formatearHora(fila.hora_inicio),
    horaFin: formatearHora(fila.hora_fin),
    descripcion: fila.descripcion,
    activo: fila.activo,
  };
}

async function horarioDelUsuario(usuario, id) {
  const fila = await modelo.buscarPorId(id);
  if (!fila) throw ErrorApp.noEncontrado('El horario no existe.');
  exigirSedeDelRecurso(usuario, fila.sede_id);
  return fila;
}

export async function listarHorarios(sedeFiltro, consulta) {
  const filas = await modelo.listarAdmin({
    sedeSlug: sedeFiltro,
    tipoIds: consulta.tipo,
    activo: consulta.activo,
  });
  return filas.map(aHorarioAdmin);
}

export async function obtenerHorario(usuario, id) {
  return aHorarioAdmin(await horarioDelUsuario(usuario, id));
}

export async function crearHorario(usuario, datos, contexto) {
  const sedeId = sedeParaCrear(usuario, datos.sedeId ?? usuario.sedeId ?? undefined);
  if (sedeId === undefined || sedeId === null) {
    throw ErrorApp.validacion(undefined, [
      { campo: 'sedeId', mensaje: 'Indica la sede del horario.' },
    ]);
  }

  const [sedeValida, tipoValido] = await Promise.all([
    modelo.existeSede(sedeId),
    modelo.existeTipoHorario(datos.tipoHorarioId),
  ]);

  const detalles = [];
  if (!sedeValida) detalles.push({ campo: 'sedeId', mensaje: 'La sede indicada no existe.' });
  if (!tipoValido) {
    detalles.push({ campo: 'tipoHorarioId', mensaje: 'El tipo de horario indicado no existe.' });
  }
  if (detalles.length > 0) throw ErrorApp.validacion(undefined, detalles);

  const idCreado = await transaccion(async (db) => {
    const fila = await modelo.crear(
      {
        sedeId,
        tipoHorarioId: datos.tipoHorarioId,
        diaSemana: datos.diaSemana,
        horaInicio: datos.horaInicio,
        horaFin: datos.horaFin,
        descripcion: datos.descripcion,
        activo: datos.activo,
      },
      db,
    );
    await registrarCambio(db, contexto, {
      entidad: 'horario',
      entidadId: fila.id,
      accion: 'INSERT',
      nuevo: fila,
    });
    return fila.id;
  });

  return aHorarioAdmin(await modelo.buscarPorId(idCreado));
}

export async function actualizarHorario(usuario, id, datos, contexto) {
  await horarioDelUsuario(usuario, id);

  if (datos.tipoHorarioId !== undefined && !(await modelo.existeTipoHorario(datos.tipoHorarioId))) {
    throw ErrorApp.validacion(undefined, [
      { campo: 'tipoHorarioId', mensaje: 'El tipo de horario indicado no existe.' },
    ]);
  }

  await transaccion(async (db) => {
    const anterior = await modelo.filaParaModificar(id, db);
    if (!anterior) throw ErrorApp.noEncontrado('El horario no existe.');

    const horaInicioFinal = datos.horaInicio ?? formatearHora(anterior.hora_inicio);
    const horaFinFinal =
      datos.horaFin !== undefined ? datos.horaFin : formatearHora(anterior.hora_fin);

    if (horaFinFinal !== null && horaFinFinal <= horaInicioFinal) {
      throw ErrorApp.validacion(undefined, [
        { campo: 'horaFin', mensaje: 'La hora de fin debe ser posterior a la hora de inicio.' },
      ]);
    }

    const nuevo = await modelo.actualizar(id, datos, db);
    await registrarCambio(db, contexto, {
      entidad: 'horario',
      entidadId: id,
      accion: 'UPDATE',
      anterior,
      nuevo,
    });
  });

  return aHorarioAdmin(await modelo.buscarPorId(id));
}

export async function eliminarHorario(usuario, id, contexto) {
  await horarioDelUsuario(usuario, id);

  await transaccion(async (db) => {
    const borrado = await modelo.eliminar(id, db);
    if (!borrado) throw ErrorApp.noEncontrado('El horario no existe.');

    await registrarCambio(db, contexto, {
      entidad: 'horario',
      entidadId: id,
      accion: 'DELETE',
      anterior: borrado,
    });
  });
}
