// Gestión de servicios y preguntas frecuentes (/api/admin/servicios). Contrato: docs/api/admin.md §6.
import { Router } from 'express';
import { PERMISOS } from '../constantes/permisos.js';
import * as controlador from '../controllers/adminServicios.controller.js';
import { filtrarPorSede, requerirPermiso } from '../middlewares/autorizar.js';
import { validar } from '../middlewares/validar.js';
import {
  consultaServicios,
  cuerpoCrearPregunta,
  cuerpoCrearServicio,
  cuerpoEditarPregunta,
  cuerpoEditarServicio,
  cuerpoReordenar,
  paramsPregunta,
  paramsServicio,
} from '../validacion/adminServicios.js';

const router = Router();
const exigirPermiso = requerirPermiso(
  PERMISOS.SERVICIOS_GESTIONAR,
  'Tu rol no tiene permiso para gestionar servicios.',
);

router.get('/', validar({ query: consultaServicios }), filtrarPorSede, controlador.listar);
router.post('/reordenar', exigirPermiso, validar({ body: cuerpoReordenar }), controlador.reordenar);
router.get('/:id', validar({ params: paramsServicio }), controlador.detalle);

router.post('/', exigirPermiso, validar({ body: cuerpoCrearServicio }), controlador.crear);
router.patch(
  '/:id',
  exigirPermiso,
  validar({ params: paramsServicio, body: cuerpoEditarServicio }),
  controlador.editar,
);
router.delete('/:id', exigirPermiso, validar({ params: paramsServicio }), controlador.eliminar);

router.post(
  '/:id/preguntas-frecuentes',
  exigirPermiso,
  validar({ params: paramsServicio, body: cuerpoCrearPregunta }),
  controlador.crearPregunta,
);
router.post(
  '/:id/preguntas-frecuentes/reordenar',
  exigirPermiso,
  validar({ params: paramsServicio, body: cuerpoReordenar }),
  controlador.reordenarPreguntas,
);
router.patch(
  '/:id/preguntas-frecuentes/:preguntaId',
  exigirPermiso,
  validar({ params: paramsPregunta, body: cuerpoEditarPregunta }),
  controlador.editarPregunta,
);
router.delete(
  '/:id/preguntas-frecuentes/:preguntaId',
  exigirPermiso,
  validar({ params: paramsPregunta }),
  controlador.eliminarPregunta,
);

export default router;
