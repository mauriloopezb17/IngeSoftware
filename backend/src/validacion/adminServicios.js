// Validación de servicios y preguntas frecuentes en el panel CMS (docs/api/admin.md, sección 6).
import { z } from 'zod';
import '../config/zod.js';
import { booleanoQuery, id, slug } from './comunes.js';

const ENTERO_MAXIMO_PG = 2_147_483_647;

const idEntero = z
  .number({ error: 'Debe ser un número entero.' })
  .int('Debe ser un número entero.')
  .positive('Debe ser un número positivo.')
  .max(ENTERO_MAXIMO_PG, 'El número es demasiado grande.');

const vacioANulo = (valor) => (typeof valor === 'string' && valor.trim() === '' ? null : valor);

const nombreServicio = z
  .string()
  .trim()
  .min(1, 'El nombre es obligatorio.')
  .max(100, 'El nombre puede tener hasta 100 caracteres.');

const slugServicio = z.preprocess(
  vacioANulo,
  slug.max(80, 'El slug puede tener hasta 80 caracteres.').nullable(),
);

const descripcionCorta = z
  .string()
  .trim()
  .min(1, 'La descripción corta es obligatoria.')
  .max(300, 'La descripción corta puede tener hasta 300 caracteres.');

const iconoLucide = z.preprocess(
  vacioANulo,
  z
    .string()
    .trim()
    .max(40, 'El ícono puede tener hasta 40 caracteres.')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'El ícono debe estar en formato kebab-case.')
    .nullable(),
);

const filaContenido = z.strictObject({
  etiqueta: z
    .string()
    .trim()
    .min(1, 'La etiqueta es obligatoria.')
    .max(60, 'La etiqueta puede tener hasta 60 caracteres.'),
  valor: z
    .string()
    .trim()
    .min(1, 'El valor es obligatorio.')
    .max(300, 'El valor puede tener hasta 300 caracteres.'),
});

const contenidoServicio = z.strictObject({
  datos: z.array(filaContenido).max(20, 'El contenido puede tener hasta 20 elementos.'),
});

const preguntaTexto = z
  .string()
  .trim()
  .min(1, 'La pregunta es obligatoria.')
  .max(300, 'La pregunta puede tener hasta 300 caracteres.');

const respuestaTexto = z
  .string()
  .trim()
  .min(1, 'La respuesta es obligatoria.')
  .max(2000, 'La respuesta puede tener hasta 2000 caracteres.');

export const paramsServicio = z.object({ id });
export const paramsPregunta = z.object({ id, preguntaId: id });

export const consultaServicios = z.object({
  sede: slug.optional(),
  visible: booleanoQuery.optional(),
});

export const cuerpoCrearServicio = z.strictObject({
  sedeId: idEntero.nullable().optional(),
  nombre: nombreServicio,
  slug: slugServicio.optional().default(null),
  descripcionCorta,
  icono: iconoLucide.optional().default(null),
  contenido: contenidoServicio.optional().default({ datos: [] }),
  visible: z.boolean().optional().default(true),
});

export const cuerpoEditarServicio = z.strictObject({
  nombre: nombreServicio.optional(),
  slug: slugServicio.optional(),
  descripcionCorta: descripcionCorta.optional(),
  icono: iconoLucide.optional(),
  contenido: contenidoServicio.optional(),
  visible: z.boolean().optional(),
});

export const cuerpoReordenar = z.strictObject({
  ids: z
    .array(idEntero)
    .refine(
      (lista) => new Set(lista).size === lista.length,
      'No puede haber identificadores repetidos.',
    ),
});

export const cuerpoCrearPregunta = z.strictObject({
  pregunta: preguntaTexto,
  respuesta: respuestaTexto,
  activa: z.boolean().optional().default(true),
});

export const cuerpoEditarPregunta = z.strictObject({
  pregunta: preguntaTexto.optional(),
  respuesta: respuestaTexto.optional(),
  activa: z.boolean().optional(),
});
