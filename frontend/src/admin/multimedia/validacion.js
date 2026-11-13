// Validación en el cliente de los archivos a subir (docs/api/admin.md §2, RNF-05).
// Solo sirve para avisar antes de enviar: el navegador no ve el contenido real del archivo,
// así que el servidor valida de nuevo por la firma binaria y puede rechazar lo que aquí pasó.
import { formatearTamano } from './formato.js';
import { CLASES, claseDeTipo } from './tipos.js';

const TIPOS_POR_EXTENSION = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  mp4: 'video/mp4',
  webm: 'video/webm',
  pdf: 'application/pdf',
};

// Valor del atributo `accept` del selector de archivos.
export const ACCEPT_ARCHIVOS = [
  ...Object.keys(TIPOS_POR_EXTENSION).map((extension) => `.${extension}`),
  ...Object.values(CLASES).flatMap((clase) => Object.keys(clase.tipos)),
].join(',');

export const RESUMEN_DE_LIMITES = Object.values(CLASES)
  .map(({ tipos, maximo }) => `${Object.values(tipos).join(', ')} hasta ${formatearTamano(maximo)}`)
  .join(' · ');

// Tipo MIME del archivo. Algunos sistemas no informan el tipo: entonces se usa la extensión.
export function tipoDelArchivo(archivo) {
  if (archivo.type) return archivo.type;
  const extension = archivo.name.split('.').pop()?.toLowerCase();
  return TIPOS_POR_EXTENSION[extension] ?? '';
}

// Devuelve null si el archivo se puede enviar, o { codigo, mensaje } con el motivo del rechazo.
export function validarArchivoCliente(archivo) {
  const clase = claseDeTipo(tipoDelArchivo(archivo));

  if (!clase) {
    return {
      codigo: 'TIPO_NO_PERMITIDO',
      mensaje: 'Tipo no permitido. Se aceptan imágenes JPG, PNG o WebP, videos MP4 o WebM y documentos PDF.',
    };
  }

  if (archivo.size > CLASES[clase].maximo) {
    return {
      codigo: 'ARCHIVO_DEMASIADO_GRANDE',
      mensaje: `Pesa ${formatearTamano(archivo.size)}. ${CLASES[clase].mensajeLimite}`,
    };
  }

  if (archivo.size === 0) {
    return { codigo: 'ARCHIVO_VACIO', mensaje: 'El archivo está vacío.' };
  }

  return null;
}
