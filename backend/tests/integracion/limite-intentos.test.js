// Servicio del límite de intentos contra el Redis local (el de REDIS_URL).
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cerrarRedis, obtenerRedis } from '../../src/db/redis.js';
import { ErrorApp } from '../../src/errores/ErrorApp.js';
import {
  conLimiteDeIntentos,
  exigirIntentosDisponibles,
  MAXIMO_FALLOS_POR_IP,
  MAXIMO_FALLOS_POR_IP_Y_CORREO,
  registrarIntentoFallido,
  VENTANA_SEGUNDOS,
} from '../../src/services/limiteIntentos.service.js';
import { limpiarContadoresDeIntentos } from '../apoyo/limite.js';

const IP = '203.0.113.10';
const CORREO = 'persona@parroquia.test';

beforeEach(limpiarContadoresDeIntentos);

afterAll(async () => {
  await limpiarContadoresDeIntentos();
  await cerrarRedis();
});

const fallar = async (veces, clientes = { ip: IP, correo: CORREO }) => {
  for (let i = 0; i < veces; i++) await registrarIntentoFallido(clientes);
};

// El ErrorApp que lanza la promesa (falla la prueba si no lanza).
async function errorDe(promesa) {
  try {
    await promesa;
  } catch (error) {
    expect(error).toBeInstanceOf(ErrorApp);
    return error;
  }
  throw new Error('Se esperaba un ErrorApp');
}

const claves = async () => obtenerRedis().keys('auth:fallos:*');

describe('límite por IP y correo (5 fallos cada 15 minutos)', () => {
  it('permite los primeros 5 intentos fallidos y bloquea a partir del siguiente', async () => {
    await fallar(MAXIMO_FALLOS_POR_IP_Y_CORREO - 1);
    await expect(exigirIntentosDisponibles({ ip: IP, correo: CORREO })).resolves.toBeUndefined();

    await fallar(1);
    const error = await errorDe(exigirIntentosDisponibles({ ip: IP, correo: CORREO }));

    expect(error.codigo).toBe('DEMASIADAS_SOLICITUDES');
    expect(error.estado).toBe(429);
    expect(error.message).toBe('Demasiados intentos fallidos. Vuelve a intentarlo en 15 minutos.');
    expect(error.reintentarEnSegundos).toBeGreaterThan(VENTANA_SEGUNDOS - 5);
    expect(error.reintentarEnSegundos).toBeLessThanOrEqual(VENTANA_SEGUNDOS);
  });

  it('no bloquea a otro correo desde la misma IP ni al mismo correo desde otra IP', async () => {
    await fallar(MAXIMO_FALLOS_POR_IP_Y_CORREO);

    await expect(
      exigirIntentosDisponibles({ ip: IP, correo: 'otra@parroquia.test' }),
    ).resolves.toBeUndefined();
    await expect(
      exigirIntentosDisponibles({ ip: '203.0.113.11', correo: CORREO }),
    ).resolves.toBeUndefined();
  });

  it('el correo se compara sin distinguir mayúsculas', async () => {
    await fallar(MAXIMO_FALLOS_POR_IP_Y_CORREO, { ip: IP, correo: CORREO.toUpperCase() });

    const error = await errorDe(exigirIntentosDisponibles({ ip: IP, correo: CORREO }));

    expect(error.codigo).toBe('DEMASIADAS_SOLICITUDES');
  });
});

describe('límite por IP (20 fallos cada 15 minutos)', () => {
  it('bloquea a toda la IP aunque cada correo no llegue a 5', async () => {
    for (let i = 0; i < MAXIMO_FALLOS_POR_IP; i++) {
      await registrarIntentoFallido({ ip: IP, correo: `persona-${i}@parroquia.test` });
    }

    const error = await errorDe(
      exigirIntentosDisponibles({ ip: IP, correo: 'nuevo@parroquia.test' }),
    );
    expect(error.codigo).toBe('DEMASIADAS_SOLICITUDES');

    await expect(
      exigirIntentosDisponibles({ ip: '203.0.113.99', correo: 'nuevo@parroquia.test' }),
    ).resolves.toBeUndefined();
  });

  it('con 19 fallos todavía no bloquea', async () => {
    for (let i = 0; i < MAXIMO_FALLOS_POR_IP - 1; i++) {
      await registrarIntentoFallido({ ip: IP, correo: `persona-${i}@parroquia.test` });
    }

    await expect(
      exigirIntentosDisponibles({ ip: IP, correo: 'nuevo@parroquia.test' }),
    ).resolves.toBeUndefined();
  });
});

