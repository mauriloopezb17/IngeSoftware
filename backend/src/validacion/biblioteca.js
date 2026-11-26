// Validación de la biblioteca multimedia (params, query y cuerpo del PATCH). Contrato: admin.md, sección 2.
import { z } from 'zod';
import '../config/zod.js';
import { booleanoQuery, esquemaListado, id, slug } from './comunes.js';
import { textoAlternativo } from './multimedia.js';

export const paramsArchivo = z.object({ id });

export const consultaBiblioteca = esquemaListado({
  filtros: {
    sede: slug.optional(),
    clase: z
      .enum(['IMAGEN', 'VIDEO', 'DOCUMENTO'], { error: 'Debe ser IMAGEN, VIDEO o DOCUMENTO.' })
      .optional(),
    enUso: booleanoQuery.optional(),
  },
  ordenes: ['fechaSubida', '-fechaSubida', 'tamanoBytes', '-tamanoBytes'],
  ordenPredeterminado: '-fechaSubida',
});

// PATCH: solo textoAlternativo (null o vacío lo borra); cualquier otro campo es 400.
export const cuerpoEditar = z.strictObject({
  textoAlternativo: textoAlternativo.nullable(),
});
