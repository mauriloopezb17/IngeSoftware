// Subida de archivos: POST /api/admin/multimedia (contrato: docs/api/admin.md, sección 2).
// Ya pasó por autenticar. La biblioteca (listar, editar, eliminar) está en biblioteca.routes.js.
import { Router } from 'express';
import { PERMISOS } from '../constantes/permisos.js';
import * as controlador from '../controllers/multimedia.controller.js';
import { requerirPermiso } from '../middlewares/autorizar.js';
import { recibirArchivo } from '../middlewares/recibirArchivo.js';
import { exigirAlmacenamiento } from '../storage/oci.js';

const router = Router();

// Sin almacenamiento se responde 503 antes de recibir el archivo (puede pesar gigas).
router.post(
  '/',
  requerirPermiso(PERMISOS.MULTIMEDIA_SUBIR),
  exigirAlmacenamiento,
  recibirArchivo,
  controlador.subir,
);

export default router;
