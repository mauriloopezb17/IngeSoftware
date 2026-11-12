// Logger estructurado de la API (pino) y su middleware HTTP (pino-http).
import { randomUUID } from 'node:crypto';
import pino from 'pino';
import { pinoHttp } from 'pino-http';
import { obtenerEntorno } from './entorno.js';

// Nunca se escriben en el log: credenciales y cookies de sesión.
const RUTAS_OCULTAS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
];

// Un X-Request-Id que llega del cliente o de un proxy se respeta solo si es corto y seguro.
const ID_PETICION_VALIDO = /^[A-Za-z0-9._-]{1,64}$/;

function crearLogger(entorno) {
  return pino({
    // Las pruebas no llenan la consola de logs.
    level: entorno.esPrueba ? 'silent' : entorno.nivelLog,
    base: { servicio: 'api-parroquia' },
    redact: { paths: RUTAS_OCULTAS, censor: '[oculto]' },
    timestamp: pino.stdTimeFunctions.isoTime,
    // pino-pretty es dependencia de desarrollo: solo se usa en desarrollo.
    transport:
      entorno.modo === 'development'
        ? {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
          }
        : undefined,
  });
}

let logger;

// Logger de la aplicación. Se crea al primer uso, cuando el entorno ya fue validado.
export function obtenerLogger() {
  logger ??= crearLogger(obtenerEntorno());
  return logger;
}

function generarIdPeticion(req, res) {
  const recibido = req.get('x-request-id');
  const id = recibido && ID_PETICION_VALIDO.test(recibido) ? recibido : randomUUID();
  res.setHeader('X-Request-Id', id);
  return id;
}

// Nivel según la respuesta: 5xx es error, 4xx es advertencia y el resto es info.
function nivelSegunRespuesta(_req, res, error) {
  if (error || res.statusCode >= 500) return 'error';
  if (res.statusCode >= 400) return 'warn';
  return 'info';
}

// Middleware que registra cada petición con su id (req.id) y deja req.log para los controladores.
export function crearMiddlewareLog() {
  return pinoHttp({
    logger: obtenerLogger(),
    genReqId: generarIdPeticion,
    customLogLevel: nivelSegunRespuesta,
    customSuccessMessage: (req, res) => `${req.method} ${req.originalUrl} ${res.statusCode}`,
    customErrorMessage: (req, res) => `${req.method} ${req.originalUrl} ${res.statusCode}`,
  });
}
