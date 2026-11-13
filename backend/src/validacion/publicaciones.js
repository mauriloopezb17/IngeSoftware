// Validación de /api/admin/publicaciones (contrato: docs/api/admin.md, sección 3).
import { z } from 'zod';
import '../config/zod.js';
import { ESTADOS_PUBLICACION, TIPOS_PUBLICACION } from '../constantes/catalogos.js';
import { contenidoBlockNote } from './blocknote.js';
import { fechaHoraConZona, id, listaCodigos, paginacion, slug } from './comunes.js';
import { idDelCuerpo, textoOpcional, urlHttps } from './panel.js';

export const paramsPublicacion = z.object({ id });

export const consultaPublicaciones = paginacion.extend({
  sede: slug.optional(),
  tipo: listaCodigos([...TIPOS_PUBLICACION.codigos]).optional(),
  estado: listaCodigos([...ESTADOS_PUBLICACION.codigos]).optional(),
  categoria: slug.optional(),
  autor: z
    .union([z.literal('yo'), id], { error: 'Debe ser el id de un usuario o «yo».' })
    .optional(),
  buscar: z
    .string()
    .trim()
    .min(1, 'No puede estar vacío.')
    .max(100, 'Es demasiado largo.')
    .optional(),
  orden: z
    .enum(
      [
        'fechaCreacion',
        '-fechaCreacion',
        'fechaPublicacion',
        '-fechaPublicacion',
        'titulo',
        '-titulo',
      ],
      {
        error:
          'Debe ser fechaCreacion, -fechaCreacion, fechaPublicacion, -fechaPublicacion, titulo o -titulo.',
      },
    )
    .default('-fechaCreacion'),
});

const titulo = z
  .string({ error: 'Debe ser un texto.' })
  .trim()
  .min(3, 'Debe tener de 3 a 200 caracteres.')
  .max(200, 'Debe tener de 3 a 200 caracteres.');

// Campos editables (los de la creación, salvo el tipo y la sede).
const campos = {
  titulo,
  slug: slug.nullable().optional(),
  resumen: textoOpcional(400),
  categoriaId: idDelCuerpo.nullable().optional(),
  imagenPortadaId: idDelCuerpo.nullable().optional(),
  contenido: contenidoBlockNote,
  urlExterna: urlHttps(500).nullable().optional(),
  destacada: z.boolean({ error: 'Debe ser true o false.' }),
  fechaPublicacion: fechaHoraConZona.nullable().optional(),
  fechaExpiracion: fechaHoraConZona.nullable().optional(),
};

// La expiración, si viene junto con la publicación, debe ser posterior.
const fechasEnOrden = ({ fechaPublicacion, fechaExpiracion }) =>
  !fechaPublicacion || !fechaExpiracion || new Date(fechaExpiracion) > new Date(fechaPublicacion);
const MENSAJE_EXPIRACION = 'Debe ser posterior a la fecha de publicación.';

export const cuerpoCrearPublicacion = z
  .strictObject({
    tipo: z.enum([...TIPOS_PUBLICACION.codigos], {
      error: 'Debe ser AVISO, NOTICIA o NOTA_DE_PRENSA.',
    }),
    sedeId: idDelCuerpo.optional(),
    ...campos,
    destacada: campos.destacada.default(false),
  })
  .refine(fechasEnOrden, { path: ['fechaExpiracion'], message: MENSAJE_EXPIRACION });

export const cuerpoEditarPublicacion = z
  .strictObject({
    tipo: z.never({ error: 'El tipo no se puede cambiar.' }).optional(),
    titulo: campos.titulo.optional(),
    slug: campos.slug,
    resumen: campos.resumen,
    categoriaId: campos.categoriaId,
    imagenPortadaId: campos.imagenPortadaId,
    contenido: campos.contenido.optional(),
    urlExterna: campos.urlExterna,
    destacada: campos.destacada.optional(),
    fechaPublicacion: campos.fechaPublicacion,
    fechaExpiracion: campos.fechaExpiracion,
  })
  .refine(fechasEnOrden, { path: ['fechaExpiracion'], message: MENSAJE_EXPIRACION });
