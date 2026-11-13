// GET /api/admin/bitacora (contrato: docs/api/admin.md, sección 13). Ya pasó por autenticar.
import { Router } from 'express';
import { z } from 'zod';
import { PERMISOS } from '../constantes/permisos.js';
import * as controlador from '../controllers/bitacora.controller.js';
import { requerirPermiso } from '../middlewares/autorizar.js';
import { validar } from '../middlewares/validar.js';
import { fecha, id, paginacion } from '../validacion/comunes.js';

const consultaBitacora = paginacion
  .extend({
    entidad: z
      .string()
      .trim()
      .regex(/^[a-z_]{1,60}$/, 'Debe ser el nombre de una tabla (minúsculas y guiones bajos).')
      .optional(),
    entidadId: z
      .string()
      .trim()
      .min(1, 'No puede estar vacío.')
      .max(40, 'Es demasiado largo.')
      .optional(),
    usuario: id.optional(),
    accion: z
      .enum(['INSERT', 'UPDATE', 'DELETE'], { error: 'Debe ser INSERT, UPDATE o DELETE.' })
      .optional(),
    desde: fecha.optional(),
    hasta: fecha.optional(),
  })
  .refine(({ desde, hasta }) => !desde || !hasta || hasta >= desde, {
    path: ['hasta'],
    message: 'Debe ser igual o posterior a desde.',
  });

const router = Router();

router.get(
  '/',
  requerirPermiso(PERMISOS.BITACORA_VER),
  validar({ query: consultaBitacora }),
  controlador.listar,
);

export default router;
