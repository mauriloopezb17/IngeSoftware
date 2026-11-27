/**
 * Carga diferida de `pdfjs-dist` para que el visor PDF no forme parte del bundle inicial.
 * Configura el worker servido desde el propio sitio.
 *
 * Se usa la versión "legacy" de pdf.js: la moderna llama sin respaldo a funciones muy nuevas del
 * navegador (`Map.prototype.getOrInsertComputed`, `Math.sumPrecise`), y en un Chrome de celular que
 * no está al día el boletín no se abría ("No pudimos mostrar el boletín"). La legacy trae esos
 * respaldos y funciona igual en los navegadores actuales.
 */

let promesaPdfJs = null;

export function cargarPdfJs() {
  if (!promesaPdfJs) {
    promesaPdfJs = Promise.all([
      import('pdfjs-dist/legacy/build/pdf.mjs'),
      import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
    ]).then(([pdfjs, worker]) => {
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      return pdfjs;
    });
  }
  return promesaPdfJs;
}
