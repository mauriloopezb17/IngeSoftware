// La matriz de permisos y los roles del código deben coincidir con docs/api/autenticacion.md:
// si el contrato cambia y el código no (o al revés), estas pruebas fallan.
import { describe, expect, it } from 'vitest';
import { ROLES } from '../../src/constantes/catalogos.js';
import { PERMISOS, permisosDe } from '../../src/constantes/permisos.js';
import { matrizDePermisosDelContrato, rolesDelContrato } from '../apoyo/contrato.js';

const matriz = matrizDePermisosDelContrato();

describe('matriz de permisos del contrato (sección 7)', () => {
  it('el contrato lista los 17 permisos', () => {
    expect(matriz).toHaveLength(17);
  });

  it('el código define los mismos permisos que el contrato, en el mismo orden', () => {
    expect(Object.values(PERMISOS)).toEqual(matriz.map((fila) => fila.permiso));
  });

  it.each(ROLES.codigos)('los permisos de %s coinciden con su columna del contrato', (rol) => {
    const delContrato = matriz.filter((fila) => fila.roles.includes(rol)).map((f) => f.permiso);

    expect(permisosDe(rol)).toEqual(delContrato);
  });

  it('cada permiso lo tiene al menos un rol', () => {
    for (const { permiso, roles } of matriz) {
      expect(roles.length, permiso).toBeGreaterThan(0);
    }
  });
});

describe('roles del contrato (sección 5)', () => {
  it('los códigos y nombres coinciden con el catálogo del código', () => {
    expect(rolesDelContrato()).toEqual(
      ROLES.codigos.map((codigo) => ({ codigo, nombre: ROLES.nombreDe(codigo) })),
    );
  });
});
