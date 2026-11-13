// Validación de sedes y redes sociales en el panel CMS (docs/api/admin.md, sección 9).
import { z } from 'zod';
import '../config/zod.js';
import { TIPOS_SEDE } from '../constantes/catalogos.js';
import { id, slug } from './comunes.js';

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

const nombreSede = z
  .string()
  .trim()
  .min(1, 'El nombre es obligatorio.')
  .max(120, 'El nombre puede tener hasta 120 caracteres.');

const slugSede = z.preprocess(
  vacioANulo,
  slug.max(80, 'El slug puede tener hasta 80 caracteres.').nullable(),
);

const tipoSede = z.enum(TIPOS_SEDE.codigos, {
  error: `Debe ser uno de: ${TIPOS_SEDE.codigos.join(', ')}.`,
});

const correoSede = z.preprocess(
  vacioANulo,
  z
    .string()
    .trim()
    .email('Debe ser un correo electrónico válido.')
    .max(120, 'El correo puede tener hasta 120 caracteres.')
    .nullable(),
);

const latitud = z
  .number({ error: 'Debe ser un número.' })
  .min(-90, 'La latitud debe estar entre -90 y 90.')
  .max(90, 'La latitud debe estar entre -90 y 90.');

const longitud = z
  .number({ error: 'Debe ser un número.' })
  .min(-180, 'La longitud debe estar entre -180 y 180.')
  .max(180, 'La longitud debe estar entre -180 y 180.');

const urlHttps = z
  .string()
  .trim()
  .max(300, 'La URL puede tener hasta 300 caracteres.')
  .refine((valor) => {
    try {
      const url = new URL(valor);
      return url.protocol === 'https:';
    } catch {
      return false;
    }
  }, 'La URL de la red social debe comenzar con https://.');

const redSocialItem = z.strictObject({
  redSocialId: idEntero,
  url: urlHttps,
});

const redesSociales = z
  .array(redSocialItem)
  .refine(
    (lista) => new Set(lista.map((item) => item.redSocialId)).size === lista.length,
    'No puede haber redes sociales repetidas.',
  );

const configuracion = z.record(z.string().min(1), z.unknown());

export const paramsSede = z.object({ id });

export const cuerpoCrearSede = z
  .strictObject({
    nombre: nombreSede,
    slug: slugSede.optional().default(null),
    tipo: tipoSede,
    sedePadreId: idEntero.nullable().optional().default(null),
    direccion: textoOpcional(200, 'La dirección').optional().default(null),
    telefono: textoOpcional(30, 'El teléfono').optional().default(null),
    whatsapp: textoOpcional(30, 'El WhatsApp').optional().default(null),
    correo: correoSede.optional().default(null),
    latitud: latitud.nullable().optional().default(null),
    longitud: longitud.nullable().optional().default(null),
    configuracion: configuracion.optional().default({}),
    redesSociales: redesSociales.optional().default([]),
    activo: z.boolean().optional().default(true),
  })
  .refine(({ latitud: lat, longitud: lon }) => (lat === null) === (lon === null), {
    path: ['latitud'],
    message: 'Debes indicar latitud y longitud juntas, o dejar ambas en null.',
  });

export const cuerpoEditarSede = z.strictObject({
  nombre: nombreSede.optional(),
  slug: slugSede.optional(),
  tipo: tipoSede.optional(),
  sedePadreId: idEntero.nullable().optional(),
  direccion: textoOpcional(200, 'La dirección').optional(),
  telefono: textoOpcional(30, 'El teléfono').optional(),
  whatsapp: textoOpcional(30, 'El WhatsApp').optional(),
  correo: correoSede.optional(),
  latitud: latitud.nullable().optional(),
  longitud: longitud.nullable().optional(),
  imagenPortadaId: idEntero.nullable().optional(),
  configuracion: configuracion.optional(),
  redesSociales: redesSociales.optional(),
  activo: z.boolean().optional(),
});
