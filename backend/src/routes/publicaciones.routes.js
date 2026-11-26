// Rutas de publicaciones de una sede (se montan en /api/sedes/:sede/publicaciones).
import { Router } from 'express';
import { TIPOS_PUBLICACION } from '../constantes/catalogos.js';
import * as publicaciones from '../controllers/publicaciones.controller.js';
import { validar } from '../middlewares/validar.js';
import {
  booleanoQuery,
  buscarTexto,
  esquemaListado,
  listaCodigos,
  slug,
} from '../validacion/comunes.js';

const consultaLista = esquemaListado({
  filtros: {
    tipo: listaCodigos([...TIPOS_PUBLICACION.codigos]).optional(),
    categoria: slug.optional(),
    destacada: booleanoQuery.optional(),
    buscar: buscarTexto.min(2, 'Escribe al menos 2 caracteres.').optional(),
  },
  ordenes: ['fechaPublicacion', '-fechaPublicacion'],
  ordenPredeterminado: '-fechaPublicacion',
});

const router = Router({ mergeParams: true });

router.get('/', validar({ query: consultaLista }), publicaciones.listar);
router.get('/:slug', publicaciones.detalle);

export default router;
