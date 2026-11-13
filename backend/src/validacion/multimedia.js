// Validación de los campos de texto del formulario de subida (multipart). Contrato: admin.md, sección 2.
import { z } from 'zod';
import '../config/zod.js';
import { LARGO_MAXIMO_TEXTO_ALTERNATIVO } from '../constantes/multimedia.js';
import { id } from './comunes.js';

export const textoAlternativo = z
  .string()
  .trim()
  .max(
    LARGO_MAXIMO_TEXTO_ALTERNATIVO,
    `El texto alternativo puede tener hasta ${LARGO_MAXIMO_TEXTO_ALTERNATIVO} caracteres.`,
  )
  // Un campo vacío es lo mismo que no mandarlo.
  .transform((texto) => (texto === '' ? null : texto));

// Los campos que no están aquí se ignoran (multipart no tiene "campos no permitidos").
export const cuerpoSubida = z.object({
  textoAlternativo: textoAlternativo.optional().default(null),
  sedeId: id.optional(),
});
