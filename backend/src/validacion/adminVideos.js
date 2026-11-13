// Validación de videos de YouTube en el panel CMS (docs/api/admin.md, sección 8).
import { z } from 'zod';
import '../config/zod.js';
import { booleanoQuery, fecha, id, slug } from './comunes.js';

const ENTERO_MAXIMO_PG = 2_147_483_647;
const REGEX_YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

const idEntero = z
  .number({ error: 'Debe ser un número entero.' })
  .int('Debe ser un número entero.')
  .positive('Debe ser un número positivo.')
  .max(ENTERO_MAXIMO_PG, 'El número es demasiado grande.');

const vacioANulo = (valor) => (typeof valor === 'string' && valor.trim() === '' ? null : valor);

// Extrae el id de 11 caracteres desde un id directo o desde URLs de YouTube admitidas.
export function extraerYoutubeId(valor) {
  if (typeof valor !== 'string') return null;
  const limpio = valor.trim();
  if (REGEX_YOUTUBE_ID.test(limpio)) return limpio;

  let url;
  try {
    url = new URL(limpio);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  let candidato = null;
  if (host === 'youtu.be') {
    candidato = url.pathname.slice(1).split('/')[0];
  } else if (
    host === 'youtube.com' ||
    host === 'm.youtube.com' ||
    host === 'youtube-nocookie.com'
  ) {
    if (url.pathname === '/watch') {
      candidato = url.searchParams.get('v');
    } else if (
      url.pathname.startsWith('/shorts/') ||
      url.pathname.startsWith('/embed/') ||
      url.pathname.startsWith('/live/')
    ) {
      candidato = url.pathname.split('/')[2];
    }
  }

  return candidato && REGEX_YOUTUBE_ID.test(candidato) ? candidato : null;
}

const campoYoutube = z.string().transform((valor, ctx) => {
  const youtubeId = extraerYoutubeId(valor);
  if (!youtubeId) {
    ctx.addIssue({
      code: 'custom',
      message: 'Ingresa un identificador o URL válida de YouTube.',
    });
    return z.NEVER;
  }
  return youtubeId;
});

const tituloVideo = z
  .string()
  .trim()
  .min(1, 'El título es obligatorio.')
  .max(160, 'El título puede tener hasta 160 caracteres.');

const descripcionVideo = z.preprocess(
  vacioANulo,
  z.string().trim().max(2000, 'La descripción puede tener hasta 2000 caracteres.').nullable(),
);

const duracionSegundos = z
  .number({ error: 'Debe ser un número entero.' })
  .int('Debe ser un número entero.')
  .positive('Debe ser mayor a cero.')
  .max(ENTERO_MAXIMO_PG, 'El número es demasiado grande.');

export const paramsVideo = z.object({ id });

export const consultaVideos = z.object({
  sede: slug.optional(),
  destacado: booleanoQuery.optional(),
});

export const cuerpoCrearVideo = z.strictObject({
  sedeId: idEntero.nullable().optional(),
  youtube: campoYoutube,
  titulo: tituloVideo,
  descripcion: descripcionVideo.optional().default(null),
  duracionSegundos: duracionSegundos.nullable().optional().default(null),
  destacado: z.boolean().optional().default(false),
  fechaPublicacion: fecha.nullable().optional().default(null),
});

export const cuerpoEditarVideo = z.strictObject({
  youtube: campoYoutube.optional(),
  titulo: tituloVideo.optional(),
  descripcion: descripcionVideo.optional(),
  duracionSegundos: duracionSegundos.nullable().optional(),
  destacado: z.boolean().optional(),
  fechaPublicacion: fecha.nullable().optional(),
});

export const cuerpoReordenarVideos = z.strictObject({
  ids: z
    .array(idEntero)
    .refine(
      (lista) => new Set(lista).size === lista.length,
      'No puede haber identificadores repetidos.',
    ),
});
