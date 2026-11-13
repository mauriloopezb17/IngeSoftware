import { describe, expect, it } from 'vitest';
import { ErrorApp } from '../../src/errores/ErrorApp.js';
import {
  esAdministrador,
  exigirSedeDelRecurso,
  sedeDeConsulta,
  sedeParaCrear,
} from '../../src/utils/alcanceSede.js';

const administrador = { rol: 'ADMINISTRADOR', sedeId: null, sedeSlug: null };
const administradorConSede = {
  rol: 'ADMINISTRADOR',
  sedeId: 1,
  sedeSlug: 'senor-de-la-exaltacion',
};
const secretaria = { rol: 'SECRETARIA', sedeId: 1, sedeSlug: 'senor-de-la-exaltacion' };
const parrocoSinSede = { rol: 'PARROCO', sedeId: null, sedeSlug: null };

// Ejecuta fn y devuelve el ErrorApp que lanza (falla la prueba si no lanza nada).
function errorDe(fn) {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(ErrorApp);
    return error;
  }
  throw new Error('Se esperaba un ErrorApp');
}

describe('esAdministrador', () => {
  it('solo el rol ADMINISTRADOR', () => {
    expect(esAdministrador(administrador)).toBe(true);
    expect(esAdministrador(secretaria)).toBe(false);
  });
});

describe('sedeDeConsulta (filtro "sede" de las listas)', () => {
  it('el Administrador consulta la sede que pida o todas si no pide ninguna', () => {
    expect(sedeDeConsulta(administrador, 'capilla-de-obrajes')).toBe('capilla-de-obrajes');
    expect(sedeDeConsulta(administrador, undefined)).toBeUndefined();
    expect(sedeDeConsulta(administradorConSede, undefined)).toBeUndefined();
  });

  it('los demás roles quedan fijados a su sede si no piden ninguna o piden la suya', () => {
    expect(sedeDeConsulta(secretaria, undefined)).toBe('senor-de-la-exaltacion');
    expect(sedeDeConsulta(secretaria, 'senor-de-la-exaltacion')).toBe('senor-de-la-exaltacion');
  });

  it('los demás roles reciben 403 si piden otra sede', () => {
    const error = errorDe(() => sedeDeConsulta(secretaria, 'capilla-de-obrajes'));

    expect(error.codigo).toBe('SIN_PERMISO');
    expect(error.message).toBe('Este recurso pertenece a otra sede.');
  });

  it('un rol que no es Administrador y no tiene sede no consulta nada', () => {
    expect(errorDe(() => sedeDeConsulta(parrocoSinSede, undefined)).codigo).toBe('SIN_PERMISO');
    expect(errorDe(() => sedeDeConsulta(parrocoSinSede, 'capilla')).codigo).toBe('SIN_PERMISO');
  });
});

describe('sedeParaCrear', () => {
  it('el Administrador usa el sedeId del cuerpo', () => {
    expect(sedeParaCrear(administrador, 2)).toBe(2);
    expect(sedeParaCrear(administrador, undefined)).toBeUndefined();
  });

  it('los demás roles usan su sede y se ignora la del cuerpo', () => {
    expect(sedeParaCrear(secretaria, undefined)).toBe(1);
    expect(sedeParaCrear(secretaria, 2)).toBe(1);
  });

  it('un rol que no es Administrador y no tiene sede no crea nada', () => {
    expect(errorDe(() => sedeParaCrear(parrocoSinSede, 1)).codigo).toBe('SIN_PERMISO');
  });
});

describe('exigirSedeDelRecurso', () => {
  it('el Administrador accede a recursos de cualquier sede', () => {
    expect(() => exigirSedeDelRecurso(administrador, 1)).not.toThrow();
    expect(() => exigirSedeDelRecurso(administradorConSede, 2)).not.toThrow();
  });

  it('los demás roles acceden a los recursos de su sede', () => {
    expect(() => exigirSedeDelRecurso(secretaria, 1)).not.toThrow();
  });

  it('los demás roles reciben 403 con un recurso de otra sede', () => {
    const error = errorDe(() => exigirSedeDelRecurso(secretaria, 2));

    expect(error.codigo).toBe('SIN_PERMISO');
    expect(error.message).toBe('Este recurso pertenece a otra sede.');
  });

  it('un rol que no es Administrador y no tiene sede no accede a nada', () => {
    expect(errorDe(() => exigirSedeDelRecurso(parrocoSinSede, 1)).codigo).toBe('SIN_PERMISO');
  });
});
