import { describe, expect, it, vi } from 'vitest';

// La versión moderna de pdf.js no abre los boletines en un Chrome de celular que no está al día:
// el visor tiene que cargar la versión "legacy" (con respaldos) y su worker.
vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: vi.fn(),
  version: 'legacy',
}));
vi.mock('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url', () => ({
  default: '/assets/pdf.worker.legacy.min.mjs',
}));

describe('cargarPdfJs', () => {
  it('usa la versión legacy de pdf.js y su worker', async () => {
    const { cargarPdfJs } = await import('./pdfJs.js');
    const pdfjs = await cargarPdfJs();

    expect(pdfjs.version).toBe('legacy');
    expect(pdfjs.GlobalWorkerOptions.workerSrc).toBe('/assets/pdf.worker.legacy.min.mjs');
    expect(await cargarPdfJs()).toBe(pdfjs);
  });
});
