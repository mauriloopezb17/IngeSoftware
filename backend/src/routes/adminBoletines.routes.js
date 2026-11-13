// Boletines en /api/admin/boletines (contrato: docs/api/admin.md, sección 11). Ya pasó por
// autenticar. Leer lo puede cualquier rol de la sede; escribir pide boletines.gestionar.
import { Router } from 'express';
import { PERMISOS } from '../constantes/permisos.js';
import * as controlador from '../controllers/adminBoletines.controller.js';
import { filtrarPorSede, requerirPermiso } from '../middlewares/autorizar.js';
import { validar } from '../middlewares/validar.js';
import {
  consultaBoletines,
  cuerpoCrearBoletin,
  cuerpoEditarBoletin,
  paramsBoletin as params,
} from '../validacion/boletines.js';

const router = Router();
const gestionar = requerirPermiso(PERMISOS.BOLETINES_GESTIONAR);

router.get('/', validar({ query: consultaBoletines }), filtrarPorSede, controlador.listar);
router.get('/:id', validar({ params }), controlador.detalle);
router.post('/', gestionar, validar({ body: cuerpoCrearBoletin }), controlador.crear);
router.patch('/:id', gestionar, validar({ params, body: cuerpoEditarBoletin }), controlador.editar);
router.delete('/:id', gestionar, validar({ params }), controlador.eliminar);

export default router;
