import { describe, expect, it } from 'vitest';

import { destinoLeerNota } from './formatoPortal.js';

describe('destinoLeerNota', () => {
  it('apunta al detalle del portal por defecto aunque tenga urlExterna', () => {
    expect(
      destinoLeerNota({
        slug: 'encuentro-pastoral',
        urlExterna: 'https://facebook.com/post/1',
        abrirEnlaceDirecto: false,
      }),
    ).toEqual({ esExterno: false, url: '/noticias/encuentro-pastoral' });

    expect(
      destinoLeerNota({
        slug: 'sin-campo-booleano',
        urlExterna: 'https://facebook.com/post/2',
      }),
    ).toEqual({ esExterno: false, url: '/noticias/sin-campo-booleano' });
  });

  it('apunta al detalle si abrirEnlaceDirecto es true pero falta urlExterna', () => {
    expect(
      destinoLeerNota({
        slug: 'solo-interna',
        urlExterna: null,
        abrirEnlaceDirecto: true,
      }),
    ).toEqual({ esExterno: false, url: '/noticias/solo-interna' });
  });

  it('devuelve destino externo solo cuando abrirEnlaceDirecto es true y hay urlExterna', () => {
    expect(
      destinoLeerNota({
        slug: 'solo-facebook',
        urlExterna: 'https://facebook.com/post/3',
        abrirEnlaceDirecto: true,
      }),
    ).toEqual({ esExterno: true, url: 'https://facebook.com/post/3' });
  });
});
