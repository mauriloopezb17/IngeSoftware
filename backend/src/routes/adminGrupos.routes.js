// Gestión de grupos pastorales (/api/admin/grupos-pastorales). Contrato: docs/api/admin.md §7.
import { Router } from 'express';
import { PERMISOS } from '../constantes/permisos.js';
import * as controlador from '../controllers/adminGrupos.controller.js';
import { filtrarPorSede, requerirPermiso } from '../middlewares/autorizar.js';
import { validar } from '../middlewares/validar.js';
import {
  consultaGrupos,
  cuerpoCrearGrupo,
  cuerpoEditarGrupo,
  cuerpoReordenarGrupos,
  paramsGrupo,
} from '../validacion/adminGrupos.js';

const router = Router();
const exigirPermiso = requerirPermiso(
  PERMISOS.GRUPOS_GESTIONAR,
  'Tu rol no tiene permiso para gestionar grupos pastorales.',
);

router.get('/', validar({ query: consultaGrupos }), filtrarPorSede, controlador.listar);
router.post(
  '/reordenar',
  exigirPermiso,
  validar({ body: cuerpoReordenarGrupos }),
  controlador.reordenar,
);
router.get('/:id', validar({ params: paramsGrupo }), controlador.detalle);

router.post('/', exigirPermiso, validar({ body: cuerpoCrearGrupo }), controlador.crear);
router.patch(
  '/:id',
  exigirPermiso,
  validar({ params: paramsGrupo, body: cuerpoEditarGrupo }),
  controlador.editar,
);
router.delete('/:id', exigirPermiso, validar({ params: paramsGrupo }), controlador.eliminar);

export default router;
