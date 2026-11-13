// Helpers compartidos entre los módulos administrativos de contenido (servicios, grupos, videos).
import slugify from 'slugify';
import { transaccion } from '../db/index.js';
import { ErrorApp } from '../errores/ErrorApp.js';
import { registrarCambio } from '../services/bitacora.service.js';
import { esAdministrador } from './alcanceSede.js';

const TABLAS_REORDENABLES = new Set(['servicio', 'grupo_pastoral', 'video']);

// Convierte un texto libre en slug válido dentro del límite de la columna en PostgreSQL.
export function generarSlug(texto, largoMaximo = 80) {
  const base = slugify(String(texto ?? ''), { lower: true, strict: true, locale: 'es' });
  return base.slice(0, largoMaximo).replace(/-+$/g, '');
}

// Reordena todos los registros de una sede dentro de una transacción y registra en bitácora los
// elementos cuyo "orden" cambió. Devuelve el sedeId afectado.
export async function reordenarPorSede({ tabla, entidad, usuario, ids, contexto, baseOrden = 1 }) {
  if (!TABLAS_REORDENABLES.has(tabla)) {
    throw new TypeError(`Tabla no reordenable: ${tabla}`);
  }

  return transaccion(async (db) => {
    let sedeId;

    if (!esAdministrador(usuario)) {
      if (usuario.sedeId === null || usuario.sedeId === undefined) {
        throw ErrorApp.sinPermiso('Tu usuario no tiene una sede asignada.');
      }
      if (ids.length > 0) {
        const { rows: encontradas } = await db.consultar(
          `SELECT id, sede_id FROM ${tabla} WHERE id = ANY($1::int[])`,
          [ids],
        );
        if (encontradas.some((fila) => fila.sede_id !== usuario.sedeId)) {
          throw ErrorApp.sinPermiso('Este recurso pertenece a otra sede.');
        }
      }
      sedeId = usuario.sedeId;
    } else {
      if (ids.length === 0) {
        throw ErrorApp.validacion(undefined, [
          { campo: 'ids', mensaje: 'Debes indicar los identificadores a reordenar.' },
        ]);
      }
      const { rows: encontradas } = await db.consultar(
        `SELECT id, sede_id FROM ${tabla} WHERE id = ANY($1::int[])`,
        [ids],
      );
      if (encontradas.length !== ids.length) {
        throw ErrorApp.validacion(undefined, [
          { campo: 'ids', mensaje: 'Uno o más identificadores no existen.' },
        ]);
      }
      const sedes = new Set(encontradas.map((fila) => fila.sede_id));
      if (sedes.size > 1) {
        throw ErrorApp.validacion(undefined, [
          { campo: 'ids', mensaje: 'Todos los registros deben pertenecer a la misma sede.' },
        ]);
      }
      sedeId = encontradas[0].sede_id;
    }

    const { rows: actuales } = await db.consultar(
      `SELECT * FROM ${tabla} WHERE sede_id = $1 ORDER BY orden, id FOR UPDATE`,
      [sedeId],
    );

    const recibidos = new Set(ids);
    const coincide =
      recibidos.size === actuales.length && actuales.every((fila) => recibidos.has(fila.id));
    if (!coincide) {
      throw ErrorApp.validacion(undefined, [
        {
          campo: 'ids',
          mensaje: 'La lista debe incluir exactamente todos los registros de la sede.',
        },
      ]);
    }

    const porId = new Map(actuales.map((fila) => [fila.id, fila]));
    for (let indice = 0; indice < ids.length; indice += 1) {
      const registroId = ids[indice];
      const nuevoOrden = indice + baseOrden;
      const anterior = porId.get(registroId);
      if (anterior.orden === nuevoOrden) continue;

      const { rows: actualizadas } = await db.consultar(
        `UPDATE ${tabla} SET orden = $2 WHERE id = $1 RETURNING *`,
        [registroId, nuevoOrden],
      );
      await registrarCambio(db, contexto, {
        entidad,
        entidadId: registroId,
        accion: 'UPDATE',
        anterior,
        nuevo: actualizadas[0],
      });
    }

    return sedeId;
  });
}
