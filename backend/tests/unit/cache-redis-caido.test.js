// ADR-02: la API no cae por Redis. Se simula un Redis en memoria que se puede «apagar» para probar
// qué hace la caché cuando no responde: lee de la base, avisa en el log, hace una pausa para no
// esperar en cada petición y recuerda las invalidaciones que no pudo hacer.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PAUSA_REDIS_CAIDO_MS, RECURSOS_CACHE } from '../../src/constantes/cache.js';

// Redis en memoria con las pocas operaciones que usa la caché. "caido": todo comando falla.
const redisFalso = vi.hoisted(() => {
  const estado = { caido: false, datos: new Map(), comandos: 0 };

  const comando = (operacion) =>
    vi.fn(async (...argumentos) => {
      estado.comandos++;
      if (estado.caido) throw Object.assign(new Error('Connection is closed.'), { code: 'EPIPE' });
      return operacion(...argumentos);
    });

  const cliente = {
    get: comando((clave) => estado.datos.get(clave) ?? null),
    set: comando((clave, valor) => {
      estado.datos.set(clave, valor);
      return 'OK';
    }),
    // Solo el script de invalidar: crea la clave con el valor dado si no existe y suma 1.
    eval: comando((_script, _cantidad, clave, inicial) => {
      if (!estado.datos.has(clave)) estado.datos.set(clave, inicial);
      const nuevo = String(Number(estado.datos.get(clave)) + 1);
      estado.datos.set(clave, nuevo);
      return Number(nuevo);
    }),
  };
  return { estado, cliente };
});

const avisos = vi.hoisted(() => ({ warn: vi.fn() }));

vi.mock('../../src/db/redis.js', () => ({
  obtenerRedis: () => redisFalso.cliente,
  cerrarRedis: vi.fn(),
}));
vi.mock('../../src/config/entorno.js', () => ({
  obtenerEntorno: () => ({ cacheHabilitada: true }),
}));
vi.mock('../../src/config/logger.js', () => ({ obtenerLogger: () => avisos }));

const { invalidarRecursos, leerConCache, reiniciarEstadoDeRedis } =
  await import('../../src/services/cache.service.js');

const { HORARIOS, EVENTOS } = RECURSOS_CACHE;
const clave = (recurso = HORARIOS) => ({ recurso, sedeId: 1, variante: 'x' });
const comandos = () => redisFalso.estado.comandos;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  redisFalso.estado.caido = false;
  redisFalso.estado.datos.clear();
  redisFalso.estado.comandos = 0;
  reiniciarEstadoDeRedis();
  avisos.warn.mockClear();
  redisFalso.cliente.get.mockClear();
  redisFalso.cliente.set.mockClear();
  redisFalso.cliente.eval.mockClear();
});

afterEach(() => vi.useRealTimers());

const pasar = (ms) => vi.setSystemTime(Date.now() + ms);

describe('con Redis funcionando', () => {
  it('guarda y sirve desde la caché', async () => {
    expect(await leerConCache(clave(), async () => 'a')).toEqual({ valor: 'a', acierto: false });
    expect(await leerConCache(clave(), async () => 'b')).toEqual({ valor: 'a', acierto: true });
    expect(avisos.warn).not.toHaveBeenCalled();
  });
});

describe('con Redis caído', () => {
  beforeEach(() => {
    redisFalso.estado.caido = true;
  });

  it('lee de la base, marca sinRedis y deja la advertencia en el log, sin lanzar nunca', async () => {
    const log = { warn: vi.fn() };

    const respuesta = await leerConCache({ ...clave(), log }, async () => ({ datos: [1] }));

    expect(respuesta).toEqual({ valor: { datos: [1] }, acierto: false, sinRedis: true });
    expect(log.warn).toHaveBeenCalledTimes(1);
    expect(log.warn.mock.calls[0][0]).toEqual({ motivo: 'EPIPE' });
    expect(log.warn.mock.calls[0][1]).toMatch(/Redis no responde; se lee de PostgreSQL/);
  });

  it('un error de la base (ej. 404) llega igual que sin caché', async () => {
    const noEncontrado = Object.assign(new Error('No existe'), { codigo: 'NO_ENCONTRADO' });
    await expect(
      leerConCache(clave(), async () => {
        throw noEncontrado;
      }),
    ).rejects.toBe(noEncontrado);
  });

  it('tras el primer fallo hace una pausa: no vuelve a intentar Redis, pero sigue avisando', async () => {
    await leerConCache(clave(), async () => 1);
    const despuesDelPrimero = comandos();

    for (let i = 0; i < 5; i++) {
      const respuesta = await leerConCache(clave(), async () => 2);
      expect(respuesta).toEqual({ valor: 2, acierto: false, sinRedis: true });
    }

    expect(comandos()).toBe(despuesDelPrimero);
    expect(avisos.warn).toHaveBeenCalledTimes(6);
    expect(avisos.warn.mock.calls[5][1]).toMatch(/Redis no disponible/);
  });

  it('pasada la pausa, una sola petición prueba Redis; las demás siguen sin él', async () => {
    await leerConCache(clave(), async () => 1);
    pasar(PAUSA_REDIS_CAIDO_MS + 1);
    const antes = comandos();

    // Cinco peticiones a la vez: solo una (la «sonda») llega a Redis.
    const resultados = await Promise.all(
      Array.from({ length: 5 }, () => leerConCache(clave(), async () => 3)),
    );

    expect(resultados.every((r) => r.valor === 3 && r.sinRedis === true)).toBe(true);
    expect(comandos() - antes).toBe(1);
  });

  it('si la sonda falla, la pausa se repite', async () => {
    await leerConCache(clave(), async () => 1);
    pasar(PAUSA_REDIS_CAIDO_MS + 1);
    await leerConCache(clave(), async () => 1); // la sonda
    const antes = comandos();

    pasar(PAUSA_REDIS_CAIDO_MS / 2);
    await leerConCache(clave(), async () => 1);
    expect(comandos()).toBe(antes);

    pasar(PAUSA_REDIS_CAIDO_MS);
    await leerConCache(clave(), async () => 1);
    expect(comandos()).toBeGreaterThan(antes);
  });

  it('cuando Redis vuelve y termina la pausa, se retoma la caché sin reiniciar la API', async () => {
    await leerConCache(clave(), async () => 'desde la base');
    redisFalso.estado.caido = false;
    pasar(PAUSA_REDIS_CAIDO_MS + 1);

    expect(await leerConCache(clave(), async () => 'v1')).toEqual({ valor: 'v1', acierto: false });
    expect(await leerConCache(clave(), async () => 'v2')).toEqual({ valor: 'v1', acierto: true });
  });
});

