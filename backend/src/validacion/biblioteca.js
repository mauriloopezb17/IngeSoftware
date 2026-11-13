// Validación de la biblioteca multimedia (params, query y cuerpo del PATCH). Contrato: admin.md, sección 2.
import { z } from 'zod';
import '../config/zod.js';
import { booleanoQuery, id, paginacion, slug } from './comunes.js';
import { textoAlternativo } from './multimedia.js';

export const paramsArchivo = z.object({ id });

export const consultaBiblioteca = paginacion.extend({
  sede: slug.optional(),
  clase: z
    .enum(['IMAGEN', 'VIDEO', 'DOCUMENTO'], { error: 'Debe ser IMAGEN, VIDEO o DOCUMENTO.' })
    .optional(),
  buscar: z
    .string()
    .trim()
    .min(1, 'No puede estar vacío.')
    .max(100, 'Es demasiado largo.')
    .optional(),
  enUso: booleanoQuery.optional(),
  orden: z
    .enum(['fechaSubida', '-fechaSubida', 'tamanoBytes', '-tamanoBytes'], {
      error: 'Debe ser fechaSubida, -fechaSubida, tamanoBytes o -tamanoBytes.',
    })
    .optional(),
});

// PATCH: solo textoAlternativo (null o vacío lo borra); cualquier otro campo es 400.
export const cuerpoEditar = z.strictObject({
  textoAlternativo: textoAlternativo.nullable(),
});
