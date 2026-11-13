// Bitácora de cambios (tabla bitacora_cambio). Contrato: docs/api/admin.md, sección 13.
//
// Cada modificación hecha desde la API se registra en la MISMA transacción que el cambio: si el
// cambio se deshace, su registro también, y nunca queda un cambio sin registrar.
//
//   await transaccion(async (db) => {
//     const fila = await modelo.actualizar(..., db);          // fila completa (RETURNING *)
//     await registrarCambio(db, contextoDe(req), {
//       entidad: 'archivo_multimedia', entidadId: fila.id, accion: 'UPDATE', anterior, nuevo: fila,
//     });
//   });
import { isIP } from 'node:net';
import { ErrorApp } from '../errores/ErrorApp.js';
import * as modelo from '../models/bitacora.model.js';
import { esAdministrador } from '../utils/alcanceSede.js';
import { formatearFechaHora } from '../utils/formato.js';
import { armarPaginacion, desplazamiento } from '../utils/paginacion.js';
import { programarInvalidacion } from './invalidacionCache.service.js';

// Columnas cuyo valor nunca se guarda (se registra que cambiaron, no a qué).
const COLUMNAS_OCULTAS = new Set(['hash_contrasena']);
const VALOR_OCULTO = '[oculto]';

// Quién y desde dónde: el usuario de la sesión y la IP de la petición (req.ip ya respeta
// TRUST_PROXY). Los procesos sin petición (ej. el script crear-admin) usan CONTEXTO_DEL_SISTEMA.
export function contextoDe(req) {
  return { usuarioId: req.usuario?.id ?? null, ip: req.ip ?? null };
}

export const CONTEXTO_DEL_SISTEMA = Object.freeze({ usuarioId: null, ip: null });

// IP válida para la columna inet, sin el prefijo IPv6 de una IPv4 ("::ffff:190.1.2.3").
function normalizarIp(ip) {
  if (typeof ip !== 'string') return null;
  const sinPrefijo = ip.startsWith('::ffff:') && isIP(ip.slice(7)) === 4 ? ip.slice(7) : ip;
  return isIP(sinPrefijo) ? sinPrefijo : null;
}

// Valores tal como se guardan en el JSON: las fechas en hora de Bolivia (formato del contrato).
function normalizarValor(valor) {
  return valor instanceof Date ? formatearFechaHora(valor) : valor;
}

function normalizarFila(fila) {
  return Object.fromEntries(
    Object.entries(fila).map(([columna, valor]) => [columna, normalizarValor(valor)]),
  );
}

const ocultar = (datos) =>
  datos &&
  Object.fromEntries(
    Object.entries(datos).map(([columna, valor]) => [
      columna,
      COLUMNAS_OCULTAS.has(columna) ? VALOR_OCULTO : valor,
    ]),
  );

const mismoValor = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Datos anteriores y nuevos según la acción. En un UPDATE, solo las columnas que cambiaron.
function datosDelCambio(accion, anterior, nuevo) {
  if (accion === 'INSERT') return { datosAnteriores: null, datosNuevos: normalizarFila(nuevo) };
  if (accion === 'DELETE') return { datosAnteriores: normalizarFila(anterior), datosNuevos: null };

  const antes = normalizarFila(anterior);
  const despues = normalizarFila(nuevo);
  const cambiadas = Object.keys(despues).filter(
    (columna) => columna in antes && !mismoValor(antes[columna], despues[columna]),
  );
  return {
    datosAnteriores: Object.fromEntries(cambiadas.map((columna) => [columna, antes[columna]])),
    datosNuevos: Object.fromEntries(cambiadas.map((columna) => [columna, despues[columna]])),
  };
}

// Registra un cambio. "db" es el { consultar } de la transacción del cambio.
// anterior / nuevo: filas de la tabla (snake_case, tal como se guardan). Un UPDATE que no cambia
// nada no se registra (ni invalida la caché de lecturas públicas).
export async function registrarCambio(
  db,
  contexto,
  { entidad, entidadId, accion, anterior, nuevo },
) {
  if (!['INSERT', 'UPDATE', 'DELETE'].includes(accion)) {
    throw new TypeError(`Acción de bitácora desconocida: ${accion}`);
  }

  const { datosAnteriores, datosNuevos } = datosDelCambio(accion, anterior, nuevo);
  if (accion === 'UPDATE' && Object.keys(datosNuevos).length === 0) return;

  await modelo.insertar(
    {
      usuarioId: contexto.usuarioId ?? null,
      entidad,
      entidadId: String(entidadId),
      accion,
      datosAnteriores: ocultar(datosAnteriores),
      datosNuevos: ocultar(datosNuevos),
      direccionIp: normalizarIp(contexto.ip),
    },
    db,
  );

  // Todo cambio que se registra puede afectar lo que ve el portal: se invalida su caché al
  // confirmarse la transacción (invalidacionCache.service.js).
  await programarInvalidacion(db, { entidad, anterior, nuevo });
}

// ---- Consulta (GET /api/admin/bitacora) ----

function aCambio(fila) {
  return {
    id: fila.id,
    usuario:
      fila.usuario_id === null
        ? null
        : { id: fila.usuario_id, nombreCompleto: fila.usuario_nombre ?? null },
    entidad: fila.entidad,
    entidadId: fila.entidad_id,
    accion: fila.accion,
    datosAnteriores: fila.datos_anteriores,
    datosNuevos: fila.datos_nuevos,
    direccionIp: fila.direccion_ip,
    fecha: formatearFechaHora(fila.fecha),
  };
}

// El Administrador ve todo; el Párroco, solo los cambios de recursos de su sede.
export async function listarCambios(usuario, consulta) {
  let sedeId;
  if (!esAdministrador(usuario)) {
    if (usuario.sedeId === null || usuario.sedeId === undefined) {
      throw ErrorApp.sinPermiso('Tu usuario no tiene una sede asignada.');
    }
    sedeId = usuario.sedeId;
  }

  const { pagina, porPagina } = consulta;
  const { filas, total } = await modelo.listar(
    {
      sedeId,
      entidad: consulta.entidad,
      entidadId: consulta.entidadId,
      usuarioId: consulta.usuario,
      accion: consulta.accion,
      desde: consulta.desde,
      hasta: consulta.hasta,
    },
    { limite: porPagina, desplazamiento: desplazamiento(pagina, porPagina) },
  );

  return { datos: filas.map(aCambio), paginacion: armarPaginacion({ total, pagina, porPagina }) };
}
