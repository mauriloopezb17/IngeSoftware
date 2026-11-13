// Validación de grupos pastorales en el panel CMS (docs/api/admin.md, sección 7).
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

const iconoLucide = z.preprocess(
  vacioANulo,
  z
    .string()
    .trim()
    .max(40, 'El ícono puede tener hasta 40 caracteres.')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'El ícono debe estar en formato kebab-case.')
    .nullable(),
);

export const paramsGrupo = z.object({ id });

export const consultaGrupos = z.object({
  sede: slug.optional(),
  visible: booleanoQuery.optional(),
});

export const cuerpoCrearGrupo = z.strictObject({
  sedeId: idEntero.nullable().optional(),
  nombre: nombreGrupo,
  descripcion: textoOpcional(2000, 'La descripción').optional().default(null),
  horarioReunion: textoOpcional(100, 'El horario de reunión').optional().default(null),
  contacto: textoOpcional(120, 'El contacto').optional().default(null),
  icono: iconoLucide.optional().default(null),
  imagenId: idEntero.nullable().optional().default(null),
  visible: z.boolean().optional().default(true),
});

export const cuerpoEditarGrupo = z.strictObject({
  nombre: nombreGrupo.optional(),
  descripcion: textoOpcional(2000, 'La descripción').optional(),
  horarioReunion: textoOpcional(100, 'El horario de reunión').optional(),
  contacto: textoOpcional(120, 'El contacto').optional(),
  icono: iconoLucide.optional(),
  imagenId: idEntero.nullable().optional(),
  visible: z.boolean().optional(),
});

export const cuerpoReordenarGrupos = z.strictObject({
  ids: z
    .array(idEntero)
    .refine(
      (lista) => new Set(lista).size === lista.length,
      'No puede haber identificadores repetidos.',
    ),
});
