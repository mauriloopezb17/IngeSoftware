// Los catálogos de la API deben coincidir exactamente con las filas de la base (seed + migraciones).
// Si alguien renombra o agrega una fila, esta prueba avisa antes de que una respuesta falle.
import { afterAll, describe, it, expect } from 'vitest';
import {
  ESTADOS_PUBLICACION,
  ROLES,
  TIPOS_PUBLICACION,
  TIPOS_SEDE,
} from '../../src/constantes/catalogos.js';
import { cerrarPool, consultar } from '../../src/db/index.js';

afterAll(async () => {
  await cerrarPool();
});

describe.each([
  ['estado_publicacion', ESTADOS_PUBLICACION],
  ['tipo_publicacion', TIPOS_PUBLICACION],
  ['tipo_sede', TIPOS_SEDE],
  ['rol', ROLES],
])('tabla %s', (tabla, catalogo) => {
  it('tiene exactamente los nombres del catálogo de la API', async () => {
    const { rows } = await consultar(`SELECT nombre FROM ${tabla} ORDER BY nombre`);

    expect(rows.map((fila) => fila.nombre)).toEqual(Object.values(catalogo.nombres).sort());
  });
});
