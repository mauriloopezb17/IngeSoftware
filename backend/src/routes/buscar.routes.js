// Ruta pública de búsqueda: GET /api/sedes/:sede/buscar (OLA-2.md §2).
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as controlador from '../controllers/buscar.controller.js';
import { marcarConsulta } from '../middlewares/registrarConsulta.js';
import { validar } from '../middlewares/validar.js';
import { consultaBuscar } from '../validacion/buscar.js';

const VENTANA_MS = 60 * 1000;
const MAXIMO_POR_MINUTO = 30;

export function crearLimitadorBusquedas() {
  return rateLimit({
    windowMs: VENTANA_MS,
    limit: MAXIMO_POR_MINUTO,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) => {
      const segundos = req.rateLimit?.resetTime
        ? Math.max(1, Math.ceil((req.rateLimit.resetTime.getTime() - Date.now()) / 1000))
        : 60;
      res.setHeader('Retry-After', String(segundos));
      res.status(429).json({
        error: {
          codigo: 'DEMASIADAS_SOLICITUDES',
          mensaje: 'Has realizado demasiadas búsquedas seguidas. Espera un momento.',
          detalles: [],
        },
      });
    },
  });
}

const router = Router({ mergeParams: true });

router.get(
  '/',
  crearLimitadorBusquedas(),
  marcarConsulta('busqueda'),
  validar({ query: consultaBuscar }),
  controlador.buscar,
);

export default router;
