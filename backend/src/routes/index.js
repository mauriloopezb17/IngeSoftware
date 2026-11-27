import { Router } from 'express';
import adminRoutes from './admin.routes.js';
import authRoutes from './auth.routes.js';
import buscarRoutes from './buscar.routes.js';
import catalogosRoutes from './catalogos.routes.js';
import saludRoutes from './salud.routes.js';
import sedesRoutes from './sedes.routes.js';
import { resolverSede } from '../middlewares/resolverSede.js';

const router = Router();

// Cada módulo registra aquí sus rutas bajo el prefijo /api.
router.use('/salud', saludRoutes);
router.use('/sedes/:sede/buscar', resolverSede, buscarRoutes);
router.use('/sedes', sedesRoutes);
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use(catalogosRoutes);

export default router;
