// Rutas de publicaciones de una sede (se montan en /api/sedes/:sede/publicaciones).
import { Router } from 'express';
import { z } from 'zod';
import { TIPOS_PUBLICACION } from '../constantes/catalogos.js';
import * as publicaciones from '../controllers/publicaciones.controller.js';
import { validar } from '../middlewares/validar.js';
import { booleanoQuery, listaCodigos, paginacion, slug } from '../validacion/comunes.js';

const consultaLista = paginacion.extend({
  tipo: listaCodigos([...TIPOS_PUBLICACION.codigos]).optional(),
  categoria: slug.optional(),
  destacada: booleanoQuery.optional(),
  buscar: z
    .string()
    .trim()
    .min(2, 'Escribe al menos 2 caracteres.')
    .max(100, 'Escribe hasta 100 caracteres.')
    .optional(),
  orden: z
    .enum(['fechaPublicacion', '-fechaPublicacion'], {
      error: 'Debe ser fechaPublicacion o -fechaPublicacion.',
    })
    .default('-fechaPublicacion'),
});

const router = Router({ mergeParams: true });

router.get('/', validar({ query: consultaLista }), publicaciones.listar);
router.get('/:slug', publicaciones.detalle);

export default router;
