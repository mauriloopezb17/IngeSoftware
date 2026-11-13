// Validación de /api/admin/eventos (contrato: docs/api/admin.md, sección 4).
import { z } from 'zod';
import '../config/zod.js';
import {
  booleanoQuery,
  fecha,
  fechaHoraConZona,
  id,
  listaCodigos,
  listaIds,
  paginacion,
  slug,
} from './comunes.js';
import { estadoSinRevision, idDelCuerpo, textoOpcional } from './panel.js';

export const paramsEvento = z.object({ id });

export const consultaEventos = paginacion
  .extend({
    sede: slug.optional(),
    desde: fecha.optional(),
    hasta: fecha.optional(),
    categoria: listaIds.optional(),
    estado: listaCodigos(['BORRADOR', 'PUBLICADO', 'ARCHIVADO']).optional(),
    finalizados: booleanoQuery.optional(),
    orden: z
      .enum(['fechaInicio', '-fechaInicio'], { error: 'Debe ser fechaInicio o -fechaInicio.' })
      .default('fechaInicio'),
  })
  .refine(({ desde, hasta }) => !desde || !hasta || hasta >= desde, {
    path: ['hasta'],
    message: 'Debe ser igual o posterior a desde.',
  });

const titulo = z
  .string({ error: 'Debe ser un texto.' })
  .trim()
  .min(3, 'Debe tener de 3 a 200 caracteres.')
  .max(200, 'Debe tener de 3 a 200 caracteres.');

const fechasEnOrden = ({ fechaInicio, fechaFin }) =>
  !fechaInicio || !fechaFin || new Date(fechaFin) >= new Date(fechaInicio);
const MENSAJE_FIN = 'Debe ser igual o posterior a la fecha de inicio.';

export const cuerpoCrearEvento = z
  .strictObject({
    sedeId: idDelCuerpo.optional(),
    titulo,
    descripcion: textoOpcional(2000),
    lugar: textoOpcional(150),
    fechaInicio: fechaHoraConZona,
    fechaFin: fechaHoraConZona.nullable().optional(),
    todoElDia: z.boolean({ error: 'Debe ser true o false.' }).default(false),
    categoriaEventoId: idDelCuerpo,
    imagenId: idDelCuerpo.nullable().optional(),
    estado: estadoSinRevision.default('PUBLICADO'),
  })
  .refine(fechasEnOrden, { path: ['fechaFin'], message: MENSAJE_FIN });

export const cuerpoEditarEvento = z
  .strictObject({
    titulo: titulo.optional(),
    descripcion: textoOpcional(2000),
    lugar: textoOpcional(150),
    fechaInicio: fechaHoraConZona.optional(),
    fechaFin: fechaHoraConZona.nullable().optional(),
    todoElDia: z.boolean({ error: 'Debe ser true o false.' }).optional(),
    categoriaEventoId: idDelCuerpo.optional(),
    imagenId: idDelCuerpo.nullable().optional(),
    estado: estadoSinRevision.optional(),
  })
  .refine(fechasEnOrden, { path: ['fechaFin'], message: MENSAJE_FIN });
