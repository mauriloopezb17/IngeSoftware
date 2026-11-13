import { describe, it, expect } from 'vitest';
import {
  anio,
  booleanoQuery,
  fecha,
  fechaHoraConZona,
  id,
  listaCodigos,
  listaIds,
  paginacion,
  slug,
} from '../../src/validacion/comunes.js';
import { armarPaginacion, desplazamiento } from '../../src/utils/paginacion.js';

const valido = (esquema, valor) => esquema.safeParse(valor).success;
const valor = (esquema, entrada) => esquema.parse(entrada);

describe('paginacion', () => {
  it('usa pagina 1 y porPagina 10 si no vienen', () => {
    expect(valor(paginacion, {})).toEqual({ pagina: 1, porPagina: 10 });
  });

  it('convierte los valores de texto de la query', () => {
    expect(valor(paginacion, { pagina: '3', porPagina: '50' })).toEqual({
      pagina: 3,
      porPagina: 50,
    });
  });

  it.each([
    ['pagina', '0'],
    ['pagina', '-1'],
    ['pagina', '1.5'],
    ['pagina', 'abc'],
    ['pagina', ''],
    ['porPagina', '0'],
    ['porPagina', '51'],
  ])('rechaza %s=%s', (campo, entrada) => {
    const resultado = paginacion.safeParse({ [campo]: entrada });

    expect(resultado.success).toBe(false);
    expect(resultado.error.issues[0].path).toEqual([campo]);
  });
});

describe('armarPaginacion y desplazamiento', () => {
  it('calcula el total de páginas', () => {
    expect(armarPaginacion({ total: 5, pagina: 1, porPagina: 2 })).toEqual({
      pagina: 1,
      porPagina: 2,
      total: 5,
      totalPaginas: 3,
    });
  });

  it('da totalPaginas 0 cuando no hay resultados', () => {
    expect(armarPaginacion({ total: 0, pagina: 1, porPagina: 10 }).totalPaginas).toBe(0);
  });

  it('respeta una página fuera de rango sin corregirla', () => {
    expect(armarPaginacion({ total: 3, pagina: 9, porPagina: 10 })).toEqual({
      pagina: 9,
      porPagina: 10,
      total: 3,
      totalPaginas: 1,
    });
  });

  it('calcula el OFFSET de SQL', () => {
    expect(desplazamiento(1, 10)).toBe(0);
    expect(desplazamiento(3, 4)).toBe(8);
  });
});

describe('id', () => {
  it('convierte un id de texto a número', () => {
    expect(valor(id, '12')).toBe(12);
  });

  it.each(['0', '-3', '1.5', 'abc', '2147483648'])('rechaza %s', (entrada) => {
    expect(valido(id, entrada)).toBe(false);
  });
});

describe('slug', () => {
  it.each(['senor-de-la-exaltacion', 'resurreccion', 'primeras-comuniones-42-ninos', 'a1'])(
    'acepta %s',
    (entrada) => {
      expect(valido(slug, entrada)).toBe(true);
    },
  );

  it.each([
    'Senor',
    'señor',
    'con espacio',
    '-inicio',
    'fin-',
    'doble--guion',
    '',
    'a'.repeat(201),
  ])('rechaza %j', (entrada) => {
    expect(valido(slug, entrada)).toBe(false);
  });
});

describe('fecha', () => {
  it.each(['2026-11-01', '2024-02-29'])('acepta %s', (entrada) => {
    expect(valido(fecha, entrada)).toBe(true);
  });

  it.each(['2026-02-30', '2025-02-29', '2026-13-01', '26-11-01', 'ayer', '2026-11-01T00:00:00Z'])(
    'rechaza %s',
    (entrada) => {
      expect(valido(fecha, entrada)).toBe(false);
    },
  );
});

describe('fechaHoraConZona', () => {
  it.each(['2026-11-14T11:00:00-04:00', '2026-11-14T15:00:00Z', '2026-11-14T11:00:00.123-04:00'])(
    'acepta %s',
    (entrada) => {
      expect(valido(fechaHoraConZona, entrada)).toBe(true);
    },
  );

  it.each(['2026-11-14T11:00:00', '2026-11-14 11:00:00-04:00', '2026-11-14'])(
    'rechaza %s (sin zona o mal formada)',
    (entrada) => {
      expect(valido(fechaHoraConZona, entrada)).toBe(false);
    },
  );
});

describe('anio y booleanoQuery', () => {
  it('convierte el año y rechaza valores fuera de rango', () => {
    expect(valor(anio, '2026')).toBe(2026);
    expect(valido(anio, '26')).toBe(false);
    expect(valido(anio, '2026.5')).toBe(false);
  });

  it('acepta solo "true" y "false"', () => {
    expect(valor(booleanoQuery, 'true')).toBe(true);
    expect(valor(booleanoQuery, 'false')).toBe(false);
    expect(valido(booleanoQuery, '1')).toBe(false);
    expect(valido(booleanoQuery, 'TRUE')).toBe(false);
  });
});

describe('listas separadas por comas', () => {
  it('convierte una lista de ids, sin espacios ni repetidos', () => {
    expect(valor(listaIds, '1, 3,1')).toEqual([1, 3]);
  });

  it('rechaza una lista de ids con un valor inválido o vacío', () => {
    expect(valido(listaIds, '1,abc')).toBe(false);
    expect(valido(listaIds, '1,,2')).toBe(false);
    expect(valido(listaIds, '')).toBe(false);
  });

  it('acepta solo los códigos de la enumeración', () => {
    const tipos = listaCodigos(['AVISO', 'NOTICIA', 'NOTA_DE_PRENSA']);

    expect(valor(tipos, 'NOTICIA,NOTA_DE_PRENSA')).toEqual(['NOTICIA', 'NOTA_DE_PRENSA']);
    expect(valor(tipos, 'AVISO,AVISO')).toEqual(['AVISO']);

    const resultado = tipos.safeParse('NOTICIA,BLOG');
    expect(resultado.success).toBe(false);
    expect(resultado.error.issues[0].message).toBe(
      'Debe ser uno de: AVISO, NOTICIA, NOTA_DE_PRENSA.',
    );
  });
});
