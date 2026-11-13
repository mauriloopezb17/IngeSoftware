// Gestión de videos de YouTube (/api/admin/videos). Contrato: docs/api/admin.md §8.
import { Router } from 'express';
import { PERMISOS } from '../constantes/permisos.js';
import * as controlador from '../controllers/adminVideos.controller.js';
import { filtrarPorSede, requerirPermiso } from '../middlewares/autorizar.js';
import { validar } from '../middlewares/validar.js';
import {
  consultaVideos,
  cuerpoCrearVideo,
  cuerpoEditarVideo,
  cuerpoReordenarVideos,
  paramsVideo,
} from '../validacion/adminVideos.js';

const router = Router();
const exigirPermiso = requerirPermiso(
  PERMISOS.VIDEOS_GESTIONAR,
  'Tu rol no tiene permiso para gestionar videos.',
);

router.get('/', validar({ query: consultaVideos }), filtrarPorSede, controlador.listar);
router.post(
  '/reordenar',
  exigirPermiso,
  validar({ body: cuerpoReordenarVideos }),
  controlador.reordenar,
);
router.get('/:id', validar({ params: paramsVideo }), controlador.detalle);

router.post('/', exigirPermiso, validar({ body: cuerpoCrearVideo }), controlador.crear);
router.patch(
  '/:id',
  exigirPermiso,
  validar({ params: paramsVideo, body: cuerpoEditarVideo }),
  controlador.editar,
);
router.delete('/:id', exigirPermiso, validar({ params: paramsVideo }), controlador.eliminar);

export default router;
