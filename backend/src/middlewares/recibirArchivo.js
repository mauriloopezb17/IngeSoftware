// Recepción de un archivo multipart/form-data (campo "archivo") para /api/admin/multimedia.
// multer lo guarda en un archivo temporal en disco (no en memoria: un video llega a 2 GB) y este
// módulo lo borra al terminar la respuesta. Los errores de multer se traducen al contrato.
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { mkdir, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import multer from 'multer';
import { obtenerLogger } from '../config/logger.js';
import { CLASES_MULTIMEDIA, MAXIMO_SUBIDA_BYTES } from '../constantes/multimedia.js';
import { ErrorApp } from '../errores/ErrorApp.js';

const DIRECTORIO_TEMPORAL = path.join(tmpdir(), 'parroquia-subidas');
mkdirSync(DIRECTORIO_TEMPORAL, { recursive: true });

const subida = multer({
  storage: multer.diskStorage({
    // El Sensor de almacenamiento de Windows u otros procesos pueden borrar la carpeta temporal
    // con el backend corriendo: se recrea antes de cada subida.
    destination: (_req, _archivo, devolver) => {
      mkdir(DIRECTORIO_TEMPORAL, { recursive: true })
        .then(() => devolver(null, DIRECTORIO_TEMPORAL))
        .catch((error) => devolver(error));
    },
    // Nombre propio: el que manda el cliente nunca se usa como ruta.
    filename: (_req, _archivo, devolver) => devolver(null, randomUUID()),
  }),
  // El nombre del archivo y los campos llegan en UTF-8 (sin esto se leen como latin1).
  defParamCharset: 'utf8',
  limits: { files: 1, fileSize: MAXIMO_SUBIDA_BYTES, fields: 10, fieldSize: 10 * 1024 },
  // Solo para elegir el mensaje si se supera el tope absoluto: el tipo real se detecta después.
  fileFilter: (req, archivo, devolver) => {
    req.tipoDeclarado = archivo.mimetype;
    devolver(null, true);
  },
}).single('archivo');

// Mensaje de "demasiado grande" según lo que dice el navegador que es el archivo.
function mensajeDemasiadoGrande(tipoDeclarado = '') {
  if (tipoDeclarado.startsWith('image/')) return CLASES_MULTIMEDIA.IMAGEN.mensajeDemasiadoGrande;
  if (tipoDeclarado === 'application/pdf') {
    return CLASES_MULTIMEDIA.DOCUMENTO.mensajeDemasiadoGrande;
  }
  return CLASES_MULTIMEDIA.VIDEO.mensajeDemasiadoGrande;
}

const ERRORES_RED_CONOCIDOS = new Set(['ECONNRESET', 'EPIPE', 'ECONNABORTED']);

function esErrorDeDisco(error) {
  if (!error) return false;
  if (ERRORES_RED_CONOCIDOS.has(error.code)) return false;
  return (
    typeof error.errno === 'number' ||
    typeof error.syscall === 'string' ||
    typeof error.code === 'string'
  );
}

function errorDeCarga(error, req) {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return new ErrorApp('ARCHIVO_DEMASIADO_GRANDE', mensajeDemasiadoGrande(req.tipoDeclarado));
    }
    if (error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE') {
      return ErrorApp.validacion(undefined, [
        { campo: 'archivo', mensaje: 'Envía un solo archivo.' },
      ]);
    }
    return ErrorApp.validacion('La petición multipart no es válida.');
  }
  // Cuerpo multipart cortado o mal formado (lo informa busboy con un Error común).
  if (/multipart|form|boundary|part header/i.test(error.message)) {
    return ErrorApp.validacion('La petición multipart no es válida.');
  }
  if (esErrorDeDisco(error)) {
    (req.log ?? obtenerLogger()).error(
      { err: error, codigo: error.code, llamada: error.syscall },
      'Error de disco al recibir el archivo',
    );
    return ErrorApp.servicioNoDisponible('No pudimos recibir el archivo. Intenta de nuevo.');
  }
  return error;
}

// Deja el archivo en req.archivoRecibido = { ruta, nombreOriginal, tamano }, o ninguno si no vino.
export function recibirArchivo(req, res, next) {
  if (!req.is('multipart/form-data')) {
    return next(new ErrorApp('TIPO_NO_PERMITIDO', 'La petición debe ser multipart/form-data.'));
  }

  // El temporal se borra siempre, haya salido bien o mal la petición (incluso si el cliente corta).
  res.once('close', () => {
    if (req.archivoRecibido) unlink(req.archivoRecibido.ruta).catch(() => {});
  });

  return subida(req, res, (error) => {
    if (error) return next(errorDeCarga(error, req));

    if (req.file) {
      req.archivoRecibido = {
        ruta: req.file.path,
        nombreOriginal: req.file.originalname,
        tamano: req.file.size,
      };
    }
    return next();
  });
}
