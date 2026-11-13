import { describe, expect, it } from 'vitest';
import { ROLES } from '../../src/constantes/catalogos.js';
import { PERMISOS, permisosDe, tienePermiso } from '../../src/constantes/permisos.js';
import { ejemploDelContrato } from '../apoyo/contrato.js';

describe('matriz de permisos', () => {
  it('Secretaría tiene exactamente los permisos del ejemplo del contrato, en el mismo orden', () => {
    const ejemplo = ejemploDelContrato('### `POST /api/auth/login`', 1, 'autenticacion.md');

    expect(permisosDe('SECRETARIA')).toEqual(ejemplo.datos.permisos);
  });

  it('el Administrador tiene todos los permisos', () => {
    expect(permisosDe('ADMINISTRADOR')).toEqual(Object.values(PERMISOS));
  });

  it.each([
    ['PARROCO', 'noticias.publicar', true],
    ['PARROCO', 'bitacora.ver', true],
    ['PARROCO', 'usuarios.gestionar', false],
    ['PARROCO', 'sedes.gestionar', false],
    ['SECRETARIA', 'avisos.gestionar', true],
    ['SECRETARIA', 'noticias.redactar', false],
    ['SECRETARIA', 'bitacora.ver', false],
    ['MARKETING', 'noticias.redactar', true],
    ['MARKETING', 'noticias.publicar', false],
    ['MARKETING', 'avisos.gestionar', false],
    ['MARKETING', 'videos.gestionar', true],
    ['MARKETING', 'boletines.gestionar', true],
    ['MARKETING', 'multimedia.subir', true],
  ])('%s con %s: %s', (rol, permiso, esperado) => {
    expect(tienePermiso(rol, permiso)).toBe(esperado);
  });

  it('solo el Administrador gestiona usuarios y sedes', () => {
    for (const rol of ROLES.codigos) {
      const esAdministrador = rol === 'ADMINISTRADOR';
      expect(tienePermiso(rol, PERMISOS.USUARIOS_GESTIONAR)).toBe(esAdministrador);
      expect(tienePermiso(rol, PERMISOS.SEDES_GESTIONAR)).toBe(esAdministrador);
    }
  });

  it('un rol desconocido no tiene permisos', () => {
    expect(permisosDe('INVENTADO')).toEqual([]);
    expect(tienePermiso('INVENTADO', PERMISOS.MULTIMEDIA_SUBIR)).toBe(false);
  });

  it('no se puede modificar desde fuera', () => {
    expect(Object.isFrozen(PERMISOS)).toBe(true);
    expect(Object.isFrozen(permisosDe('SECRETARIA'))).toBe(true);
  });
});
