// Rutas públicas de sedes (contrato: docs/api/publico.md).
//   GET /api/sedes
//   GET /api/sedes/:sede            y todo lo que cuelga de una sede (horarios, servicios, …)
import { Router } from 'express';
import { z } from 'zod';
import * as pastoral from '../controllers/contenidoPastoral.controller.js';
import * as horarios from '../controllers/horarios.controller.js';
import * as sedes from '../controllers/sedes.controller.js';
import { resolverSede } from '../middlewares/resolverSede.js';
import { validar } from '../middlewares/validar.js';
import { listaIds } from '../validacion/comunes.js';
import publicacionesRoutes from './publicaciones.routes.js';

const router = Router();

router.get('/', sedes.listar);

// Rutas de una sede: resolverSede deja la sede activa en req.sede o responde 404.
const deSede = Router({ mergeParams: true });
deSede.get('/', sedes.detalle);
deSede.get(
  '/horarios',
  validar({ query: z.object({ tipo: listaIds.optional() }) }),
  horarios.listar,
);
deSede.get('/servicios', pastoral.listarServicios);
deSede.get('/servicios/:slug', pastoral.detalleServicio);
deSede.get('/grupos-pastorales', pastoral.listarGruposPastorales);
deSede.get('/videos', pastoral.listarVideos);
deSede.use('/publicaciones', publicacionesRoutes);

router.use('/:sede', resolverSede, deSede);

export default router;
