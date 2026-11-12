// Rutas públicas de sedes (contrato: docs/api/publico.md).
//   GET /api/sedes
//   GET /api/sedes/:sede            y todo lo que cuelga de una sede (horarios, servicios, …)
import { Router } from 'express';
import * as sedes from '../controllers/sedes.controller.js';
import { resolverSede } from '../middlewares/resolverSede.js';

const router = Router();

router.get('/', sedes.listar);

// Rutas de una sede: resolverSede deja la sede activa en req.sede o responde 404.
const deSede = Router({ mergeParams: true });
deSede.get('/', sedes.detalle);

router.use('/:sede', resolverSede, deSede);

export default router;
