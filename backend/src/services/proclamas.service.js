// Proclamas matrimoniales vigentes e historial (contrato: docs/api/publico.md, RF-02).
import * as modelo from '../models/proclamas.model.js';
import { formatearFecha, formatearFechaHora } from '../utils/formato.js';
import { armarPaginacion, desplazamiento } from '../utils/paginacion.js';

function aProclama(fila) {
  return {
    id: fila.id,
    contrayente1: fila.nombre_contrayente_1,
    contrayente2: fila.nombre_contrayente_2,
    fechaMatrimonio: formatearFechaHora(fila.fecha_matrimonio),
    numeroProclama: fila.numero_proclama,
    publicaciones: fila.publicaciones.map(({ numero, fecha }) => ({
      numero,
      fecha: formatearFecha(fecha),
    })),
  };
}

// GET /api/sedes/:sede/proclamas
export async function listarProclamasVigentes(sedeId) {
  return (await modelo.listarVigentes(sedeId)).map(aProclama);
}

// GET /api/sedes/:sede/proclamas/historial. consulta: { anio?, pagina, porPagina }
export async function listarHistorialProclamas(sedeId, { anio, pagina, porPagina }) {
  const { filas, total } = await modelo.listarHistorial(sedeId, {
    anio,
    limite: porPagina,
    desplazamiento: desplazamiento(pagina, porPagina),
  });

  return {
    datos: filas.map(aProclama),
    paginacion: armarPaginacion({ total, pagina, porPagina }),
  };
}
