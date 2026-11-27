// Validación de servicios y preguntas frecuentes en el panel CMS (docs/api/admin.md, sección 6).
import { z } from 'zod';
import '../config/zod.js';
import { extraerYoutubeId } from './adminVideos.js';
import { contenidoBlockNote } from './blocknote.js';
import { booleanoQuery, esquemaListado, id, slug } from './comunes.js';

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

const videoYoutubeOpcional = z.preprocess(
  vacioANulo,
  z
    .string({ error: 'Debe ser un texto.' })
    .trim()
    .transform((valor, ctx) => {
      const youtubeId = extraerYoutubeId(valor);
      if (!youtubeId) {
        ctx.addIssue({
          code: 'custom',
          message: 'Ingresa un identificador o URL válida de YouTube.',
        });
        return z.NEVER;
      }
      return youtubeId;
    })
    .nullable(),
);

export const detalleServicio = z.strictObject({
  contenido: contenidoBlockNote.nullable().optional(),
  galeria: z
    .array(idEntero, { error: 'Debe ser una lista.' })
    .max(24, 'La galería puede tener hasta 24 archivos.')
    .optional(),
  videoYoutubeId: videoYoutubeOpcional.optional(),
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

export const consultaServicios = esquemaListado({
  conBuscar: true,
  filtros: {
    sede: slug.optional(),
    visible: booleanoQuery.optional(),
  },
  ordenes: ['orden', '-orden', 'nombre', '-nombre'],
  ordenPredeterminado: 'orden',
  porPaginaMaximo: 100,
});

export const cuerpoCrearServicio = z.strictObject({
  sedeId: idEntero.nullable().optional(),
  nombre: nombreServicio,
  slug: slugServicio.optional().default(null),
  descripcionCorta,
  icono: iconoLucide.optional().default(null),
  imagenId: idEntero.nullable().optional().default(null),
  contenido: contenidoServicio.optional().default({ datos: [] }),
  detalle: detalleServicio.nullable().optional().default(null),
  visible: z.boolean().optional().default(true),
});

export const cuerpoEditarServicio = z.strictObject({
  nombre: nombreServicio.optional(),
  slug: slugServicio.optional(),
  descripcionCorta: descripcionCorta.optional(),
  icono: iconoLucide.optional(),
  imagenId: idEntero.nullable().optional(),
  contenido: contenidoServicio.optional(),
  detalle: detalleServicio.nullable().optional(),
  visible: z.boolean().optional(),
});

export const cuerpoEditarDetalleServicio = z.strictObject({
  imagenId: idEntero.nullable().optional(),
  detalle: detalleServicio.nullable().optional(),
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