describe('Redis que falla a medias', () => {
  it('si falla al guardar, igual responde, avisa y hace la pausa', async () => {
    redisFalso.cliente.set.mockRejectedValueOnce(
      Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }),
    );

    const respuesta = await leerConCache(clave(), async () => 'dato');

    expect(respuesta).toEqual({ valor: 'dato', acierto: false });
    expect(avisos.warn).toHaveBeenCalledWith(
      { motivo: 'ETIMEDOUT' },
      expect.stringMatching(/no se guardó/),
    );
    const antes = comandos();
    expect((await leerConCache(clave(), async () => 'otro')).sinRedis).toBe(true);
    expect(comandos()).toBe(antes);
  });
});

describe('invalidaciones con Redis caído', () => {
  it('no lanza y deja la advertencia', async () => {
    redisFalso.estado.caido = true;
    const log = { warn: vi.fn() };

    await expect(invalidarRecursos(1, [HORARIOS], log)).resolves.toBeUndefined();

    expect(log.warn).toHaveBeenCalledWith(
      { motivo: 'EPIPE' },
      expect.stringMatching(/queda pendiente/),
    );
  });

  it('se recuerda y se ejecuta al volver Redis, antes de servir lo guardado', async () => {
    // Se guarda una lectura, Redis se cae, el CMS modifica (no se puede invalidar) y Redis vuelve.
    await leerConCache(clave(), async () => 'viejo');
    redisFalso.estado.caido = true;
    await invalidarRecursos(1, [HORARIOS]);
    redisFalso.estado.caido = false;
    pasar(PAUSA_REDIS_CAIDO_MS + 1);

    // Lo guardado es anterior al cambio: no debe servirse.
    expect(await leerConCache(clave(), async () => 'nuevo')).toEqual({
      valor: 'nuevo',
      acierto: false,
    });
    expect(await leerConCache(clave(), async () => 'otro')).toEqual({
      valor: 'nuevo',
      acierto: true,
    });
  });

  it('solo se descartan los recursos que tenían la invalidación pendiente', async () => {
    await leerConCache(clave(HORARIOS), async () => 'h');
    await leerConCache(clave(EVENTOS), async () => 'e');
    redisFalso.estado.caido = true;
    await invalidarRecursos(1, [HORARIOS]);
    redisFalso.estado.caido = false;
    pasar(PAUSA_REDIS_CAIDO_MS + 1);

    expect((await leerConCache(clave(EVENTOS), async () => 'otro')).acierto).toBe(true);
    expect((await leerConCache(clave(HORARIOS), async () => 'nuevo')).acierto).toBe(false);
  });

  it('con la pausa activa también queda pendiente, sin tocar Redis', async () => {
    redisFalso.estado.caido = true;
    await leerConCache(clave(), async () => 1);
    const antes = comandos();

    await invalidarRecursos(1, [HORARIOS, HORARIOS]);

    expect(comandos()).toBe(antes);
    redisFalso.estado.caido = false;
    pasar(PAUSA_REDIS_CAIDO_MS + 1);
    await leerConCache(clave(), async () => 2);
    expect(redisFalso.cliente.eval).toHaveBeenCalledTimes(1);
  });

  it('si Redis vuelve a caerse mientras se vacían las pendientes, siguen pendientes', async () => {
    redisFalso.estado.caido = true;
    await invalidarRecursos(1, [HORARIOS]);
    pasar(PAUSA_REDIS_CAIDO_MS + 1);

    // Redis responde a la lectura pero falla al invalidar.
    redisFalso.cliente.eval.mockRejectedValueOnce(new Error('Connection is closed.'));
    redisFalso.estado.caido = false;
    expect((await leerConCache(clave(), async () => 'a')).sinRedis).toBe(true);

    pasar(PAUSA_REDIS_CAIDO_MS + 1);
    expect(await leerConCache(clave(), async () => 'b')).toEqual({ valor: 'b', acierto: false });
    // Tres intentos: el que falló al invalidar, el que falló al vaciar las pendientes y el que sirvió.
    expect(redisFalso.cliente.eval).toHaveBeenCalledTimes(3);
  });
});
