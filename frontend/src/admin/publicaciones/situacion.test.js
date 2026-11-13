import { describe, expect, it } from 'vitest';

import { situacionDe } from './situacion.js';

const AHORA = new Date('2026-11-13T12:00:00-04:00');

const publicacion = (estado, extra = {}) => ({
  estado: { codigo: estado, nombre: estado },
  fechaPublicacion: null,
  fechaExpiracion: null,
  revision: null,
  ...extra,
});

describe('situación de una publicación (estados-publicacion.md §4)', () => {
  it.each([
    ['borrador sin revisión', publicacion('BORRADOR'), 'borrador', 'Borrador'],
    [
      'borrador con una revisión aprobada (sin observación)',
      publicacion('BORRADOR', { revision: { observacion: null } }),
      'borrador',
      'Borrador',
    ],
    [
      'borrador rechazado (con observación)',
      publicacion('BORRADOR', { revision: { observacion: 'Falta la hora.' } }),
      'rechazada',
      'Rechazada (con observación)',
    ],
    ['en revisión', publicacion('EN_REVISION'), 'en-revision', 'En revisión'],
    ['archivada', publicacion('ARCHIVADO'), 'archivada', 'Archivada'],
    [
      'publicada y vigente',
      publicacion('PUBLICADO', { fechaPublicacion: '2026-11-10T08:00:00-04:00' }),
      'publicada',
      'Publicada',
    ],
    [
      'publicada con expiración todavía lejana',
      publicacion('PUBLICADO', {
        fechaPublicacion: '2026-11-10T08:00:00-04:00',
        fechaExpiracion: '2026-11-30T00:00:00-04:00',
      }),
      'publicada',
      'Publicada',
    ],
    [
      'publicada con fecha futura (programada)',
      publicacion('PUBLICADO', { fechaPublicacion: '2026-11-15T08:00:00-04:00' }),
      'programada',
      'Programada',
    ],
    [
      'publicada cuya expiración ya llegó (expirada)',
      publicacion('PUBLICADO', {
        fechaPublicacion: '2026-11-01T08:00:00-04:00',
        fechaExpiracion: '2026-11-12T00:00:00-04:00',
      }),
      'expirada',
      'Expirada',
    ],
  ])('%s', (_nombre, datos, clave, etiqueta) => {
    expect(situacionDe(datos, AHORA)).toMatchObject({ clave, etiqueta });
  });

  it('la expiración justo en este momento ya cuenta como expirada', () => {
    const datos = publicacion('PUBLICADO', {
      fechaPublicacion: '2026-11-01T08:00:00-04:00',
      fechaExpiracion: AHORA.toISOString(),
    });

    expect(situacionDe(datos, AHORA).clave).toBe('expirada');
  });
});
