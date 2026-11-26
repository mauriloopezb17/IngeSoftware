// GET /api/admin/bitacora (contrato: docs/api/admin.md, sección 13). Ya pasó por autenticar.
import { Router } from 'express';
import { z } from 'zod';
import { PERMISOS } from '../constantes/permisos.js';
import * as controlador from '../controllers/bitacora.controller.js';
import { exportarRecurso } from '../controllers/exportar.controller.js';
import { requerirPermiso } from '../middlewares/autorizar.js';
import { marcarConsulta } from '../middlewares/registrarConsulta.js';
import { validar } from '../middlewares/validar.js';
import { esquemaExportacion, esquemaListado, fecha, id } from '../validacion/comunes.js';

const consultaBitacoraBase = esquemaListado({
  filtros: {
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
      .enum(['INSERT', 'UPDATE', 'DELETE', 'EXPORT'], {
        error: 'Debe ser INSERT, UPDATE, DELETE o EXPORT.',
      })
      .optional(),
    desde: fecha.optional(),
    hasta: fecha.optional(),
  },
  ordenes: ['fecha', '-fecha'],
  ordenPredeterminado: '-fecha',
});

const conRangoFechas = (esquema) =>
  esquema.refine(({ desde, hasta }) => !desde || !hasta || hasta >= desde, {
    path: ['hasta'],
    message: 'Debe ser igual o posterior a desde.',
  });

const consultaBitacora = conRangoFechas(consultaBitacoraBase);
const consultaBitacoraExportar = conRangoFechas(esquemaExportacion(consultaBitacoraBase));

const router = Router();

router.get(
  '/',
  requerirPermiso(PERMISOS.BITACORA_VER),
  validar({ query: consultaBitacora }),
  controlador.listar,
);
router.get(
  '/exportar',
  requerirPermiso(PERMISOS.BITACORA_VER),
  marcarConsulta('exportacion'),
  validar({ query: consultaBitacoraExportar }),
  exportarRecurso('bitacora'),
);

export default router;