describe('ventana de 15 minutos', () => {
  it('los contadores caducan a los 15 minutos desde el primer fallo, sin extenderse', async () => {
    await fallar(1);
    const [primeraClave] = await claves();
    const ttlInicial = await obtenerRedis().ttl(primeraClave);

    await fallar(2);

    expect(ttlInicial).toBeGreaterThan(VENTANA_SEGUNDOS - 5);
    expect(ttlInicial).toBeLessThanOrEqual(VENTANA_SEGUNDOS);
    expect(await obtenerRedis().ttl(primeraClave)).toBeLessThanOrEqual(ttlInicial);
    for (const clave of await claves()) {
      expect(await obtenerRedis().ttl(clave)).toBeGreaterThan(0);
    }
  });

  it('al caducar el contador se vuelve a permitir', async () => {
    await fallar(MAXIMO_FALLOS_POR_IP_Y_CORREO);
    await errorDe(exigirIntentosDisponibles({ ip: IP, correo: CORREO }));

    for (const clave of await claves()) await obtenerRedis().del(clave);

    await expect(exigirIntentosDisponibles({ ip: IP, correo: CORREO })).resolves.toBeUndefined();
  });

  it.each([
    [30, 'en 1 minuto'],
    [60, 'en 1 minuto'],
    [61, 'en 2 minutos'],
    [11 * 60 + 1, 'en 12 minutos'],
    [VENTANA_SEGUNDOS, 'en 15 minutos'],
  ])('con %i segundos restantes el mensaje dice "%s"', async (segundos, esperado) => {
    await fallar(MAXIMO_FALLOS_POR_IP_Y_CORREO);
    for (const clave of await claves()) await obtenerRedis().expire(clave, segundos);

    const error = await errorDe(exigirIntentosDisponibles({ ip: IP, correo: CORREO }));

    expect(error.message).toBe(`Demasiados intentos fallidos. Vuelve a intentarlo ${esperado}.`);
    expect(error.reintentarEnSegundos).toBeGreaterThan(segundos - 3);
    expect(error.reintentarEnSegundos).toBeLessThanOrEqual(segundos);
  });
});

describe('conLimiteDeIntentos', () => {
  const esFallo = (error) => error.message === 'falló';

  it('un intento exitoso no cuenta', async () => {
    for (let i = 0; i < MAXIMO_FALLOS_POR_IP_Y_CORREO * 2; i++) {
      await conLimiteDeIntentos({ ip: IP, correo: CORREO }, async () => 'bien', esFallo);
    }

    expect(await claves()).toEqual([]);
  });

  it('un error que no es un intento fallido no cuenta', async () => {
    const tarea = () => Promise.reject(new Error('otra cosa'));

    await expect(conLimiteDeIntentos({ ip: IP, correo: CORREO }, tarea, esFallo)).rejects.toThrow(
      'otra cosa',
    );

    expect(await claves()).toEqual([]);
  });

  it('un intento fallido cuenta y relanza el mismo error; superado el límite ni se ejecuta', async () => {
    const tarea = vi.fn(() => Promise.reject(new Error('falló')));

    for (let i = 0; i < MAXIMO_FALLOS_POR_IP_Y_CORREO; i++) {
      await expect(conLimiteDeIntentos({ ip: IP, correo: CORREO }, tarea, esFallo)).rejects.toThrow(
        'falló',
      );
    }
    const error = await errorDe(conLimiteDeIntentos({ ip: IP, correo: CORREO }, tarea, esFallo));

    expect(error.codigo).toBe('DEMASIADAS_SOLICITUDES');
    expect(tarea).toHaveBeenCalledTimes(MAXIMO_FALLOS_POR_IP_Y_CORREO);
  });

  it('no guarda el correo en Redis', async () => {
    await fallar(1);

    for (const clave of await claves()) {
      expect(clave).not.toContain('persona');
      expect(clave).not.toContain('parroquia.test');
    }
  });
});
