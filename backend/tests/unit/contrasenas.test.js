import { describe, expect, it } from 'vitest';
import {
  contrasenaNueva,
  hashearContrasena,
  verificarContrasena,
  verificarContrasenaFicticia,
} from '../../src/utils/contrasenas.js';

// Hash del seed de desarrollo: contraseña Parroquia2026! (solo desarrollo).
const HASH_DEL_SEED =
  '$argon2id$v=19$m=65536,t=3,p=4$c3E6g1XexEgEjO0MBKo/HQ$rXnD45VqH6BWmFs96H0bO/1UG7406t/KeHhKONHLOcM';

describe('hashearContrasena y verificarContrasena', () => {
  it('genera un hash argon2id con los parámetros del seed y una sal distinta cada vez', async () => {
    const primero = await hashearContrasena('Exaltacion-Obrajes-167');
    const segundo = await hashearContrasena('Exaltacion-Obrajes-167');

    expect(primero).toMatch(/^\$argon2id\$v=19\$m=65536,t=3,p=4\$/);
    expect(primero).not.toBe(segundo);
    expect(primero).not.toContain('Exaltacion');
  });

  it('acepta la contraseña correcta y rechaza una incorrecta', async () => {
    const hash = await hashearContrasena('Exaltacion-Obrajes-167');

    expect(await verificarContrasena('Exaltacion-Obrajes-167', hash)).toBe(true);
    expect(await verificarContrasena('Exaltacion-Obrajes-168', hash)).toBe(false);
    expect(await verificarContrasena('', hash)).toBe(false);
  });

  it('verifica los hashes del seed', async () => {
    expect(await verificarContrasena('Parroquia2026!', HASH_DEL_SEED)).toBe(true);
    expect(await verificarContrasena('parroquia2026!', HASH_DEL_SEED)).toBe(false);
  });

  it('trata un hash dañado como contraseña incorrecta, sin lanzar errores', async () => {
    expect(await verificarContrasena('cualquiera', 'no-es-un-hash')).toBe(false);
    expect(await verificarContrasena('cualquiera', '')).toBe(false);
  });
});

describe('verificarContrasenaFicticia', () => {
  it('devuelve siempre false, incluso con la contraseña de un usuario real', async () => {
    expect(await verificarContrasenaFicticia('Parroquia2026!')).toBe(false);
    expect(await verificarContrasenaFicticia('')).toBe(false);
  });

  it('tarda lo mismo que una verificación real (no revela qué correos existen)', async () => {
    const medir = async (tarea) => {
      const inicio = performance.now();
      await tarea();
      return performance.now() - inicio;
    };

    await verificarContrasenaFicticia('calentamiento');
    const real = await medir(() => verificarContrasena('x', HASH_DEL_SEED));
    const ficticia = await medir(() => verificarContrasenaFicticia('x'));

    // Argon2 con 64 MiB tarda decenas de milisegundos: si no se verificara nada, sería casi 0.
    expect(ficticia).toBeGreaterThan(real / 4);
  });
});

describe('contrasenaNueva', () => {
  it('exige de 10 a 200 caracteres', () => {
    expect(contrasenaNueva.safeParse('a'.repeat(9)).success).toBe(false);
    expect(contrasenaNueva.safeParse('a'.repeat(10)).success).toBe(true);
    expect(contrasenaNueva.safeParse('a'.repeat(200)).success).toBe(true);
    expect(contrasenaNueva.safeParse('a'.repeat(201)).success).toBe(false);
  });

  it('rechaza lo que no es texto', () => {
    expect(contrasenaNueva.safeParse(1234567890).success).toBe(false);
    expect(contrasenaNueva.safeParse(undefined).success).toBe(false);
  });
});
