import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  descargarBoletinPdf,
  esPeriodoRutaValido,
  nombreArchivoBoletin,
  periodoARutaSegmento,
  rutaBoletin,
} from './boletines.js';

describe('utilidades de boletines', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('convierte periodos y valida segmentos AAAA-MM', () => {
    expect(periodoARutaSegmento('2026-10-01')).toBe('2026-10');
    expect(periodoARutaSegmento('2026-01')).toBe('2026-01');
    expect(periodoARutaSegmento('2026-13-01')).toBeNull();
    expect(periodoARutaSegmento(null)).toBeNull();

    expect(esPeriodoRutaValido('2026-10')).toBe(true);
    expect(esPeriodoRutaValido('2026-00')).toBe(false);
    expect(esPeriodoRutaValido('octubre')).toBe(false);

    expect(rutaBoletin('2026-10-01')).toBe('/boletines/2026-10');
    expect(rutaBoletin('2026-10-01', '?anio=2026')).toBe('/boletines/2026-10?anio=2026');
    expect(rutaBoletin('invalido')).toBe('/boletines');

    expect(nombreArchivoBoletin('2026-10-01')).toBe('boletin-parroquial-2026-10.pdf');
    expect(nombreArchivoBoletin(null)).toBe('boletin-parroquial.pdf');
  });

  it('descarga el PDF mediante fetch y Blob con el nombre del periodo', async () => {
    const blob = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      blob: async () => blob,
    });
    const createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:local/pdf');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const resultado = await descargarBoletinPdf({
      url: 'https://cdn.pasionistas.org.bo/boletin.pdf',
      periodo: '2026-10-01',
    });

    expect(fetchSpy).toHaveBeenCalledWith('https://cdn.pasionistas.org.bo/boletin.pdf');
    expect(createObjectUrlSpy).toHaveBeenCalledWith(blob);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(resultado).toEqual({
      metodo: 'blob',
      nombreArchivo: 'boletin-parroquial-2026-10.pdf',
    });
    expect(revokeSpy).not.toThrow();
  });

  it('abre el PDF en una pestaña nueva si fetch falla', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('CORS'));
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    const resultado = await descargarBoletinPdf({
      url: 'https://cdn.pasionistas.org.bo/boletin.pdf',
      periodo: '2026-10-01',
    });

    expect(openSpy).toHaveBeenCalledWith(
      'https://cdn.pasionistas.org.bo/boletin.pdf',
      '_blank',
      'noopener,noreferrer',
    );
    expect(resultado.metodo).toBe('pestana');
  });
});
