// Validación de /api/admin/proclamas (contrato: docs/api/admin.md, sección 10).
import { z } from 'zod';
import '../config/zod.js';
import { contenidoBlockNote } from './blocknote.js';
import { anio, booleanoQuery, fecha, fechaHoraConZona, id, paginacion, slug } from './comunes.js';
import { idDelCuerpo, textoObligatorio, textoOpcional, urlHttps } from './panel.js';

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

const urlGoogleMaps = urlHttps(500).refine((valor) => {
  const { hostname, pathname } = new URL(valor);
  const host = hostname.toLowerCase();
  return (
    host === 'maps.app.goo.gl' ||
    host.startsWith('maps.google.') ||
    ((host === 'google.com' || host.endsWith('.google.com')) && pathname.startsWith('/maps')) ||
    (host === 'goo.gl' && pathname.startsWith('/maps'))
  );
}, 'Debe ser un enlace https:// de Google Maps.');

const enlaceMapa = z.preprocess(
  (valor) => (valor === '' ? null : valor),
  urlGoogleMaps.nullable().optional(),
);

const lugarProclama = z.strictObject({
  templo: textoObligatorio(150),
  direccion: textoOpcional(200),
  enlaceMapa,
});

export const detalleProclama = z.strictObject({
  contenido: contenidoBlockNote.nullable().optional(),
  galeria: z
    .array(idDelCuerpo, { error: 'Debe ser una lista.' })
    .max(12, 'La galería puede tener hasta 12 archivos.')
    .optional(),
  lugar: lugarProclama.nullable().optional(),
});

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
  imagenId: idDelCuerpo.nullable().optional(),
  detalle: detalleProclama.nullable().optional(),
});

export const cuerpoEditarProclama = z.strictObject({
  contrayente1: textoObligatorio(150).optional(),
  contrayente2: textoObligatorio(150).optional(),
  fechaMatrimonio: fechaHoraConZona.optional(),
  imagenId: idDelCuerpo.nullable().optional(),
  detalle: detalleProclama.nullable().optional(),
});

export const cuerpoEditarDetalleProclama = z.strictObject({
  imagenId: idDelCuerpo.nullable().optional(),
  detalle: detalleProclama.nullable().optional(),
});

export const cuerpoPublicacionProclama = z.strictObject({ fecha });

const vacioANull = (valor) => {
  if (typeof valor !== 'string') return valor;
  const limpio = valor.trim();
  return limpio === '' ? null : limpio;
};

export const cuerpoCrearObservacion = z
  .strictObject({
    nombreCompleto: z
      .string({ error: 'Debe ser un texto.' })
      .trim()
      .transform((valor) => valor.replace(/\s+/g, ' '))
      .pipe(
        z
          .string()
          .min(3, 'Debe tener al menos 3 caracteres.')
          .max(120, 'Puede tener hasta 120 caracteres.'),
      ),
    correo: z.preprocess(
      vacioANull,
      z
        .string({ error: 'Debe ser un texto.' })
        .email('Escribe un correo electrónico válido.')
        .max(120, 'Puede tener hasta 120 caracteres.')
        .nullable()
        .optional(),
    ),
    telefono: z.preprocess(
      vacioANull,
      z
        .string({ error: 'Debe ser un texto.' })
        .max(30, 'Puede tener hasta 30 caracteres.')
        .regex(/^\+?[\d\s-]+$/, 'Solo puede contener +, dígitos, espacios y guiones.')
        .refine((valor) => {
          const digitos = valor.replace(/\D/g, '').length;
          return digitos >= 7 && digitos <= 15;
        }, 'Debe tener entre 7 y 15 dígitos.')
        .nullable()
        .optional(),
    ),
    mensaje: z
      .string({ error: 'Debe ser un texto.' })
      .trim()
      .min(10, 'Debe tener al menos 10 caracteres.')
      .max(2000, 'Puede tener hasta 2000 caracteres.'),
    sitioWeb: z.string({ error: 'Debe ser un texto.' }).max(200, 'Es demasiado largo.').optional(),
  })
  .superRefine((datos, ctx) => {
    if (!datos.correo && !datos.telefono) {
      ctx.addIssue({
        code: 'custom',
        path: ['contacto'],
        message: 'Escribe tu correo o tu teléfono para que el párroco pueda responderte.',
      });
    }
  });

export const consultaObservaciones = paginacion.extend({
  estado: z
    .enum(['no-leidas', 'todas'], { error: 'Debe ser no-leidas o todas.' })
    .default('no-leidas'),
  proclamaId: id.optional(),
});

export const cuerpoMarcarObservacion = z.strictObject({
  leida: z.boolean({ error: 'Debe ser un booleano.' }),
});
