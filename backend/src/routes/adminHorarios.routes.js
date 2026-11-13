// Gestión de horarios en el panel CMS (/api/admin/horarios). Contrato: docs/api/admin.md, sección 5.
import { Router } from 'express';
import { PERMISOS } from '../constantes/permisos.js';
import * as controlador from '../controllers/adminHorarios.controller.js';
import { filtrarPorSede, requerirPermiso } from '../middlewares/autorizar.js';
import { validar } from '../middlewares/validar.js';
import {
  consultaHorarios,
  cuerpoCrearHorario,
  cuerpoEditarHorario,
  paramsHorario,
} from '../validacion/adminHorarios.js';

const router = Router();

router.get('/', validar({ query: consultaHorarios }), filtrarPorSede, controlador.listar);
router.get('/:id', validar({ params: paramsHorario }), controlador.detalle);

router.post(
  '/',
  requerirPermiso(PERMISOS.HORARIOS_GESTIONAR, 'Tu rol no tiene permiso para gestionar horarios.'),
  validar({ body: cuerpoCrearHorario }),
  controlador.crear,
);

router.patch(
  '/:id',
  requerirPermiso(PERMISOS.HORARIOS_GESTIONAR, 'Tu rol no tiene permiso para gestionar horarios.'),
  validar({ params: paramsHorario, body: cuerpoEditarHorario }),
  controlador.editar,
);

router.delete(
  '/:id',
  requerirPermiso(PERMISOS.HORARIOS_GESTIONAR, 'Tu rol no tiene permiso para gestionar horarios.'),
  validar({ params: paramsHorario }),
  controlador.eliminar,
);

export default router;
