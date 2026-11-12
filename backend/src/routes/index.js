import { Router } from 'express';
import saludRoutes from './salud.routes.js';
import sedesRoutes from './sedes.routes.js';

const router = Router();

// Cada módulo registra aquí sus rutas bajo el prefijo /api.
router.use('/salud', saludRoutes);
router.use('/sedes', sedesRoutes);

export default router;
