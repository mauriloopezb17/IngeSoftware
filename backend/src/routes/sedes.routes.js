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
import { limitarObservaciones } from '../middlewares/limiteObservaciones.js';
import { validar } from '../middlewares/validar.js';
import { anio, booleanoQuery, esquemaListado, id, listaIds } from '../validacion/comunes.js';
import { cuerpoCrearObservacion } from '../validacion/proclamas.js';
import eventosRoutes from './eventos.routes.js';
import publicacionesRoutes from './publicaciones.routes.js';

const consultaPorAnio = esquemaListado({
  filtros: { anio: anio.optional() },
  porPaginaMaximo: 100,
});
const consultaHorariosPortal = esquemaListado({
  conBuscar: true,
  filtros: { tipo: listaIds.optional() },
  ordenes: ['tipo'],
  ordenPredeterminado: 'tipo',
  porPaginaMaximo: 100,
});
const consultaPastoralPortal = esquemaListado({
  conBuscar: true,
  ordenes: ['orden', '-orden', 'nombre', '-nombre'],
  ordenPredeterminado: 'orden',
  porPaginaMaximo: 100,
});
const consultaVideosPortal = esquemaListado({
  conBuscar: true,
  filtros: { destacado: booleanoQuery.optional() },
  ordenes: ['orden', '-orden', 'fechaPublicacion', '-fechaPublicacion', 'titulo', '-titulo'],
  ordenPredeterminado: 'orden',
  porPaginaMaximo: 100,
});
const consultaProclamasVigentes = esquemaListado({
  conBuscar: true,
  filtros: { anio: anio.optional() },
  ordenes: ['fechaMatrimonio', '-fechaMatrimonio'],
  ordenPredeterminado: 'fechaMatrimonio',
  porPaginaMaximo: 100,
});

const router = Router();

router.get('/', sedes.listar);

// Rutas de una sede: resolverSede deja la sede activa en req.sede o responde 404.
const deSede = Router({ mergeParams: true });
deSede.get('/', sedes.detalle);
deSede.get('/horarios', validar({ query: consultaHorariosPortal }), horarios.listar);
deSede.get('/servicios', validar({ query: consultaPastoralPortal }), pastoral.listarServicios);
deSede.get('/servicios/:slug', pastoral.detalleServicio);
deSede.get(
  '/grupos-pastorales',
  validar({ query: consultaPastoralPortal }),
  pastoral.listarGruposPastorales,
);
deSede.get('/videos', validar({ query: consultaVideosPortal }), pastoral.listarVideos);
deSede.use('/publicaciones', publicacionesRoutes);
deSede.use('/eventos', eventosRoutes);
deSede.get(
  '/proclamas',
  validar({ query: consultaProclamasVigentes }),
  proclamasBoletines.listarProclamasVigentes,
);
deSede.get(
  '/proclamas/historial',
  validar({ query: consultaPorAnio }),
  proclamasBoletines.listarHistorialProclamas,
);
deSede.get(
  '/proclamas/:id',
  validar({ params: z.object({ id }) }),
  proclamasBoletines.detalleProclama,
);
deSede.get(
  '/proclamas/:id/observaciones/verificacion',
  validar({ params: z.object({ id }) }),
  proclamasBoletines.verificacionObservacion,
);
deSede.post(
  '/proclamas/:id/observaciones',
  limitarObservaciones,
  validar({ params: z.object({ id }), body: cuerpoCrearObservacion }),
  proclamasBoletines.crearObservacion,
);
deSede.get('/boletines', validar({ query: consultaPorAnio }), proclamasBoletines.listarBoletines);
deSede.get('/paginas', paginas.listar);
deSede.get('/paginas/:slug', paginas.detalle);

router.use('/:sede', resolverSede, deSede);

export default router;
