import { Router } from 'express';

const router = Router();

// GET /api/salud — indica que la API está en ejecución.
router.get('/', (_req, res) => {
  res.json({
    estado: 'ok',
    servicio: 'api-parroquia',
    fecha: new Date().toISOString(),
  });
});

export default router;
