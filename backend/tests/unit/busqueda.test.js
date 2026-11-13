import { describe, it, expect } from 'vitest';
import { patronBusqueda, sinAcentosSql } from '../../src/utils/busqueda.js';

describe('patronBusqueda', () => {
  it('pasa a minúsculas, quita los acentos y rodea con %', () => {
    expect(patronBusqueda('  Comunión ')).toBe('%comunion%');
    expect(patronBusqueda('VICARÍA Sur')).toBe('%vicaria sur%');
    expect(patronBusqueda('Señor')).toBe('%senor%');
  });

  it('escapa los comodines de LIKE para buscarlos como texto', () => {
    expect(patronBusqueda('100%')).toBe('%100\\%%');
    expect(patronBusqueda('a_b')).toBe('%a\\_b%');
    expect(patronBusqueda('c:\\x')).toBe('%c:\\\\x%');
  });
});

describe('sinAcentosSql', () => {
  it('arma la expresión SQL sobre la columna indicada', () => {
    expect(sinAcentosSql('p.titulo')).toMatch(/^translate\(lower\(p\.titulo\), '.+', '.+'\)$/);
  });
});
