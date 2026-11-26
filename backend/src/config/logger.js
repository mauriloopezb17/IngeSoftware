// Logger estructurado de la API (pino) y su middleware HTTP (pino-http).
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import pino from 'pino';
import { pinoHttp } from 'pino-http';
import { obtenerEntorno } from './entorno.js';

const CENSURA = '[oculto]';

// Nunca se escriben en el log: credenciales, cookies de sesión, tokens ni datos personales de observaciones.
const RUTAS_OCULTAS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  'req.body.contrasena',
  'req.body.contrasenaActual',
  'req.body.contrasenaNueva',
  'req.body.nuevaContrasena',
  'req.body.token',
  'req.body.jwt',
  'req.body.nombreCompleto',
  'req.body.correo',
  'req.body.telefono',
  'req.body.mensaje',
  'req.body.sitioWeb',
  '*.contrasena',
  '*.contrasenaActual',
  '*.contrasenaNueva',
  '*.nuevaContrasena',
  '*.token',
  '*.jwt',
  '*.nombreCompleto',
  '*.correo',
  '*.telefono',
  '*.mensaje',
  '*.sitioWeb',
  '*.nombre_completo',
  'filtros.contrasena',
  'filtros.token',
  'filtros.jwt',
  'filtros.nombreCompleto',
  'filtros.correo',
  'filtros.telefono',
  'filtros.mensaje',
  'filtros.sitioWeb',
  'filtros.nombre_completo',
];

const CLAVE_SENSIBLE =
  /^(contrasena|token|jwt|nombrecompleto|nombre_completo|correo|email|telefono|mensaje|sitioweb)/i;
const PATRON_CORREO = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
const PATRON_TELEFONO = /\+?\d[\d\s()-]{5,}\d/g;

function censurarValorTexto(valor) {
  return valor.replace(PATRON_CORREO, CENSURA).replace(PATRON_TELEFONO, CENSURA);
}

export function censurarFiltros(filtros) {
  if (!filtros || typeof filtros !== 'object') return {};

  const resultado = {};
  for (const [clave, valor] of Object.entries(filtros)) {
    if (CLAVE_SENSIBLE.test(clave)) {
      resultado[clave] = CENSURA;
    } else if (typeof valor === 'string') {
      resultado[clave] = censurarValorTexto(valor);
    } else if (Array.isArray(valor)) {
      resultado[clave] = valor.map((item) =>
        typeof item === 'string' ? censurarValorTexto(item) : item,
      );
    } else {
      resultado[clave] = valor;
    }
  }
  return resultado;
}

export function limpiarUrlParaLog(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl) return rawUrl;
  const idx = rawUrl.indexOf('?');
  if (idx === -1) return rawUrl;

  const ruta = rawUrl.slice(0, idx);
  const queryTexto = rawUrl.slice(idx + 1);
  const params = new URLSearchParams(queryTexto);
  const limpios = new URLSearchParams();

  for (const [clave, valor] of params.entries()) {
    limpios.append(clave, CLAVE_SENSIBLE.test(clave) ? CENSURA : censurarValorTexto(valor));
  }

  const serializado = limpios.toString();
  return serializado ? `${ruta}?${serializado}` : ruta;
}

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
    redact: { paths: RUTAS_OCULTAS, censor: CENSURA },
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

// Serializadores explícitos: nunca copian req.body y censuran datos personales en URL y query.
const SERIALIZADORES = {
  req(req) {
    return {
      id: req.id,
      method: req.method,
      url: limpiarUrlParaLog(req.url),
      query: censurarFiltros(req.query),
      headers: req.headers,
      remoteAddress: req.remoteAddress,
      remotePort: req.remotePort,
    };
  },
  res: undefined,
};

// Middleware que registra cada petición con su id (req.id) y deja req.log para los controladores.
export function crearMiddlewareLog(opciones = {}) {
  return pinoHttp({
    logger: opciones.logger ?? obtenerLogger(),
    genReqId: generarIdPeticion,
    serializers: SERIALIZADORES,
    customLogLevel: nivelSegunRespuesta,
    customSuccessMessage: (req, res) =>
      `${req.method} ${limpiarUrlParaLog(req.originalUrl)} ${res.statusCode}`,
    customErrorMessage: (req, res) =>
      `${req.method} ${limpiarUrlParaLog(req.originalUrl)} ${res.statusCode}`,
  });
}
