// Reglas de quién puede hacer qué con una publicación (estados-publicacion.md §2, §3, §5 y §6).
import { describe, expect, it } from 'vitest';
import {
  accionesDisponibles,
  evaluarAccion,
  puedeCrear,
} from '../../src/utils/accionesPublicacion.js';

const AUTOR = 10;
const usuario = (rol, id = 99) => ({ id, rol });
const admin = usuario('ADMINISTRADOR');
const parroco = usuario('PARROCO');
const secretaria = usuario('SECRETARIA');
const marketing = usuario('MARKETING');
const marketingAutor = usuario('MARKETING', AUTOR);

const noticia = (estado) => ({ tipo: 'NOTICIA', estado, autorId: AUTOR });
const aviso = (estado) => ({ tipo: 'AVISO', estado, autorId: AUTOR });

const codigo = (error) => error?.codigo ?? null;

describe('puedeCrear', () => {
  it('avisos con avisos.gestionar; noticias y notas con noticias.redactar', () => {
    expect(
      ['ADMINISTRADOR', 'PARROCO', 'SECRETARIA', 'MARKETING'].map((rol) =>
        puedeCrear(rol, 'AVISO'),
      ),
    ).toEqual([true, true, true, false]);
    expect(
      ['ADMINISTRADOR', 'PARROCO', 'SECRETARIA', 'MARKETING'].map((rol) =>
        puedeCrear(rol, 'NOTA_DE_PRENSA'),
      ),
    ).toEqual([true, true, false, true]);
  });
});

describe('acciones de los ejemplos del contrato (noticia de Marketing)', () => {
  it('borrador: Marketing autor puede editar, eliminar y enviar a revisión', () => {
    expect(accionesDisponibles(noticia('BORRADOR'), marketingAutor)).toEqual([
      'EDITAR',
      'ELIMINAR',
      'ENVIAR_REVISION',
    ]);
  });

  it('en revisión: Marketing ya no tiene acciones; el Párroco edita, aprueba o rechaza', () => {
    expect(accionesDisponibles(noticia('EN_REVISION'), marketingAutor)).toEqual([]);
    expect(accionesDisponibles(noticia('EN_REVISION'), parroco)).toEqual([
      'EDITAR',
      'APROBAR',
      'RECHAZAR',
    ]);
  });

  it('rechazada (borrador): el Párroco edita, elimina o publica', () => {
    expect(accionesDisponibles(noticia('BORRADOR'), parroco)).toEqual([
      'EDITAR',
      'ELIMINAR',
      'PUBLICAR',
    ]);
  });

  it('publicada: el Párroco edita o archiva; archivada: elimina o restaura', () => {
    expect(accionesDisponibles(noticia('PUBLICADO'), parroco)).toEqual(['EDITAR', 'ARCHIVAR']);
    expect(accionesDisponibles(noticia('ARCHIVADO'), parroco)).toEqual(['ELIMINAR', 'RESTAURAR']);
  });

  it('Secretaría no tiene acciones sobre noticias; sí sobre avisos', () => {
    for (const estado of ['BORRADOR', 'EN_REVISION', 'PUBLICADO', 'ARCHIVADO']) {
      expect(accionesDisponibles(noticia(estado), secretaria)).toEqual([]);
    }
    expect(accionesDisponibles(aviso('BORRADOR'), secretaria)).toEqual([
      'EDITAR',
      'ELIMINAR',
      'PUBLICAR',
    ]);
  });
});

describe('evaluarAccion: EDITAR', () => {
  it('borrador: el autor y el publicador; otro Marketing no (403)', () => {
    expect(codigo(evaluarAccion('EDITAR', noticia('BORRADOR'), marketingAutor))).toBeNull();
    expect(codigo(evaluarAccion('EDITAR', noticia('BORRADOR'), admin))).toBeNull();
    expect(evaluarAccion('EDITAR', noticia('BORRADOR'), marketing).message).toBe(
      'Solo puedes editar tus propios borradores.',
    );
  });

  it('en revisión y publicada: solo el publicador; archivada: nadie (409)', () => {
    expect(codigo(evaluarAccion('EDITAR', noticia('EN_REVISION'), marketingAutor))).toBe(
      'SIN_PERMISO',
    );
    expect(codigo(evaluarAccion('EDITAR', noticia('PUBLICADO'), parroco))).toBeNull();
    expect(codigo(evaluarAccion('EDITAR', noticia('ARCHIVADO'), admin))).toBe('CONFLICTO');
  });

  it('un rol sin permisos sobre el tipo recibe 403 antes que 409', () => {
    expect(codigo(evaluarAccion('EDITAR', aviso('ARCHIVADO'), marketing))).toBe('SIN_PERMISO');
  });
});

describe('evaluarAccion: ELIMINAR', () => {
  it('en revisión o publicada: 409 también para el Administrador', () => {
    expect(codigo(evaluarAccion('ELIMINAR', noticia('EN_REVISION'), admin))).toBe('CONFLICTO');
    expect(codigo(evaluarAccion('ELIMINAR', noticia('PUBLICADO'), admin))).toBe('CONFLICTO');
  });

  it('archivada: solo el publicador del tipo, no el autor de Marketing', () => {
    expect(codigo(evaluarAccion('ELIMINAR', noticia('ARCHIVADO'), marketingAutor))).toBe(
      'SIN_PERMISO',
    );
    expect(codigo(evaluarAccion('ELIMINAR', noticia('ARCHIVADO'), parroco))).toBeNull();
  });
});

describe('evaluarAccion: transiciones', () => {
  it('mensaje del 409 de una transición desde un estado que no le corresponde', () => {
    expect(evaluarAccion('APROBAR', noticia('BORRADOR'), parroco).message).toBe(
      'Solo se pueden aprobar publicaciones en revisión. Esta está en «Borrador».',
    );
  });

  it('mensaje del 403 de un rol sin el permiso', () => {
    expect(evaluarAccion('APROBAR', noticia('EN_REVISION'), marketing).message).toBe(
      'Tu rol no tiene permiso para aprobar publicaciones.',
    );
  });

  it('enviar a revisión: un aviso es 409; un borrador ajeno es 403', () => {
    expect(evaluarAccion('ENVIAR_REVISION', aviso('BORRADOR'), parroco).message).toBe(
      'Los avisos no pasan por revisión: se publican directamente.',
    );
    expect(codigo(evaluarAccion('ENVIAR_REVISION', noticia('BORRADOR'), marketing))).toBe(
      'SIN_PERMISO',
    );
    expect(codigo(evaluarAccion('ENVIAR_REVISION', noticia('BORRADOR'), secretaria))).toBe(
      'SIN_PERMISO',
    );
  });

  it('una acción desconocida es un error de programación', () => {
    expect(() => evaluarAccion('BORRAR', noticia('BORRADOR'), admin)).toThrow(TypeError);
  });
});
