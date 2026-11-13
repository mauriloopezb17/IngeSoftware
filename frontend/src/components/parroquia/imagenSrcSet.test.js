import { describe, expect, it } from 'vitest';

import { construirAtributosImagen } from './imagenSrcSet.js';

describe('construirAtributosImagen', () => {
  const sizes = '(min-width: 1024px) 33vw, 100vw';

  it('arma srcSet ordenado de menor a mayor con el original al final', () => {
    const res = construirAtributosImagen(
      {
        url: 'https://cdn.pasionistas.org.bo/foto.webp',
        ancho: 1600,
        variantes: [
          { ancho: 960, url: 'https://cdn.pasionistas.org.bo/foto-960w.webp' },
          { ancho: 480, url: 'https://cdn.pasionistas.org.bo/foto-480w.webp' },
        ],
      },
      sizes,
    );

    expect(res).toEqual({
      srcSet:
        'https://cdn.pasionistas.org.bo/foto-480w.webp 480w, https://cdn.pasionistas.org.bo/foto-960w.webp 960w, https://cdn.pasionistas.org.bo/foto.webp 1600w',
      sizes,
    });
  });

  it('devuelve {} si variantes falta o es []', () => {
    expect(
      construirAtributosImagen({ url: '/media/seed/altar.webp', ancho: 1879 }, sizes),
    ).toEqual({});
    expect(
      construirAtributosImagen({ url: '/media/seed/altar.webp', ancho: 1879, variantes: [] }, sizes),
    ).toEqual({});
  });

  it('tolera ancho nulo en el original manteniendo las variantes válidas', () => {
    expect(
      construirAtributosImagen(
        {
          url: 'https://cdn.pasionistas.org.bo/foto.webp',
          ancho: null,
          variantes: [{ ancho: 480, url: 'https://cdn.pasionistas.org.bo/foto-480w.webp' }],
        },
        sizes,
      ),
    ).toEqual({
      srcSet: 'https://cdn.pasionistas.org.bo/foto-480w.webp 480w',
      sizes,
    });
  });
});

