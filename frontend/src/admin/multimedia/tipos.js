// Tipos y límites de la biblioteca multimedia (docs/api/admin.md §2, RNF-05).
// La API valida de nuevo por el contenido real del archivo; esto solo permite avisar antes de enviar.
const MB = 1024 * 1024;

export const CLASES = {
  IMAGEN: {
    etiqueta: 'Imágenes',
    singular: 'Imagen',
    tipos: { 'image/jpeg': 'JPG', 'image/png': 'PNG', 'image/webp': 'WebP' },
    maximo: 30 * MB,
    mensajeLimite: 'Las imágenes pueden pesar hasta 30 MB.',
  },
  VIDEO: {
    etiqueta: 'Videos',
    singular: 'Video',
    tipos: { 'video/mp4': 'MP4', 'video/webm': 'WebM' },
    maximo: 2048 * MB,
    mensajeLimite: 'Los videos pueden pesar hasta 2 GB.',
  },
  DOCUMENTO: {
    etiqueta: 'Documentos',
    singular: 'Documento',
    tipos: { 'application/pdf': 'PDF' },
    maximo: 50 * MB,
    mensajeLimite: 'Los documentos PDF pueden pesar hasta 50 MB.',
  },
};

export function claseDeTipo(tipoMime) {
  return Object.keys(CLASES).find((clase) => tipoMime in CLASES[clase].tipos) ?? null;
}

// "WebP", "MP4", "PDF"... o el tipo MIME tal cual si no se conoce.
export function nombreDeTipo(tipoMime) {
  const clase = claseDeTipo(tipoMime);
  return clase ? CLASES[clase].tipos[tipoMime] : tipoMime;
}
