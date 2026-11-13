// Rutas de eventos de una sede (se montan en /api/sedes/:sede/eventos).
import { Router } from 'express';
import * as eventos from '../controllers/eventos.controller.js';
import { validar } from '../middlewares/validar.js';
import { fecha, listaIds, paginacion } from '../validacion/comunes.js';

const consultaLista = paginacion
  .extend({
    desde: fecha.optional(),
    hasta: fecha.optional(),
    categoria: listaIds.optional(),
  })
  .refine(({ desde, hasta }) => !desde || !hasta || hasta >= desde, {
    path: ['hasta'],
    message: 'Debe ser igual o posterior a desde.',
  });

const router = Router({ mergeParams: true });

router.get('/', validar({ query: consultaLista }), eventos.listar);

export default router;
