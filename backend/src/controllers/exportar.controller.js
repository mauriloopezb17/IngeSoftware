// Controlador genérico para exportar listados del panel a CSV (GET /api/admin/<recurso>/exportar).
import { contextoDe } from '../services/bitacora.service.js';
import { exportarCsv } from '../services/exportar.service.js';

export function exportarRecurso(recurso) {
  return async function manejarExportacion(req, res) {
    const { csv, nombreArchivo } = await exportarCsv(recurso, {
      usuario: req.usuario,
      sedeFiltro: req.sedeFiltro,
      consulta: req.validado.query,
      contexto: contextoDe(req),
    });

    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
      'Cache-Control': 'no-store',
    });
    res.status(200).send(csv);
  };
}
