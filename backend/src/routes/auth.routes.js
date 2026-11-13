// Rutas de sesión del panel (contrato: docs/api/autenticacion.md).
//   POST /api/auth/login
import { Router } from 'express';
import * as auth from '../controllers/auth.controller.js';
import { validar } from '../middlewares/validar.js';
import { cuerpoLogin } from '../validacion/auth.js';

const router = Router();

router.post('/login', validar({ body: cuerpoLogin }), auth.login);

export default router;
