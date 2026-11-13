// Validación de /api/admin/proclamas (contrato: docs/api/admin.md, sección 10).
import { z } from 'zod';
import '../config/zod.js';
import { anio, booleanoQuery, fecha, fechaHoraConZona, id, paginacion, slug } from './comunes.js';
import { idDelCuerpo, textoObligatorio } from './panel.js';

export const paramsProclama = z.object({ id });
export const paramsPublicacionProclama = z.object({
  id,
  numero: z.coerce
    .number({ error: 'Debe ser un número.' })
    .int('Debe ser un número entero.')
    .min(1, 'Debe ser 1, 2 o 3.')
    .max(3, 'Debe ser 1, 2 o 3.'),
});

export const consultaProclamas = paginacion.extend({
  sede: slug.optional(),
  vigentes: booleanoQuery.optional(),
  anio: anio.optional(),
  buscar: z
    .string()
    .trim()
    .min(1, 'No puede estar vacío.')
    .max(100, 'Es demasiado largo.')
    .optional(),
  orden: z
    .enum(['fechaMatrimonio', '-fechaMatrimonio'], {
      error: 'Debe ser fechaMatrimonio o -fechaMatrimonio.',
    })
    .default('fechaMatrimonio'),
});

const publicacion = z.strictObject({ fecha });

export const cuerpoCrearProclama = z.strictObject({
  sedeId: idDelCuerpo.optional(),
  contrayente1: textoObligatorio(150),
  contrayente2: textoObligatorio(150),
  fechaMatrimonio: fechaHoraConZona,
  tramiteOrigenId: idDelCuerpo.nullable().optional(),
  publicaciones: z
    .array(publicacion, { error: 'Debe ser una lista.' })
    .max(3, 'Una proclama tiene hasta 3 publicaciones.')
    .optional(),
});

export const cuerpoEditarProclama = z.strictObject({
  contrayente1: textoObligatorio(150).optional(),
  contrayente2: textoObligatorio(150).optional(),
  fechaMatrimonio: fechaHoraConZona.optional(),
});

export const cuerpoPublicacionProclama = z.strictObject({ fecha });
