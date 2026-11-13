// Gestión de sedes y redes sociales (/api/admin/sedes). Contrato: docs/api/admin.md §9.
import { Router } from 'express';
import { PERMISOS } from '../constantes/permisos.js';
import * as controlador from '../controllers/adminSedes.controller.js';
import { requerirPermiso } from '../middlewares/autorizar.js';
import { validar } from '../middlewares/validar.js';
import { cuerpoCrearSede, cuerpoEditarSede, paramsSede } from '../validacion/adminSedes.js';

const router = Router();

router.get('/', controlador.listar);
router.get('/:id', validar({ params: paramsSede }), controlador.detalle);

router.post(
  '/',
  requerirPermiso(PERMISOS.SEDES_GESTIONAR, 'Solo un administrador puede crear sedes.'),
  validar({ body: cuerpoCrearSede }),
  controlador.crear,
);

router.patch('/:id', validar({ params: paramsSede, body: cuerpoEditarSede }), controlador.editar);

export default router;
