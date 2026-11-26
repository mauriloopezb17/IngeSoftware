// Páginas y bloques en /api/admin/paginas (contrato: docs/api/admin.md, sección 12). Ya pasó por
// autenticar. Leer lo puede cualquier rol de la sede; escribir pide paginas.gestionar.
import { Router } from 'express';
import { PERMISOS } from '../constantes/permisos.js';
import * as controlador from '../controllers/adminPaginas.controller.js';
import { exportarRecurso } from '../controllers/exportar.controller.js';
import { filtrarPorSede, requerirPermiso } from '../middlewares/autorizar.js';
import { marcarConsulta } from '../middlewares/registrarConsulta.js';
import { validar } from '../middlewares/validar.js';
import { esquemaExportacion } from '../validacion/comunes.js';
import {
  consultaPaginas,
  cuerpoCrearBloque,
  cuerpoCrearPagina,
  cuerpoEditarBloque,
  cuerpoEditarPagina,
  cuerpoReordenar,
  paramsBloque,
  paramsPagina as params,
} from '../validacion/paginas.js';

const router = Router();
const gestionar = requerirPermiso(PERMISOS.PAGINAS_GESTIONAR);

router.get('/', validar({ query: consultaPaginas }), filtrarPorSede, controlador.listar);
router.get(
  '/exportar',
  requerirPermiso(PERMISOS.PAGINAS_EXPORTAR),
  marcarConsulta('exportacion'),
  validar({ query: esquemaExportacion(consultaPaginas) }),
  filtrarPorSede,
  exportarRecurso('paginas'),
);
router.get('/:id', validar({ params }), controlador.detalle);
router.post('/', gestionar, validar({ body: cuerpoCrearPagina }), controlador.crear);
router.patch('/:id', gestionar, validar({ params, body: cuerpoEditarPagina }), controlador.editar);
router.delete('/:id', gestionar, validar({ params }), controlador.eliminar);

router.post(
  '/:id/bloques',
  gestionar,
  validar({ params, body: cuerpoCrearBloque }),
  controlador.agregarBloque,
);
router.post(
  '/:id/bloques/reordenar',
  gestionar,
  validar({ params, body: cuerpoReordenar }),
  controlador.reordenarBloques,
);
router.patch(
  '/:id/bloques/:bloqueId',
  gestionar,
  validar({ params: paramsBloque, body: cuerpoEditarBloque }),
  controlador.editarBloque,
);
router.delete(
  '/:id/bloques/:bloqueId',
  gestionar,
  validar({ params: paramsBloque }),
  controlador.eliminarBloque,
);

export default router;
