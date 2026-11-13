// Validación de /api/admin/paginas (contrato: docs/api/admin.md, sección 12). El contenido de
// cada bloque lo valida Ajv (bloques.js) contra el esquema de su tipo.
import { z } from 'zod';
import '../config/zod.js';
import { id, listaCodigos, slug } from './comunes.js';
import { estadoSinRevision, idDelCuerpo, textoObligatorio, textoOpcional } from './panel.js';

export const paramsPagina = z.object({ id });
export const paramsBloque = z.object({ id, bloqueId: id });

export const consultaPaginas = z.object({
  sede: slug.optional(),
  estado: listaCodigos(['BORRADOR', 'PUBLICADO', 'ARCHIVADO']).optional(),
});

const slugDePagina = slug.max(120, 'El slug es demasiado largo.');
const ordenMenu = z
  .number({ error: 'Debe ser un número.' })
  .int('Debe ser un número entero.')
  .min(0, 'Debe estar entre 0 y 32767.')
  .max(32767, 'Debe estar entre 0 y 32767.');

export const cuerpoCrearPagina = z.strictObject({
  sedeId: idDelCuerpo.optional(),
  slug: slugDePagina.nullable().optional(),
  titulo: textoObligatorio(160),
  descripcionSeo: textoOpcional(300),
  paginaPadreId: idDelCuerpo.nullable().optional(),
  mostrarEnMenu: z.boolean({ error: 'Debe ser true o false.' }).default(false),
  ordenMenu: ordenMenu.default(0),
  estado: estadoSinRevision.default('BORRADOR'),
});

export const cuerpoEditarPagina = z.strictObject({
  slug: slugDePagina.nullable().optional(),
  titulo: textoObligatorio(160).optional(),
  descripcionSeo: textoOpcional(300),
  paginaPadreId: idDelCuerpo.nullable().optional(),
  mostrarEnMenu: z.boolean({ error: 'Debe ser true o false.' }).optional(),
  ordenMenu: ordenMenu.optional(),
  estado: estadoSinRevision.optional(),
});

// El contenido de un bloque es un objeto cualquiera: su forma la valida Ajv según el tipo.
const contenido = z.record(z.string(), z.unknown(), { error: 'Debe ser un objeto.' });

export const cuerpoCrearBloque = z.strictObject({
  tipo: z.string({ error: 'Es obligatorio.' }).trim().min(1, 'Es obligatorio.').max(40),
  contenido,
  visible: z.boolean({ error: 'Debe ser true o false.' }).default(true),
});

export const cuerpoEditarBloque = z.strictObject({
  tipo: z.never({ error: 'El tipo no se puede cambiar.' }).optional(),
  contenido: contenido.optional(),
  visible: z.boolean({ error: 'Debe ser true o false.' }).optional(),
});

export const cuerpoReordenar = z.strictObject({
  ids: z.array(idDelCuerpo, { error: 'Debe ser una lista de ids.' }).max(500),
});
