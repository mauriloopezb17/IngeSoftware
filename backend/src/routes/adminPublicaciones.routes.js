// Publicaciones en /api/admin/publicaciones (contrato: docs/api/admin.md, sección 3).
// Ya pasó por autenticar. Los permisos dependen del tipo, del estado y del autor de cada
// publicación (estados-publicacion.md): los comprueba el servicio, no un requerirPermiso fijo.
import { Router } from 'express';
import * as controlador from '../controllers/adminPublicaciones.controller.js';
import { filtrarPorSede } from '../middlewares/autorizar.js';
import { validar } from '../middlewares/validar.js';
import {
  consultaPublicaciones,
  cuerpoCrearPublicacion,
  cuerpoEditarPublicacion,
  paramsPublicacion,
} from '../validacion/publicaciones.js';

const router = Router();

const params = paramsPublicacion;

router.get('/', validar({ query: consultaPublicaciones }), filtrarPorSede, controlador.listar);
router.get('/:id', validar({ params }), controlador.detalle);
router.post('/', validar({ body: cuerpoCrearPublicacion }), controlador.crear);
router.patch('/:id', validar({ params, body: cuerpoEditarPublicacion }), controlador.editar);
router.delete('/:id', validar({ params }), controlador.eliminar);

export default router;
