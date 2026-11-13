// Proclamas en /api/admin/proclamas (contrato: docs/api/admin.md, sección 10). Ya pasó por
// autenticar. Leer lo puede cualquier rol de la sede; escribir pide proclamas.gestionar.
import { Router } from 'express';
import { PERMISOS } from '../constantes/permisos.js';
import * as controlador from '../controllers/adminProclamas.controller.js';
import { filtrarPorSede, requerirPermiso } from '../middlewares/autorizar.js';
import { validar } from '../middlewares/validar.js';
import {
  consultaProclamas,
  cuerpoCrearProclama,
  cuerpoEditarProclama,
  cuerpoPublicacionProclama,
  paramsProclama as params,
  paramsPublicacionProclama,
} from '../validacion/proclamas.js';

const router = Router();
const gestionar = requerirPermiso(PERMISOS.PROCLAMAS_GESTIONAR);

router.get('/', validar({ query: consultaProclamas }), filtrarPorSede, controlador.listar);
router.get('/:id', validar({ params }), controlador.detalle);
router.post('/', gestionar, validar({ body: cuerpoCrearProclama }), controlador.crear);
router.patch(
  '/:id',
  gestionar,
  validar({ params, body: cuerpoEditarProclama }),
  controlador.editar,
);
router.delete('/:id', gestionar, validar({ params }), controlador.eliminar);

router.post(
  '/:id/publicaciones',
  gestionar,
  validar({ params, body: cuerpoPublicacionProclama }),
  controlador.agregarPublicacion,
);
router.patch(
  '/:id/publicaciones/:numero',
  gestionar,
  validar({ params: paramsPublicacionProclama, body: cuerpoPublicacionProclama }),
  controlador.cambiarPublicacion,
);
router.delete(
  '/:id/publicaciones/:numero',
  gestionar,
  validar({ params: paramsPublicacionProclama }),
  controlador.quitarPublicacion,
);

export default router;
