/**
 * Utilidades para rutas, nombres de archivo y descarga de boletines parroquiales.
 */

const PATRON_PERIODO_RUTA = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Convierte un periodo de la API (`AAAA-MM-DD` o `AAAA-MM`) al segmento `AAAA-MM`.
 */
export function periodoARutaSegmento(periodo) {
  if (typeof periodo !== 'string') return null;
  const segmento = periodo.trim().slice(0, 7);
  return PATRON_PERIODO_RUTA.test(segmento) ? segmento : null;
}

/**
 * Indica si un segmento de ruta `:periodo` tiene el formato válido `AAAA-MM`.
 */
export function esPeriodoRutaValido(segmento) {
  return typeof segmento === 'string' && PATRON_PERIODO_RUTA.test(segmento);
}

/**
 * Construye la ruta pública del lector de un boletín, conservando la query si se pasa.
 */
export function rutaBoletin(periodo, search = '') {
  const segmento = periodoARutaSegmento(periodo);
  if (!segmento) return '/boletines';
  return `/boletines/${segmento}${search}`;
}

/**
 * Devuelve el nombre de descarga sugerido para el PDF de un boletín.
 */
export function nombreArchivoBoletin(periodo) {
  const segmento = periodoARutaSegmento(periodo);
  return segmento ? `boletin-parroquial-${segmento}.pdf` : 'boletin-parroquial.pdf';
}

/**
 * Descarga un boletín PDF vía `fetch` -> `Blob` para respetar el nombre de archivo
 * incluso cuando el PDF está alojado en otro origen (CDN con CORS).
 * Si `fetch` falla, abre la URL en una pestaña nueva como respaldo.
 */
export async function descargarBoletinPdf({ url, periodo }) {
  if (!url) return { metodo: 'ninguno' };

  const nombreArchivo = nombreArchivoBoletin(periodo);

  try {
    const respuesta = await fetch(url);
    if (!respuesta.ok) {
      throw new Error(`HTTP ${respuesta.status}`);
    }

    const blob = await respuesta.blob();
    const objectUrl = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = objectUrl;
    enlace.download = nombreArchivo;
    enlace.rel = 'noopener';
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    return { metodo: 'blob', nombreArchivo };
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
    return { metodo: 'pestana', nombreArchivo };
  }
}
