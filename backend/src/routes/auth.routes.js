// Rutas de sesión del panel (contrato: docs/api/autenticacion.md).
//   POST /api/auth/login
//   POST /api/auth/logout
//   GET  /api/auth/yo
//   POST /api/auth/cambiar-contrasena
import { Router } from 'express';
import * as auth from '../controllers/auth.controller.js';
import { autenticar } from '../middlewares/autenticar.js';
import { validar } from '../middlewares/validar.js';
import { cuerpoCambiarContrasena, cuerpoLogin } from '../validacion/auth.js';

const router = Router();

router.post('/login', validar({ body: cuerpoLogin }), auth.login);
router.post('/logout', auth.logout);
router.get('/yo', autenticar, auth.yo);
router.post(
  '/cambiar-contrasena',
  autenticar,
  validar({ body: cuerpoCambiarContrasena }),
  auth.cambiarContrasena,
);

export default router;
