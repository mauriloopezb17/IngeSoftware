// Reglas de la multimedia (docs/api/admin.md, sección 2; RNF-05).
const MB = 1024 * 1024;
const GB = 1024 * MB;

// Clases de archivo permitidas. El tipo se detecta por el contenido (file-type), no por la
// extensión ni por el Content-Type del navegador. No se aceptan SVG ni GIF (un SVG lleva scripts).
export const CLASES_MULTIMEDIA = Object.freeze({
  IMAGEN: Object.freeze({
    codigo: 'IMAGEN',
    tipos: Object.freeze(['image/jpeg', 'image/png', 'image/webp']),
    maximoBytes: 30 * MB,
    mensajeDemasiadoGrande: 'Las imágenes pueden pesar hasta 30 MB.',
  }),
  VIDEO: Object.freeze({
    codigo: 'VIDEO',
    tipos: Object.freeze(['video/mp4', 'video/webm']),
    maximoBytes: 2 * GB,
    mensajeDemasiadoGrande: 'Los videos pueden pesar hasta 2 GB.',
  }),
  DOCUMENTO: Object.freeze({
    codigo: 'DOCUMENTO',
    tipos: Object.freeze(['application/pdf']),
    maximoBytes: 50 * MB,
    mensajeDemasiadoGrande: 'Los documentos pueden pesar hasta 50 MB.',
  }),
});

// Tipo MIME real -> clase; undefined si no está permitido.
export function claseDelTipo(tipoMime) {
  return Object.values(CLASES_MULTIMEDIA).find((clase) => clase.tipos.includes(tipoMime));
}

// Extensión con la que se guarda cada tipo en el bucket (las imágenes siempre quedan en WebP).
export const EXTENSION_POR_TIPO = Object.freeze({
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'application/pdf': 'pdf',
});

// Tope absoluto de lo que se recibe, sea cual sea la clase: el mayor de los límites. Un archivo
// que lo supera se corta sin guardarse; el resto se comprueba contra el límite de su clase.
export const MAXIMO_SUBIDA_BYTES = 2 * GB;

// Capacidad del almacenamiento (50 GB) y porcentaje desde el que se dejan de aceptar subidas.
// Se mide con la suma de tamano_bytes de los archivos (las variantes no cuentan).
export const CAPACIDAD_ALMACENAMIENTO_BYTES = 50 * GB;
export const UMBRAL_CAPACIDAD = 0.9;

// Imágenes: lado largo máximo (px), calidad WebP y píxeles de entrada aceptados (sharp usa
// por defecto ~268 MP; se fija aquí para no depender de la versión). Evita las "bombas de
// descompresión": un archivo pequeño que al abrirse ocupa gigas de memoria.
export const LADO_MAXIMO_IMAGEN_PX = 2560;
export const CALIDAD_WEBP = 82;
export const PIXELES_MAXIMOS_ENTRADA = 268_402_689;

// Variantes de las imágenes subidas: solo se generan las de ancho MENOR que el de la imagen
// guardada (una imagen de 400 px no tiene variantes). Contrato: admin.md, "Variantes".
export const ANCHOS_VARIANTES = Object.freeze([480, 960, 1600]);

// Clave de una variante: <uuid>.webp -> <uuid>-<ancho>w.webp.
export const claveDeVariante = (clave, ancho) => clave.replace(/\.webp$/, `-${ancho}w.webp`);

export const LARGO_MAXIMO_TEXTO_ALTERNATIVO = 255;
