import { cargarPdfJs } from '../../utils/pdfJs.js';
import { subirArchivo } from '../multimedia/api.js';

const ANCHO_OBJETIVO_PX = 800;

function canvasAWebp(canvas) {
  return new Promise((resolve, reject) => {
    if (typeof canvas.toBlob !== 'function') {
      reject(new Error('El navegador no permite convertir la portada a imagen.'));
      return;
    }
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('No se pudo generar la imagen WebP de la portada.'));
      },
      'image/webp',
      0.85,
    );
  });
}

/**
 * Dibuja la primera página de un PDF en un canvas de ~800 px de ancho,
 * la convierte a WebP y la sube a la biblioteca multimedia como portada.
 */
export async function generarPortadaPdf({ urlPdf, titulo, nombreOriginal }) {
  if (!urlPdf) {
    throw new Error('Falta la URL del PDF para generar la portada.');
  }

  let tareaCarga = null;
  let pdfDoc = null;

  try {
    const pdfjs = await cargarPdfJs();
    tareaCarga = pdfjs.getDocument({ url: urlPdf, isEvalSupported: false });
    pdfDoc = await tareaCarga.promise;

    const primeraPagina = await pdfDoc.getPage(1);
    const viewportBase = primeraPagina.getViewport({ scale: 1 });
    const escala = ANCHO_OBJETIVO_PX / (viewportBase.width || ANCHO_OBJETIVO_PX);
    const viewport = primeraPagina.getViewport({ scale: escala });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);

    const contexto = canvas.getContext('2d');
    if (!contexto) {
      throw new Error('No se pudo inicializar el lienzo para la portada.');
    }

    await primeraPagina.render({ canvasContext: contexto, viewport }).promise;
    const blob = await canvasAWebp(canvas);

    const baseNombre = (nombreOriginal || 'boletin').replace(/\.pdf$/i, '');
    const archivoWebp = new File([blob], `${baseNombre}-portada.webp`, { type: 'image/webp' });
    const tituloLimpio = (titulo || '').trim();
    const textoAlternativo = tituloLimpio ? `Portada del ${tituloLimpio}` : 'Portada del boletín';

    return await subirArchivo({ archivo: archivoWebp, textoAlternativo });
  } finally {
    await tareaCarga?.destroy?.();
    await pdfDoc?.destroy?.();
  }
}
