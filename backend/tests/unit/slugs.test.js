import { describe, expect, it } from 'vitest';
import { slugDesde, slugLibre } from '../../src/utils/slugs.js';

describe('slugDesde', () => {
  it('pasa a minúsculas, quita acentos y signos y une con guiones', () => {
    expect(slugDesde('Primeras comuniones: 42 niños recibieron a Jesús')).toBe(
      'primeras-comuniones-42-ninos-recibieron-a-jesus',
    );
    expect(slugDesde('  ¡Ñandú   —  Día!  ')).toBe('nandu-dia');
  });

  it('recorta sin dejar un guion al final', () => {
    expect(slugDesde('uno dos tres', { largoMaximo: 4 })).toBe('uno');
  });

  it('usa el respaldo si no queda ninguna letra', () => {
    expect(slugDesde('¡¡!!', { respaldo: 'publicacion' })).toBe('publicacion');
    expect(slugDesde(null)).toBe('sin-titulo');
  });
});

describe('slugLibre', () => {
  it('devuelve la base si está libre', () => {
    expect(slugLibre('misa', [])).toBe('misa');
    expect(slugLibre('misa', ['misa-2'])).toBe('misa');
  });

  it('agrega el primer sufijo libre', () => {
    expect(slugLibre('misa', ['misa'])).toBe('misa-2');
    expect(slugLibre('misa', ['misa', 'misa-2', 'misa-4'])).toBe('misa-3');
  });

  it('recorta la base para que el sufijo no pase del largo máximo', () => {
    expect(slugLibre('abcdef', ['abcdef'], { largoMaximo: 6 })).toBe('abcd-2');
    expect(slugLibre('abc-ef', ['abc-ef'], { largoMaximo: 5 })).toBe('abc-2');
  });
});
