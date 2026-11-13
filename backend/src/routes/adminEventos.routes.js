// Eventos en /api/admin/eventos (contrato: docs/api/admin.md, sección 4). Ya pasó por autenticar.
// Leer lo puede cualquier rol de la sede; escribir pide eventos.gestionar.
import { Router } from 'express';
import { PERMISOS } from '../constantes/permisos.js';
import * as controlador from '../controllers/adminEventos.controller.js';
import { filtrarPorSede, requerirPermiso } from '../middlewares/autorizar.js';
import { validar } from '../middlewares/validar.js';
import {
  consultaEventos,
  cuerpoCrearEvento,
  cuerpoEditarEvento,
  paramsEvento as params,
} from '../validacion/eventos.js';

const router = Router();
const gestionar = requerirPermiso(PERMISOS.EVENTOS_GESTIONAR);

router.get('/', validar({ query: consultaEventos }), filtrarPorSede, controlador.listar);
router.get('/:id', validar({ params }), controlador.detalle);
router.post('/', gestionar, validar({ body: cuerpoCrearEvento }), controlador.crear);
router.patch('/:id', gestionar, validar({ params, body: cuerpoEditarEvento }), controlador.editar);
router.delete('/:id', gestionar, validar({ params }), controlador.eliminar);

export default router;
