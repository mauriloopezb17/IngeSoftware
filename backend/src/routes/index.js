import { Router } from 'express';
import catalogosRoutes from './catalogos.routes.js';
import saludRoutes from './salud.routes.js';
import sedesRoutes from './sedes.routes.js';

const router = Router();

// Cada módulo registra aquí sus rutas bajo el prefijo /api.
router.use('/salud', saludRoutes);
router.use('/sedes', sedesRoutes);
router.use(catalogosRoutes);

export default router;
