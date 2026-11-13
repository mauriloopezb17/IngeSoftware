// Cliente de almacenamiento de archivos: OCI Object Storage por su API compatible con S3.
// Las credenciales salen solo de entorno.almacenamiento (nunca se leen de otro lado ni se registran).
// Si no están configuradas, la API sigue funcionando: solo las operaciones de archivos responden 503.
import { DeleteObjectsCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { obtenerEntorno } from '../config/entorno.js';
import { obtenerLogger } from '../config/logger.js';
import { ErrorApp } from '../errores/ErrorApp.js';

// Desde este tamaño la subida va por partes (Upload de lib-storage): si una parte falla se
// reintenta solo esa parte y no el archivo entero (útil en videos de cientos de MB).
// Por debajo, un único PutObject. 16 MB = el doble del tamaño de cada parte.
export const UMBRAL_SUBIDA_POR_PARTES_BYTES = 16 * 1024 * 1024;
// Tamaño de cada parte (mínimo de S3: 5 MB) y partes subiéndose a la vez.
export const TAMANO_PARTE_BYTES = 8 * 1024 * 1024;
export const PARTES_EN_PARALELO = 3;

// Las claves llevan un uuid y nunca cambian de contenido: el navegador y el CDN pueden guardarlas un año.
export const CACHE_CONTROL_OBJETOS = 'public, max-age=31536000, immutable';

// DeleteObjects acepta hasta 1000 claves por llamada.
const MAXIMO_CLAVES_POR_BORRADO = 1000;

const MENSAJE_NO_CONFIGURADO =
  'El almacenamiento de archivos no está configurado. Intenta de nuevo más tarde.';
const MENSAJE_NO_RESPONDE =
  'El almacenamiento de archivos no está disponible en este momento. Intenta de nuevo más tarde.';

let cliente;

// Hay credenciales de OCI y URL pública del CDN (sin esta última no se pueden armar las URLs).
export function almacenamientoConfigurado() {
  const entorno = obtenerEntorno();
  return entorno.almacenamiento !== null && entorno.cdnUrlPublica !== null;
}

// Middleware: 503 si el almacenamiento no está configurado (para endpoints que lo necesitan).
export function exigirAlmacenamiento(_req, _res, next) {
  if (!almacenamientoConfigurado()) {
    return next(ErrorApp.servicioNoDisponible(MENSAJE_NO_CONFIGURADO));
  }
  return next();
}

function exigirConfiguracion() {
  if (!almacenamientoConfigurado()) {
    throw ErrorApp.servicioNoDisponible(MENSAJE_NO_CONFIGURADO);
  }
  return obtenerEntorno().almacenamiento;
}

// Un único S3Client para toda la API.
export function obtenerClienteS3() {
  if (cliente) return cliente;

  const { endpoint, region, accessKeyId, secretAccessKey } = exigirConfiguracion();
  cliente = new S3Client({
    endpoint,
    region,
    credentials: { accessKeyId, secretAccessKey },
    // OCI usa la dirección con el bucket en la ruta, no como subdominio.
    forcePathStyle: true,
    // Las versiones recientes del SDK añaden por defecto un checksum CRC32 a cada subida y lo
    // validan al leer. Varios servicios compatibles con S3 (OCI incluido) no lo soportan y la
    // subida falla. Con WHEN_REQUIRED solo se calcula cuando la operación lo exige.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
  return cliente;
}

// Cierra el cliente (apagado de la API y pruebas).
export function cerrarClienteS3() {
  cliente?.destroy();
  cliente = undefined;
}

// Un fallo del SDK (red, credenciales, bucket) se informa como 503. El detalle va al log, que
// nunca recibe credenciales: solo el nombre y el código del error.
function comoServicioNoDisponible(error, operacion) {
  if (error instanceof ErrorApp) return error;
  obtenerLogger().error(
    {
      operacion,
      tipo: error?.name,
      codigo: error?.Code ?? error?.code,
      http: error?.$metadata?.httpStatusCode,
    },
    'Falló el almacenamiento de archivos',
  );
  return ErrorApp.servicioNoDisponible(MENSAJE_NO_RESPONDE);
}

// URL pública de un objeto: CDN_PUBLIC_URL + clave (el bucket es de lectura pública).
export function urlPublica(clave) {
  const base = obtenerEntorno().cdnUrlPublica;
  if (base === null) throw ErrorApp.servicioNoDisponible(MENSAJE_NO_CONFIGURADO);
  return `${base}/${clave.replace(/^\/+/, '')}`;
}

// Sube un objeto desde un stream (o Buffer). `tamano` es el largo exacto en bytes.
export async function subirObjeto({ clave, cuerpo, tipoContenido, tamano }) {
  const { bucket } = exigirConfiguracion();
  const parametros = {
    Bucket: bucket,
    Key: clave,
    Body: cuerpo,
    ContentType: tipoContenido,
    ContentLength: tamano,
    CacheControl: CACHE_CONTROL_OBJETOS,
  };

  try {
    if (tamano >= UMBRAL_SUBIDA_POR_PARTES_BYTES) {
      // ContentLength lo calcula Upload por cada parte; el total no se envía.
      const { ContentLength: _total, ...sinLargo } = parametros;
      await new Upload({
        client: obtenerClienteS3(),
        params: sinLargo,
        partSize: TAMANO_PARTE_BYTES,
        queueSize: PARTES_EN_PARALELO,
        // Si se aborta, no deja partes huérfanas ocupando espacio.
        leavePartsOnError: false,
      }).done();
    } else {
      await obtenerClienteS3().send(new PutObjectCommand(parametros));
    }
  } catch (error) {
    throw comoServicioNoDisponible(error, 'subir');
  }
}

// Borra objetos (de a 1000). Una clave que ya no existe no es un error.
export async function eliminarObjetos(claves) {
  if (claves.length === 0) return;
  const { bucket } = exigirConfiguracion();

  try {
    for (let i = 0; i < claves.length; i += MAXIMO_CLAVES_POR_BORRADO) {
      const lote = claves.slice(i, i + MAXIMO_CLAVES_POR_BORRADO);
      const respuesta = await obtenerClienteS3().send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: lote.map((Key) => ({ Key })), Quiet: true },
        }),
      );
      if (respuesta.Errors?.length) {
        throw Object.assign(new Error('DeleteObjects devolvió errores'), {
          name: 'DeleteObjectsErrors',
          Code: respuesta.Errors[0].Code,
        });
      }
    }
  } catch (error) {
    throw comoServicioNoDisponible(error, 'eliminar');
  }
}
