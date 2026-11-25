// Límite de peticiones para el envío de observaciones públicas sobre proclamas (5 por hora por IP).
import rateLimit from 'express-rate-limit';

const VENTANA_MS = 60 * 60 * 1000;
const MAXIMO_POR_HORA = 5;

export function crearLimitadorObservaciones() {
  return rateLimit({
    windowMs: VENTANA_MS,
    limit: MAXIMO_POR_HORA,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) => {
      const segundos = req.rateLimit?.resetTime
        ? Math.max(1, Math.ceil((req.rateLimit.resetTime.getTime() - Date.now()) / 1000))
        : 3600;
      res.setHeader('Retry-After', String(segundos));
      res.status(429).json({
        error: {
          codigo: 'DEMASIADAS_SOLICITUDES',
          mensaje: 'Has enviado demasiadas observaciones en poco tiempo. Inténtalo más tarde.',
          detalles: [],
        },
      });
    },
  });
}

export const limitarObservaciones = crearLimitadorObservaciones();
