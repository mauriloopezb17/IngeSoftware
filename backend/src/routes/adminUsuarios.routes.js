// Gestión de usuarios (/api/admin/usuarios). Contrato: docs/api/admin.md §14.
import { Router } from 'express';
import { PERMISOS } from '../constantes/permisos.js';
import * as controlador from '../controllers/adminUsuarios.controller.js';
import { requerirPermiso } from '../middlewares/autorizar.js';
import { validar } from '../middlewares/validar.js';
import {
  consultaUsuarios,
  cuerpoCrearUsuario,
  cuerpoEditarUsuario,
  cuerpoRestablecerContrasena,
  paramsUsuario,
} from '../validacion/adminUsuarios.js';

const router = Router();

router.use(
  requerirPermiso(PERMISOS.USUARIOS_GESTIONAR, 'Solo un administrador puede gestionar usuarios.'),
);

router.get('/', validar({ query: consultaUsuarios }), controlador.listar);
router.get('/:id', validar({ params: paramsUsuario }), controlador.detalle);
router.post('/', validar({ body: cuerpoCrearUsuario }), controlador.crear);
router.patch(
  '/:id',
  validar({ params: paramsUsuario, body: cuerpoEditarUsuario }),
  controlador.editar,
);
router.post(
  '/:id/restablecer-contrasena',
  validar({ params: paramsUsuario, body: cuerpoRestablecerContrasena }),
  controlador.restablecerContrasena,
);

export default router;
