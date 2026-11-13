// Validación de /api/admin/boletines (contrato: docs/api/admin.md, sección 11).
import { z } from 'zod';
import '../config/zod.js';
import { anio, id, paginacion, slug } from './comunes.js';
import { idDelCuerpo, textoObligatorio } from './panel.js';

export const paramsBoletin = z.object({ id });

export const consultaBoletines = paginacion.extend({
  sede: slug.optional(),
  anio: anio.optional(),
});

// YYYY-MM con un mes real. Se guarda como el primer día del mes.
const periodo = z
  .string({ error: 'Debe ser un texto con formato AAAA-MM.' })
  .regex(/^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/, 'Debe tener formato AAAA-MM (ej. 2026-11).');

export const cuerpoCrearBoletin = z.strictObject({
  sedeId: idDelCuerpo.optional(),
  titulo: textoObligatorio(150),
  periodo,
  archivoId: idDelCuerpo,
});

export const cuerpoEditarBoletin = z.strictObject({
  titulo: textoObligatorio(150).optional(),
  periodo: periodo.optional(),
  archivoId: idDelCuerpo.optional(),
});
