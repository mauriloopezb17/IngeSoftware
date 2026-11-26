/**
 * Carga diferida de `pdfjs-dist` para que el visor PDF no forme parte del bundle inicial.
 * Configura el worker servido desde el propio sitio.
 */

let promesaPdfJs = null;

export function cargarPdfJs() {
  if (!promesaPdfJs) {
    promesaPdfJs = Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ]).then(([pdfjs, worker]) => {
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      return pdfjs;
    });
  }
  return promesaPdfJs;
}
