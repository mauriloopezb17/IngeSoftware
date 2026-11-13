import { describe, expect, it } from 'vitest';

import { contarArchivos, formatearFecha, formatearTamano } from './formato.js';
import { claseDeTipo, nombreDeTipo } from './tipos.js';

describe('formatos de multimedia', () => {
  it('formatea el tamaño con la unidad adecuada (base 1024)', () => {
    expect(formatearTamano(0)).toBe('0 B');
    expect(formatearTamano(512)).toBe('512 B');
    expect(formatearTamano(1536)).toBe('1,5 KB');
    expect(formatearTamano(412870)).toBe('403,2 KB');
    expect(formatearTamano(58916372)).toBe('56,2 MB');
    expect(formatearTamano(2 * 1024 ** 3)).toBe('2 GB');
  });

  it('muestra la fecha en la hora de Bolivia', () => {
    // 09:12 en Bolivia (-04:00) = 13:12 UTC: la hora mostrada no depende de la zona del equipo.
    expect(formatearFecha('2026-11-12T13:12:44Z')).toMatch(/2026.*9:12/);
  });

  it('cuenta archivos en singular y plural', () => {
    expect(contarArchivos(0)).toBe('0 archivos');
    expect(contarArchivos(1)).toBe('1 archivo');
    expect(contarArchivos(14)).toBe('14 archivos');
  });

  it('clasifica los tipos permitidos', () => {
    expect(claseDeTipo('image/webp')).toBe('IMAGEN');
    expect(claseDeTipo('video/webm')).toBe('VIDEO');
    expect(claseDeTipo('application/pdf')).toBe('DOCUMENTO');
    expect(claseDeTipo('image/gif')).toBeNull();
    expect(claseDeTipo('image/svg+xml')).toBeNull();
    expect(nombreDeTipo('image/jpeg')).toBe('JPG');
    expect(nombreDeTipo('text/plain')).toBe('text/plain');
  });
});
