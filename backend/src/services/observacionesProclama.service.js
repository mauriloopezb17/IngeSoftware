// Observaciones confidenciales sobre proclamas matrimoniales (solo visibles para el párroco).
// Datos personales (nombre, correo, teléfono, mensaje) nunca se registran en logs ni en bitácora.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { obtenerEntorno } from '../config/entorno.js';
import { transaccion } from '../db/index.js';
import { ErrorApp } from '../errores/ErrorApp.js';
import * as modelo from '../models/observacionesProclama.model.js';
import * as proclamasModel from '../models/proclamas.model.js';
import { formatearFechaHora } from '../utils/formato.js';
import { armarPaginacion, desplazamiento } from '../utils/paginacion.js';
import { registrarCambio, registrarConsulta } from './bitacora.service.js';

const ESPERA_MINIMA_MS = 3000;
const VIGENCIA_TOKEN_MS = 2 * 60 * 60 * 1000;
const MENSAJE_VERIFICACION =
  'No pudimos verificar el envío. Vuelve a cargar la página e inténtalo de nuevo.';

function firmarDatosToken(datos) {
  return createHmac('sha256', obtenerEntorno().jwt.secreto).update(datos).digest('base64url');
}

export function emitirTokenObservacion(proclamaId, { ahora = Date.now() } = {}) {
  const datos = `${proclamaId}.${ahora}`;
  return `${datos}.${firmarDatosToken(datos)}`;
}

function errorVerificacion() {
  return ErrorApp.validacion('Los datos enviados no son válidos.', [
    { campo: 'verificacion', mensaje: MENSAJE_VERIFICACION },
  ]);
}

function verificarTokenObservacion(token, proclamaId, ahora = Date.now()) {
  if (typeof token !== 'string') throw errorVerificacion();
  const partes = token.split('.');
  if (partes.length !== 3) throw errorVerificacion();

  const [idTexto, emitidoTexto, firma] = partes;
  if (!/^\d+$/.test(idTexto) || !/^\d+$/.test(emitidoTexto) || !firma) {
    throw errorVerificacion();
  }

  const esperada = firmarDatosToken(`${idTexto}.${emitidoTexto}`);
  const firmaBuf = Buffer.from(firma, 'utf8');
  const esperadaBuf = Buffer.from(esperada, 'utf8');
  if (firmaBuf.length !== esperadaBuf.length || !timingSafeEqual(firmaBuf, esperadaBuf)) {
    throw errorVerificacion();
  }

  if (Number(idTexto) !== Number(proclamaId)) throw errorVerificacion();

  const emitidoEn = Number(emitidoTexto);
  const transcurrido = ahora - emitidoEn;
  if (
    !Number.isFinite(transcurrido) ||
    transcurrido < ESPERA_MINIMA_MS ||
    transcurrido > VIGENCIA_TOKEN_MS
  ) {
    throw errorVerificacion();
  }
}

function aObservacion(fila) {
  return {
    id: fila.id,
    proclama: {
      id: fila.proclama_id,
      contrayente1: fila.nombre_contrayente_1,
      contrayente2: fila.nombre_contrayente_2,
    },
    nombreCompleto: fila.nombre_completo ?? null,
    correo: fila.correo,
    telefono: fila.telefono,
    mensaje: fila.mensaje,
    fechaEnvio: formatearFechaHora(fila.fecha_envio),
    leida: fila.leido_en !== null,
    leidoEn: formatearFechaHora(fila.leido_en),
  };
}

// GET /api/sedes/:sede/proclamas/:id/observaciones/verificacion
export async function obtenerVerificacionObservacion(sedeId, proclamaId) {
  const proclama = await proclamasModel.buscarDetallePorId(sedeId, proclamaId);
  if (!proclama) throw ErrorApp.noEncontrado('La proclama no existe.');
  return { token: emitirTokenObservacion(proclamaId) };
}

// POST /api/sedes/:sede/proclamas/:id/observaciones
export async function crearObservacionPublica(sedeId, proclamaId, cuerpo) {
  // Honeypot: responde 201 igual sin guardar nada.
  if (cuerpo.sitioWeb && cuerpo.sitioWeb.trim() !== '') {
    return { recibido: true };
  }

  verificarTokenObservacion(cuerpo.verificacion, proclamaId);

  const proclama = await proclamasModel.buscarDetallePorId(sedeId, proclamaId);
  if (!proclama) throw ErrorApp.noEncontrado('La proclama no existe.');

  if (new Date(proclama.fecha_matrimonio).getTime() <= Date.now()) {
    throw ErrorApp.conflicto('Esta proclama ya no recibe observaciones.');
  }

  await modelo.insertar({
    proclamaId,
    nombreCompleto: cuerpo.nombreCompleto ?? null,
    correo: cuerpo.correo ?? null,
    telefono: cuerpo.telefono ?? null,
    mensaje: cuerpo.mensaje,
  });

  return { recibido: true };
}

function filtrosSinDatosPersonales(consulta) {
  const filtros = {};
  for (const clave of ['estado', 'proclamaId', 'orden', 'pagina', 'porPagina']) {
    if (consulta?.[clave] !== undefined && consulta[clave] !== null && consulta[clave] !== '') {
      filtros[clave] = consulta[clave];
    }
  }
  return filtros;
}

// GET /api/admin/proclamas/observaciones
export async function listarObservaciones(sedeId, consulta, contexto) {
  const { estado, proclamaId, buscar, orden, pagina, porPagina } = consulta;
  const { filas, total } = await modelo.listar(
    { sedeId, estado, proclamaId, buscar },
    { orden, limite: porPagina, desplazamiento: desplazamiento(pagina, porPagina) },
  );

  if (contexto) {
    await registrarConsulta(contexto, {
      entidad: 'observacion_proclama',
      entidadId: '*',
      datosNuevos: {
        filtros: filtrosSinDatosPersonales(consulta),
        filas: filas.length,
      },
    });
  }

  return {
    datos: filas.map(aObservacion),
    paginacion: armarPaginacion({ total, pagina, porPagina }),
  };
}

// GET /api/admin/proclamas/observaciones/:id
export async function obtenerObservacion(usuario, id, contexto) {
  const fila = await modelo.buscarPorId(id);
  if (!fila || (usuario.sedeId !== null && fila.sede_id !== usuario.sedeId)) {
    throw ErrorApp.noEncontrado('La observación no existe.');
  }

  await registrarConsulta(contexto, {
    entidad: 'observacion_proclama',
    entidadId: id,
    datosNuevos: { proclama_id: fila.proclama_id, sede_id: fila.sede_id },
  });

  return aObservacion(fila);
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
