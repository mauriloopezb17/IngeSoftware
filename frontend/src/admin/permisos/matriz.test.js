import { describe, expect, it } from 'vitest';

import { usuariosSeed } from '../mocks/usuarios.js';
import { PERMISOS_POR_ROL, puede, puedeVerSeccion } from './matriz.js';

const usuarioDe = (codigo) => usuariosSeed.find((u) => u.rol.codigo === codigo);

describe('matriz de permisos', () => {
  it('coincide con los permisos que devuelven los mocks de la API para cada rol', () => {
    // Si el contrato o los mocks cambian y la matriz no (o al revés), esta prueba falla.
    for (const usuario of usuariosSeed) {
      expect([...PERMISOS_POR_ROL[usuario.rol.codigo]].sort()).toEqual([...usuario.permisos].sort());
    }
  });

  it('cubre los cuatro roles del contrato', () => {
    expect(Object.keys(PERMISOS_POR_ROL).sort()).toEqual(['ADMINISTRADOR', 'MARKETING', 'PARROCO', 'SECRETARIA']);
  });

  it('Marketing redacta noticias pero no publica ni gestiona avisos', () => {
    const marketing = usuarioDe('MARKETING');

    expect(puede(marketing, 'noticias.redactar')).toBe(true);
    expect(puede(marketing, 'multimedia.subir')).toBe(true);
    expect(puede(marketing, 'noticias.publicar')).toBe(false);
    expect(puede(marketing, 'avisos.gestionar')).toBe(false);
    expect(puede(marketing, 'eventos.gestionar')).toBe(false);
  });

  it('solo el Párroco y el Administrador publican noticias; Secretaría no las redacta', () => {
    expect(puede(usuarioDe('PARROCO'), 'noticias.publicar')).toBe(true);
    expect(puede(usuarioDe('ADMINISTRADOR'), 'noticias.publicar')).toBe(true);
    expect(puede(usuarioDe('SECRETARIA'), 'noticias.publicar')).toBe(false);
    expect(puede(usuarioDe('SECRETARIA'), 'noticias.redactar')).toBe(false);
  });

  it('solo el Administrador gestiona sedes y usuarios', () => {
    for (const permiso of ['sedes.gestionar', 'usuarios.gestionar']) {
      expect(usuariosSeed.filter((u) => puede(u, permiso)).map((u) => u.rol.codigo)).toEqual(['ADMINISTRADOR']);
    }
  });

  it('sin usuario, con rol desconocido o con permiso inexistente no se permite nada', () => {
    expect(puede(null, 'multimedia.subir')).toBe(false);
    expect(puede({ rol: { codigo: 'INVITADO' } }, 'multimedia.subir')).toBe(false);
    expect(puede(usuarioDe('ADMINISTRADOR'), 'permiso.inventado')).toBe(false);
  });

  describe('secciones visibles', () => {
    const SECCIONES_GENERALES = [
      'inicio',
      'publicaciones',
      'eventos',
      'horarios',
      'servicios',
      'grupos',
      'videos',
      'multimedia',
      'sedes',
      'proclamas',
      'boletines',
      'paginas',
    ];

    it('todos los roles ven las secciones generales', () => {
      for (const usuario of usuariosSeed) {
        for (const clave of SECCIONES_GENERALES) expect(puedeVerSeccion(usuario, clave)).toBe(true);
      }
    });

    it('usuarios solo la ve el Administrador', () => {
      expect(usuariosSeed.filter((u) => puedeVerSeccion(u, 'usuarios')).map((u) => u.rol.codigo)).toEqual([
        'ADMINISTRADOR',
      ]);
    });

    it('bitácora la ven el Administrador y el Párroco', () => {
      expect(usuariosSeed.filter((u) => puedeVerSeccion(u, 'bitacora')).map((u) => u.rol.codigo)).toEqual([
        'ADMINISTRADOR',
        'PARROCO',
      ]);
    });

    it('sin sesión no se ve ninguna', () => {
      expect(puedeVerSeccion(null, 'inicio')).toBe(false);
    });
  });
});
