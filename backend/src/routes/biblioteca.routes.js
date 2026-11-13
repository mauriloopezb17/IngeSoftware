// Biblioteca multimedia en /api/admin/multimedia (contrato: docs/api/admin.md, sección 2).
// Ya pasó por autenticar. La subida (POST) está en multimedia.routes.js.
import { Router } from 'express';
import { PERMISOS } from '../constantes/permisos.js';
import * as controlador from '../controllers/biblioteca.controller.js';
import { filtrarPorSede, requerirPermiso } from '../middlewares/autorizar.js';
import { validar } from '../middlewares/validar.js';
import { exigirAlmacenamiento } from '../storage/oci.js';
import { consultaBiblioteca, cuerpoEditar, paramsArchivo } from '../validacion/biblioteca.js';

const router = Router();

// Ver la biblioteca no pide un permiso aparte: todos los roles del panel pueden subir.
router.get('/', validar({ query: consultaBiblioteca }), filtrarPorSede, controlador.listar);
router.get('/:id', validar({ params: paramsArchivo }), controlador.detalle);

router.patch(
  '/:id',
  requerirPermiso(PERMISOS.MULTIMEDIA_SUBIR),
  validar({ params: paramsArchivo, body: cuerpoEditar }),
  controlador.editar,
);

// Sin almacenamiento no se borra nada (503): el archivo y sus objetos se quedan juntos.
router.delete(
  '/:id',
  requerirPermiso(PERMISOS.MULTIMEDIA_ELIMINAR),
  validar({ params: paramsArchivo }),
  exigirAlmacenamiento,
  controlador.eliminar,
);

export default router;
