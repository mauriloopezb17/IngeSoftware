// Publicaciones en /api/admin/publicaciones (contrato: docs/api/admin.md, sección 3).
// Ya pasó por autenticar. Los permisos dependen del tipo, del estado y del autor de cada
// publicación (estados-publicacion.md): los comprueba el servicio, no un requerirPermiso fijo.
import { Router } from 'express';
import * as controlador from '../controllers/adminPublicaciones.controller.js';
import * as estado from '../controllers/estadoPublicaciones.controller.js';
import { filtrarPorSede } from '../middlewares/autorizar.js';
import { validar } from '../middlewares/validar.js';
import {
  consultaPublicaciones,
  cuerpoAprobar,
  cuerpoCrearPublicacion,
  cuerpoEditarPublicacion,
  cuerpoPublicar,
  cuerpoRechazar,
  paramsPublicacion,
} from '../validacion/publicaciones.js';

const router = Router();

const params = paramsPublicacion;

router.get('/', validar({ query: consultaPublicaciones }), filtrarPorSede, controlador.listar);
router.get('/:id', validar({ params }), controlador.detalle);
router.post('/', validar({ body: cuerpoCrearPublicacion }), controlador.crear);
router.patch('/:id', validar({ params, body: cuerpoEditarPublicacion }), controlador.editar);
router.delete('/:id', validar({ params }), controlador.eliminar);

// Acciones de estado (estados-publicacion.md): el servicio comprueba rol, estado y requisitos.
router.post('/:id/enviar-revision', validar({ params }), estado.enviarRevision);
router.post('/:id/aprobar', validar({ params, body: cuerpoAprobar }), estado.aprobar);
router.post('/:id/rechazar', validar({ params, body: cuerpoRechazar }), estado.rechazar);
router.post('/:id/publicar', validar({ params, body: cuerpoPublicar }), estado.publicar);
router.post('/:id/archivar', validar({ params }), estado.archivar);
router.post('/:id/restaurar', validar({ params }), estado.restaurar);

export default router;
