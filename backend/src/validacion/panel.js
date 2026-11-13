// Esquemas que comparten los cuerpos de los endpoints del panel (/api/admin/...).
// Los de query y params (que siempre llegan como texto) están en comunes.js.
import { z } from 'zod';
import '../config/zod.js';
import { ESTADOS_PUBLICACION } from '../constantes/catalogos.js';

const ENTERO_MAXIMO_PG = 2_147_483_647;

// Referencia a otro recurso en el cuerpo (ej. "categoriaId": 2). En JSON ya es un número.
export const idDelCuerpo = z
  .number({ error: 'Debe ser un número.' })
  .int('Debe ser un número entero.')
  .positive('Debe ser un número positivo.')
  .max(ENTERO_MAXIMO_PG, 'El número es demasiado grande.');

// Texto obligatorio, sin espacios a los lados, de 1 a "maximo" caracteres.
export const textoObligatorio = (maximo) =>
  z
    .string({ error: 'Debe ser un texto.' })
    .trim()
    .min(1, 'Es obligatorio.')
    .max(maximo, `Puede tener hasta ${maximo} caracteres.`);

// Texto opcional: null o "" lo dejan vacío (null).
export const textoOpcional = (maximo) =>
  z
    .string({ error: 'Debe ser un texto.' })
    .trim()
    .max(maximo, `Puede tener hasta ${maximo} caracteres.`)
    .transform((valor) => (valor === '' ? null : valor))
    .nullable()
    .optional();

// URL https:// de hasta "maximo" caracteres.
export const urlHttps = (maximo) =>
  z
    .string({ error: 'Debe ser un texto.' })
    .trim()
    .max(maximo, `Puede tener hasta ${maximo} caracteres.`)
    .refine((valor) => {
      if (!/^https:\/\/\S+$/i.test(valor)) return false;
      try {
        return new URL(valor).protocol === 'https:';
      } catch {
        return false;
      }
    }, 'Debe ser una URL que empiece con https://.');

// Estado de los recursos que se publican sin revisión (eventos y páginas): EN_REVISION no vale.
export const estadoSinRevision = z.enum(
  ESTADOS_PUBLICACION.codigos.filter((codigo) => codigo !== 'EN_REVISION'),
  { error: 'Debe ser BORRADOR, PUBLICADO o ARCHIVADO.' },
);
