// Observaciones confidenciales sobre proclamas matrimoniales (solo visibles para el párroco).
// Datos personales (nombre, correo, teléfono, mensaje) nunca se registran en logs ni en bitácora.
import { transaccion } from '../db/index.js';
import { ErrorApp } from '../errores/ErrorApp.js';
import * as modelo from '../models/observacionesProclama.model.js';
import * as proclamasModel from '../models/proclamas.model.js';
import { formatearFechaHora } from '../utils/formato.js';
import { armarPaginacion, desplazamiento } from '../utils/paginacion.js';
import { registrarCambio } from './bitacora.service.js';

function aObservacion(fila) {
  return {
    id: fila.id,
    proclama: {
      id: fila.proclama_id,
      contrayente1: fila.nombre_contrayente_1,
      contrayente2: fila.nombre_contrayente_2,
    },
    nombreCompleto: fila.nombre_completo,
    correo: fila.correo,
    telefono: fila.telefono,
    mensaje: fila.mensaje,
    fechaEnvio: formatearFechaHora(fila.fecha_envio),
    leida: fila.leido_en !== null,
    leidoEn: formatearFechaHora(fila.leido_en),
  };
}

// POST /api/sedes/:sede/proclamas/:id/observaciones
export async function crearObservacionPublica(sedeId, proclamaId, cuerpo) {
  // Honeypot: responde 201 igual sin guardar nada.
  if (cuerpo.sitioWeb && cuerpo.sitioWeb.trim() !== '') {
    return { recibido: true };
  }

  const proclama = await proclamasModel.buscarDetallePorId(sedeId, proclamaId);
  if (!proclama) throw ErrorApp.noEncontrado('La proclama no existe.');

  if (new Date(proclama.fecha_matrimonio).getTime() <= Date.now()) {
    throw ErrorApp.conflicto('Esta proclama ya no recibe observaciones.');
  }

  await modelo.insertar({
    proclamaId,
    nombreCompleto: cuerpo.nombreCompleto,
    correo: cuerpo.correo ?? null,
    telefono: cuerpo.telefono ?? null,
    mensaje: cuerpo.mensaje,
  });

  return { recibido: true };
}

// GET /api/admin/proclamas/observaciones
export async function listarObservaciones(sedeId, consulta) {
  const { estado, proclamaId, pagina, porPagina } = consulta;
  const { filas, total } = await modelo.listar(
    { sedeId, estado, proclamaId },
    { limite: porPagina, desplazamiento: desplazamiento(pagina, porPagina) },
  );
  return {
    datos: filas.map(aObservacion),
    paginacion: armarPaginacion({ total, pagina, porPagina }),
  };
}

// GET /api/admin/proclamas/observaciones/resumen
export async function resumenObservaciones(sedeId) {
  return { noLeidas: await modelo.contarNoLeidas(sedeId) };
}

// PATCH /api/admin/proclamas/observaciones/:id
export async function marcarObservacion(usuario, id, { leida }) {
  const fila = await modelo.buscarPorId(id);
  if (!fila || (usuario.sedeId !== null && fila.sede_id !== usuario.sedeId)) {
    throw ErrorApp.noEncontrado('La observación no existe.');
  }

  const actualizada = await modelo.marcarLeida(id, usuario.id, leida);
  return aObservacion(actualizada);
}

// DELETE /api/admin/proclamas/observaciones/:id
export async function eliminarObservacion(usuario, id, contexto) {
  await transaccion(async (db) => {
    const fila = await modelo.buscarPorId(id, db);
    if (!fila || (usuario.sedeId !== null && fila.sede_id !== usuario.sedeId)) {
      throw ErrorApp.noEncontrado('La observación no existe.');
    }

    await modelo.eliminar(id, db);
    await registrarCambio(db, contexto, {
      entidad: 'observacion_proclama',
      entidadId: id,
      accion: 'DELETE',
      anterior: { id: fila.id, proclama_id: fila.proclama_id, sede_id: fila.sede_id },
    });
  });
}
