// Logger estructurado de la API (pino) y su middleware HTTP (pino-http).
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import pino from 'pino';
import { pinoHttp } from 'pino-http';
import { obtenerEntorno } from './entorno.js';

// Nunca se escriben en el log: credenciales, cookies de sesión ni datos personales de observaciones.
const RUTAS_OCULTAS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  'req.body.nombreCompleto',
  'req.body.correo',
  'req.body.telefono',
  'req.body.mensaje',
  'req.body.sitioWeb',
  '*.nombreCompleto',
  '*.correo',
  '*.telefono',
  '*.mensaje',
  '*.nombre_completo',
];

// Un X-Request-Id que llega del cliente o de un proxy se respeta solo si es corto y seguro.
const ID_PETICION_VALIDO = /^[A-Za-z0-9._-]{1,64}$/;

function construirDestino(entorno) {
  if (!entorno.logArchivo) {
    return entorno.modo === 'development'
      ? pino.transport({
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
        })
      : undefined;
  }

  mkdirSync(dirname(entorno.logArchivo), { recursive: true });
  const salidaConsola =
    entorno.modo === 'development'
      ? pino.transport({
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
        })
      : process.stdout;
  const salidaArchivo = pino.destination({ dest: entorno.logArchivo, sync: false, mkdir: true });

  return pino.multistream([{ stream: salidaConsola }, { stream: salidaArchivo }]);
}

export function crearLogger(entorno = obtenerEntorno(), { destino, nivel } = {}) {
  const level = nivel ?? (entorno.esPrueba ? 'silent' : entorno.nivelLog);
  const opciones = {
    level,
    base: { servicio: 'api-parroquia' },
    redact: { paths: RUTAS_OCULTAS, censor: '[oculto]' },
    timestamp: pino.stdTimeFunctions.isoTime,
  };

  if (destino) return pino(opciones, destino);
  const stream = construirDestino(entorno);
  return stream ? pino(opciones, stream) : pino(opciones);
}

let logger;

// Logger de la aplicación. Se crea al primer uso, cuando el entorno ya fue validado.
export function obtenerLogger() {
  logger ??= crearLogger(obtenerEntorno());
  return logger;
}

// Permite inyectar un logger capturable en las pruebas sin cambiar el nivel global de producción.
export function establecerLogger(nuevoLogger) {
  logger = nuevoLogger;
}

export function reiniciarLogger() {
  logger = undefined;
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
export function crearMiddlewareLog(opciones = {}) {
  return pinoHttp({
    logger: opciones.logger ?? obtenerLogger(),
    genReqId: generarIdPeticion,
    customLogLevel: nivelSegunRespuesta,
    customSuccessMessage: (req, res) => `${req.method} ${req.originalUrl} ${res.statusCode}`,
    customErrorMessage: (req, res) => `${req.method} ${req.originalUrl} ${res.statusCode}`,
  });
}
