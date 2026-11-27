// Validación de parámetros para GET /api/sedes/:sede/buscar (OLA-2.md §2).
import { z } from 'zod';
import '../config/zod.js';
import { esquemaListado, fecha, listaCodigos } from './comunes.js';

export const TIPOS_BUSQUEDA = Object.freeze([
  'noticia',
  'evento',
  'sacramento',
  'grupo',
  'boletin',
  'pagina',
]);

export const ORDENES_BUSQUEDA = Object.freeze(['relevancia', 'reciente', 'antiguo']);

export const consultaBuscar = esquemaListado({
  filtros: {
    q: z
      .string({ error: 'Escribe al menos 2 caracteres.' })
      .trim()
      .min(2, 'Escribe al menos 2 caracteres.')
      .max(100, 'Máximo 100 caracteres.')
      .refine((valor) => !/[\p{Cc}]/u.test(valor), 'Contiene caracteres no permitidos.'),
    tipo: listaCodigos(TIPOS_BUSQUEDA).optional(),
    desde: fecha.optional(),
    hasta: fecha.optional(),
  },
  ordenes: ORDENES_BUSQUEDA,
  ordenPredeterminado: 'relevancia',
  porPaginaMaximo: 30,
  porPaginaPredeterminado: 10,
}).refine(({ desde, hasta }) => !desde || !hasta || hasta >= desde, {
  path: ['hasta'],
  message: 'Debe ser igual o posterior a desde.',
});
