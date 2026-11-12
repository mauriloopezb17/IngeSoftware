// Respuesta 404 y manejo centralizado de errores. Van al final de la cadena de middlewares.
import { ZodError } from 'zod';
import '../config/zod.js';
import { obtenerEntorno } from '../config/entorno.js';
import { CODIGOS_ERROR, ErrorApp } from '../errores/ErrorApp.js';

const MENSAJE_ERROR_INTERNO = 'Ocurrió un error inesperado. Intenta de nuevo más tarde.';

// Ruta de un error de Zod como texto: ["contenido", "bloques", 0, "type"] -> "contenido.bloques.0.type".
export function rutaCampo(ruta) {
  return ruta.map(String).join('.');
}

// Convierte un ZodError en un ErrorApp VALIDACION con un detalle por problema.
// prefijo: dónde estaba el dato (ej. "query" -> "query.porPagina"); vacío para el cuerpo.
export function errorDeZod(error, prefijo = '') {
  const campo = (ruta) => [prefijo, rutaCampo(ruta)].filter(Boolean).join('.') || '(cuerpo)';

  const detalles = error.issues.flatMap((issue) =>
    // Claves no permitidas: un detalle por clave, con la clave como campo.
    issue.code === 'unrecognized_keys'
      ? issue.keys.map((clave) => ({
          campo: campo([...issue.path, clave]),
          mensaje: 'Campo no permitido.',
        }))
      : [{ campo: campo(issue.path), mensaje: issue.message }],
  );
  return ErrorApp.validacion(undefined, detalles);
}

// Errores que lanza express.json (body-parser): se distinguen por su "type".
function errorDelCuerpo(error) {
  switch (error.type) {
    case 'entity.parse.failed':
      return ErrorApp.validacion('El cuerpo de la petición no es un JSON válido.');
    case 'entity.too.large':
      return new ErrorApp(
        'ARCHIVO_DEMASIADO_GRANDE',
        'El cuerpo de la petición supera el tamaño máximo permitido (1 MB).',
      );
    case 'encoding.unsupported':
    case 'charset.unsupported':
      return new ErrorApp('TIPO_NO_PERMITIDO', 'La codificación del cuerpo debe ser UTF-8.');
    default:
      return null;
  }
}

// Otros errores HTTP con estado 4xx (ej. un parámetro de ruta mal codificado): se mapean al
// código del contrato con el mismo estado, o a VALIDACION si no hay uno exacto.
function errorHttpCliente(error) {
  const estado = error.status ?? error.statusCode;
  if (!Number.isInteger(estado) || estado < 400 || estado >= 500) return null;

  const codigo =
    Object.keys(CODIGOS_ERROR).find((clave) => CODIGOS_ERROR[clave] === estado) ?? 'VALIDACION';
  const mensaje = error.expose && error.message ? error.message : 'La petición no es válida.';
  return new ErrorApp(codigo, mensaje);
}

function normalizar(error) {
  if (error instanceof ErrorApp) return error;
  if (error instanceof ZodError) return errorDeZod(error);
  return errorDelCuerpo(error) ?? errorHttpCliente(error);
}

// 404 para cualquier ruta que ningún router atendió.
export function rutaNoEncontrada(req, _res, next) {
  const ruta = req.originalUrl.split('?')[0];
  next(ErrorApp.noEncontrado(`No existe la ruta ${req.method} ${ruta}.`));
}

// Manejador final: responde siempre con el formato del contrato.
// Express lo reconoce como manejador de errores porque recibe 4 argumentos.
export function manejarErrores(error, req, res, next) {
  // Si la respuesta ya empezó a enviarse, solo Express puede cortarla.
  if (res.headersSent) return next(error);

  const conocido = normalizar(error);

  if (conocido) {
    return res.status(conocido.estado).json(conocido.aRespuesta());
  }

  // Error no previsto: pino-http lo registra con su traza y el id de la petición (res.err).
  res.err = error;
  const cuerpo = new ErrorApp('ERROR_INTERNO', MENSAJE_ERROR_INTERNO).aRespuesta();

  // La traza solo se envía fuera de producción, para depurar en desarrollo.
  if (!obtenerEntorno().esProduccion) {
    cuerpo.error.traza = error?.stack ?? String(error);
  }

  return res.status(500).json(cuerpo);
}
