// Gestión de usuarios (/api/admin/usuarios). Contrato: docs/api/admin.md §14.
import { Router } from 'express';
import { PERMISOS } from '../constantes/permisos.js';
import * as controlador from '../controllers/adminUsuarios.controller.js';
import { exportarRecurso } from '../controllers/exportar.controller.js';
import { filtrarPorSede, requerirAlgunPermiso, requerirPermiso } from '../middlewares/autorizar.js';
import { marcarConsulta } from '../middlewares/registrarConsulta.js';
import { validar } from '../middlewares/validar.js';
import { esquemaExportacion } from '../validacion/comunes.js';
import {
  consultaUsuarios,
  cuerpoCrearUsuario,
  cuerpoEditarUsuario,
  cuerpoRestablecerContrasena,
  paramsUsuario,
} from '../validacion/adminUsuarios.js';

const router = Router();
const gestionar = requerirPermiso(
  PERMISOS.USUARIOS_GESTIONAR,
  'Solo un administrador puede gestionar usuarios.',
);

router.get(
  '/',
  requerirAlgunPermiso(
    [PERMISOS.USUARIOS_GESTIONAR, PERMISOS.USUARIOS_EXPORTAR],
    'Tu rol no tiene permiso para consultar usuarios.',
  ),
  validar({ query: consultaUsuarios }),
  filtrarPorSede,
  controlador.listar,
);
router.get(
  '/exportar',
  requerirPermiso(PERMISOS.USUARIOS_EXPORTAR),
  marcarConsulta('exportacion'),
  validar({ query: esquemaExportacion(consultaUsuarios) }),
  filtrarPorSede,
  exportarRecurso('usuarios'),
);
router.get('/:id', gestionar, validar({ params: paramsUsuario }), controlador.detalle);
router.post('/', gestionar, validar({ body: cuerpoCrearUsuario }), controlador.crear);
router.patch(
  '/:id',
  gestionar,
  validar({ params: paramsUsuario, body: cuerpoEditarUsuario }),
  controlador.editar,
);
router.post(
  '/:id/restablecer-contrasena',
  gestionar,
  validar({ params: paramsUsuario, body: cuerpoRestablecerContrasena }),
  controlador.restablecerContrasena,
);

export default router;
