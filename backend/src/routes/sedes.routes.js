// Rutas públicas de sedes (contrato: docs/api/publico.md).
//   GET /api/sedes
//   GET /api/sedes/:sede            y todo lo que cuelga de una sede (horarios, servicios, …)
import { Router } from 'express';
import { z } from 'zod';
import * as pastoral from '../controllers/contenidoPastoral.controller.js';
import * as horarios from '../controllers/horarios.controller.js';
import * as paginas from '../controllers/paginas.controller.js';
import * as proclamasBoletines from '../controllers/proclamasBoletines.controller.js';
import * as sedes from '../controllers/sedes.controller.js';
import { resolverSede } from '../middlewares/resolverSede.js';
import { validar } from '../middlewares/validar.js';
import { anio, listaIds, paginacion } from '../validacion/comunes.js';
import eventosRoutes from './eventos.routes.js';
import publicacionesRoutes from './publicaciones.routes.js';

// Historial de proclamas y boletines: paginación más filtro opcional por año.
const consultaPorAnio = paginacion.extend({ anio: anio.optional() });

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
deSede.use('/eventos', eventosRoutes);
deSede.get('/proclamas', proclamasBoletines.listarProclamasVigentes);
deSede.get(
  '/proclamas/historial',
  validar({ query: consultaPorAnio }),
  proclamasBoletines.listarHistorialProclamas,
);
deSede.get('/boletines', validar({ query: consultaPorAnio }), proclamasBoletines.listarBoletines);
deSede.get('/paginas', paginas.listar);
deSede.get('/paginas/:slug', paginas.detalle);

router.use('/:sede', resolverSede, deSede);

export default router;
