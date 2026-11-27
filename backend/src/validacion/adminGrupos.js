// Validación de grupos pastorales en el panel CMS (docs/api/admin.md, sección 7).
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

const textoOpcional = (max, etiqueta) =>
  z.preprocess(
    vacioANulo,
    z.string().trim().max(max, `${etiqueta} puede tener hasta ${max} caracteres.`).nullable(),
  );

const nombreGrupo = z
  .string()
  .trim()
  .min(1, 'El nombre es obligatorio.')
  .max(100, 'El nombre puede tener hasta 100 caracteres.');

const slugGrupo = z.preprocess(
  vacioANulo,
  slug.max(120, 'El slug puede tener hasta 120 caracteres.').nullable(),
);

const iconoLucide = z.preprocess(
  vacioANulo,
  z
    .string()
    .trim()
    .max(40, 'El ícono puede tener hasta 40 caracteres.')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'El ícono debe estar en formato kebab-case.')
    .nullable(),
);

const whatsappOpcional = z.preprocess(
  vacioANulo,
  z
    .string({ error: 'Debe ser un texto.' })
    .trim()
    .max(30, 'Puede tener hasta 30 caracteres.')
    .regex(/^\+?[\d\s-]+$/, 'Solo puede contener +, dígitos, espacios y guiones.')
    .refine((valor) => {
      const digitos = valor.replace(/\D/g, '').length;
      return digitos >= 7 && digitos <= 15;
    }, 'Debe tener entre 7 y 15 dígitos.')
    .nullable(),
);

const correoOpcional = z.preprocess(
  vacioANulo,
  z
    .string({ error: 'Debe ser un texto.' })
    .trim()
    .email('Escribe un correo electrónico válido.')
    .max(120, 'Puede tener hasta 120 caracteres.')
    .nullable(),
);

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

export const detalleGrupo = z.strictObject({
  contenido: contenidoBlockNote.nullable().optional(),
  galeria: z
    .array(idEntero, { error: 'Debe ser una lista.' })
    .max(24, 'La galería puede tener hasta 24 archivos.')
    .optional(),
  videoYoutubeId: videoYoutubeOpcional.optional(),
});

export const paramsGrupo = z.object({ id });

export const consultaGrupos = esquemaListado({
  conBuscar: true,
  filtros: {
    sede: slug.optional(),
    visible: booleanoQuery.optional(),
  },
  ordenes: ['orden', '-orden', 'nombre', '-nombre'],
  ordenPredeterminado: 'orden',
  porPaginaMaximo: 100,
});

export const cuerpoCrearGrupo = z.strictObject({
  sedeId: idEntero.nullable().optional(),
  nombre: nombreGrupo,
  slug: slugGrupo.optional().default(null),
  descripcion: textoOpcional(2000, 'La descripción').optional().default(null),
  horarioReunion: textoOpcional(100, 'El horario de reunión').optional().default(null),
  responsable: textoOpcional(120, 'El responsable').optional().default(null),
  whatsapp: whatsappOpcional.optional().default(null),
  correo: correoOpcional.optional().default(null),
  icono: iconoLucide.optional().default(null),
  imagenId: idEntero.nullable().optional().default(null),
  detalle: detalleGrupo.nullable().optional().default(null),
  visible: z.boolean().optional().default(true),
});

export const cuerpoEditarGrupo = z.strictObject({
  nombre: nombreGrupo.optional(),
  slug: slugGrupo.optional(),
  descripcion: textoOpcional(2000, 'La descripción').optional(),
  horarioReunion: textoOpcional(100, 'El horario de reunión').optional(),
  responsable: textoOpcional(120, 'El responsable').optional(),
  whatsapp: whatsappOpcional.optional(),
  correo: correoOpcional.optional(),
  icono: iconoLucide.optional(),
  imagenId: idEntero.nullable().optional(),
  detalle: detalleGrupo.nullable().optional(),
  visible: z.boolean().optional(),
});

export const cuerpoEditarDetalleGrupo = z.strictObject({
  descripcion: textoOpcional(2000, 'La descripción').optional(),
  horarioReunion: textoOpcional(100, 'El horario de reunión').optional(),
  responsable: textoOpcional(120, 'El responsable').optional(),
  whatsapp: whatsappOpcional.optional(),
  correo: correoOpcional.optional(),
  imagenId: idEntero.nullable().optional(),
  detalle: detalleGrupo.nullable().optional(),
});

export const cuerpoReordenarGrupos = z.strictObject({
  ids: z
    .array(idEntero)
    .refine(
      (lista) => new Set(lista).size === lista.length,
      'No puede haber identificadores repetidos.',
    ),
});
