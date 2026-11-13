// Caché de lecturas públicas en Redis (ADR-02) contra la aplicación real, PostgreSQL y Redis.
// La caché se activa solo en este archivo (en las demás pruebas va apagada, ver vitest.config.js).
// Los datos de prueba (una sede temporal con un horario) se borran al final.
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PREFIJO_CACHE, RECURSOS_CACHE, TTL_SEGUNDOS } from '../../src/constantes/cache.js';

vi.stubEnv('CACHE_HABILITADA', 'true');

const { createApp } = await import('../../src/app.js');
const { consultar, cerrarPool } = await import('../../src/db/index.js');
const { cerrarRedis, obtenerRedis } = await import('../../src/db/redis.js');
const { invalidarRecursos, leerConCache } = await import('../../src/services/cache.service.js');

const app = createApp();
const PRINCIPAL = 'senor-de-la-exaltacion';
let sedeTemporal;

const obtener = (ruta) => request(app).get(ruta);

async function borrarCache() {
  const redis = obtenerRedis();
  const claves = await redis.keys(`${PREFIJO_CACHE}:*`);
  if (claves.length > 0) await redis.del(...claves);
}
const clavesDeDatos = () => obtenerRedis().keys(`${PREFIJO_CACHE}:d:*`);

beforeAll(async () => {
  const { rows } = await consultar(
    `INSERT INTO sede (tipo_sede_id, nombre, slug)
     VALUES ((SELECT id FROM tipo_sede ORDER BY id LIMIT 1), 'Sede de caché', $1)
     RETURNING id, slug`,
    [`prueba-${randomUUID()}`.slice(0, 40)],
  );
  sedeTemporal = rows[0];
});

beforeEach(borrarCache);

afterAll(async () => {
  await borrarCache();
  await consultar('DELETE FROM horario WHERE sede_id = $1', [sedeTemporal.id]);
  await consultar('DELETE FROM sede WHERE id = $1', [sedeTemporal.id]);
  await cerrarPool();
  await cerrarRedis();
});

describe('endpoints públicos de /api/sedes', () => {
  const ENDPOINTS = [
    '/api/sedes',
    `/api/sedes/${PRINCIPAL}`,
    `/api/sedes/${PRINCIPAL}/horarios`,
    `/api/sedes/${PRINCIPAL}/servicios`,
    `/api/sedes/${PRINCIPAL}/servicios/bautismo`,
    `/api/sedes/${PRINCIPAL}/grupos-pastorales`,
    `/api/sedes/${PRINCIPAL}/videos`,
    `/api/sedes/${PRINCIPAL}/publicaciones?tipo=AVISO&porPagina=3`,
    `/api/sedes/${PRINCIPAL}/publicaciones/primeras-comuniones-42-ninos`,
    `/api/sedes/${PRINCIPAL}/eventos?porPagina=4`,
    `/api/sedes/${PRINCIPAL}/proclamas`,
    `/api/sedes/${PRINCIPAL}/proclamas/historial?porPagina=2`,
    `/api/sedes/${PRINCIPAL}/boletines?porPagina=1`,
    `/api/sedes/${PRINCIPAL}/paginas`,
    `/api/sedes/${PRINCIPAL}/paginas/inicio`,
  ];

  it.each(ENDPOINTS)(
    '%s: la primera lectura es MISS, la segunda HIT y el cuerpo es igual',
    async (ruta) => {
      const primera = await obtener(ruta);
      const segunda = await obtener(ruta);

      expect(primera.status).toBe(200);
      expect(primera.headers['x-cache']).toBe('MISS');
      expect(segunda.status).toBe(200);
      expect(segunda.headers['x-cache']).toBe('HIT');
      expect(segunda.body).toEqual(primera.body);
    },
  );

  it('el estado, el cuerpo y las cabeceras de una respuesta desde caché son los de la original', async () => {
    const ruta = `/api/sedes/${PRINCIPAL}/eventos`;
    const primera = await obtener(ruta);
    const segunda = await obtener(ruta);

    expect(segunda.headers['content-type']).toBe(primera.headers['content-type']);
    expect(segunda.body.paginacion).toEqual(primera.body.paginacion);
    expect(segunda.headers['x-request-id']).not.toBe(primera.headers['x-request-id']);
  });
});

describe('claves y variantes', () => {
  it('cada combinación de filtros y paginación se guarda por separado', async () => {
    const base = `/api/sedes/${PRINCIPAL}/publicaciones`;

    expect((await obtener(`${base}?tipo=AVISO`)).headers['x-cache']).toBe('MISS');
    expect((await obtener(`${base}?tipo=NOTICIA`)).headers['x-cache']).toBe('MISS');
    expect((await obtener(`${base}?tipo=AVISO&pagina=2`)).headers['x-cache']).toBe('MISS');
    expect((await obtener(`${base}?tipo=AVISO`)).headers['x-cache']).toBe('HIT');
    // Mismos valores, otro orden de los parámetros (y con el valor por defecto explícito).
    expect((await obtener(`${base}?pagina=1&tipo=AVISO&porPagina=10`)).headers['x-cache']).toBe(
      'HIT',
    );
  });

  it('el detalle de una publicación y la lista no se confunden', async () => {
    const lista = await obtener(`/api/sedes/${PRINCIPAL}/publicaciones`);
    const detalle = await obtener(
      `/api/sedes/${PRINCIPAL}/publicaciones/primeras-comuniones-42-ninos`,
    );

    expect(detalle.headers['x-cache']).toBe('MISS');
    expect(Array.isArray(lista.body.datos)).toBe(true);
    expect(detalle.body.datos.slug).toBe('primeras-comuniones-42-ninos');
  });

  it('las claves llevan la sede y el recurso, y caducan con el TTL de la constante', async () => {
    const sede = (await obtener(`/api/sedes/${PRINCIPAL}`)).body.datos;
    await obtener(`/api/sedes/${PRINCIPAL}/horarios`);
    await obtener(`/api/sedes/${PRINCIPAL}/eventos`);

    const claves = await clavesDeDatos();
    const de = (recurso, sedeId) =>
      claves.find((clave) => clave.startsWith(`${PREFIJO_CACHE}:d:${sedeId}:${recurso}:`));
    expect(de(RECURSOS_CACHE.HORARIOS, sede.id)).toBeTruthy();
    expect(de(RECURSOS_CACHE.EVENTOS, sede.id)).toBeTruthy();
    expect(de(RECURSOS_CACHE.SEDE, sede.id)).toBeTruthy();

    const redis = obtenerRedis();
    for (const [recurso, ttl] of [
      [RECURSOS_CACHE.HORARIOS, TTL_SEGUNDOS.horarios],
      [RECURSOS_CACHE.EVENTOS, TTL_SEGUNDOS.eventos],
    ]) {
      const restante = await redis.ttl(de(recurso, sede.id));
      expect(restante).toBeGreaterThan(ttl - 5);
      expect(restante).toBeLessThanOrEqual(ttl);
    }
  });

  it('la sede se resuelve una vez y se guarda (lista global, sin id de sede)', async () => {
    await obtener(`/api/sedes/${PRINCIPAL}/horarios`);
    const claves = await clavesDeDatos();
    expect(claves.some((clave) => clave.startsWith(`${PREFIJO_CACHE}:d:global:sedes:`))).toBe(true);
  });

  it('un 404 no se guarda: ni el slug de publicación inexistente ni la sede inexistente', async () => {
    for (const ruta of [
      `/api/sedes/${PRINCIPAL}/publicaciones/no-existe-este-slug`,
      `/api/sedes/${PRINCIPAL}/servicios/no-existe`,
      `/api/sedes/${PRINCIPAL}/paginas/no-existe`,
      '/api/sedes/sede-inexistente/horarios',
    ]) {
      const primera = await obtener(ruta);
      const segunda = await obtener(ruta);
      expect(primera.status, ruta).toBe(404);
      expect(segunda.status, ruta).toBe(404);
      expect(segunda.headers['x-cache'], ruta).not.toBe('HIT');
    }
  });

  it('un error de validación (400) no se guarda', async () => {
    const ruta = `/api/sedes/${PRINCIPAL}/eventos?porPagina=999`;
    expect((await obtener(ruta)).status).toBe(400);
    expect((await obtener(ruta)).status).toBe(400);
  });
});

describe('lo guardado se sirve hasta que se invalida', () => {
  const horarios = () => obtener(`/api/sedes/${sedeTemporal.slug}/horarios`);
  const descripciones = (respuesta) =>
    respuesta.body.datos.flatMap((grupo) =>
      grupo.filas.flatMap((fila) => fila.horarios.map((horario) => horario.descripcion)),
    );

  const insertarHorario = (descripcion, hora) =>
    consultar(
      `INSERT INTO horario (sede_id, tipo_horario_id, dia_semana, hora_inicio, descripcion)
       VALUES ($1, (SELECT id FROM tipo_horario ORDER BY id LIMIT 1), 1, $3, $2)`,
      [sedeTemporal.id, descripcion, hora],
    );

  it('un cambio hecho directo en la base no se ve hasta invalidar; después se ve de inmediato', async () => {
    await consultar('DELETE FROM horario WHERE sede_id = $1', [sedeTemporal.id]);
    await insertarHorario('Primero', '08:00');

    expect(descripciones(await horarios())).toEqual(['Primero']);

    await insertarHorario('Segundo', '09:00');
    const guardada = await horarios();
    expect(guardada.headers['x-cache']).toBe('HIT');
    expect(descripciones(guardada)).toEqual(['Primero']);

    await invalidarRecursos(sedeTemporal.id, [RECURSOS_CACHE.HORARIOS]);

    const nueva = await horarios();
    expect(nueva.headers['x-cache']).toBe('MISS');
    expect(descripciones(nueva).sort()).toEqual(['Primero', 'Segundo']);
    expect((await horarios()).headers['x-cache']).toBe('HIT');
  });

  it('invalidar un recurso o una sede no toca los demás', async () => {
    await obtener(`/api/sedes/${PRINCIPAL}/horarios`);
    await obtener(`/api/sedes/${PRINCIPAL}/eventos`);
    await horarios();
    const sedePrincipal = (await obtener(`/api/sedes/${PRINCIPAL}`)).body.datos;

    await invalidarRecursos(sedePrincipal.id, [RECURSOS_CACHE.HORARIOS]);

    expect((await obtener(`/api/sedes/${PRINCIPAL}/horarios`)).headers['x-cache']).toBe('MISS');
    expect((await obtener(`/api/sedes/${PRINCIPAL}/eventos`)).headers['x-cache']).toBe('HIT');
    expect((await horarios()).headers['x-cache']).toBe('HIT');
  });

  it('invalidar descarta todas las variantes del recurso', async () => {
    const base = `/api/sedes/${PRINCIPAL}/publicaciones`;
    const sede = (await obtener(`/api/sedes/${PRINCIPAL}`)).body.datos;
    for (const consulta of ['?tipo=AVISO', '?tipo=NOTICIA', '/primeras-comuniones-42-ninos']) {
      await obtener(base + consulta);
    }

    await invalidarRecursos(sede.id, [RECURSOS_CACHE.PUBLICACIONES, RECURSOS_CACHE.PUBLICACIONES]);

    for (const consulta of ['?tipo=AVISO', '?tipo=NOTICIA', '/primeras-comuniones-42-ninos']) {
      expect((await obtener(base + consulta)).headers['x-cache'], consulta).toBe('MISS');
    }
  });

  it('una lectura lenta que empezó antes del cambio no deja datos viejos', async () => {
    const clave = { recurso: RECURSOS_CACHE.VIDEOS, sedeId: sedeTemporal.id, variante: 'x' };

    // Mientras la lectura carga de la base, otro proceso invalida: lo que guarda ya es viejo.
    const lenta = await leerConCache(clave, async () => {
      await invalidarRecursos(sedeTemporal.id, [RECURSOS_CACHE.VIDEOS]);
      return 'dato viejo';
    });
    expect(lenta).toEqual({ valor: 'dato viejo', acierto: false });

    const siguiente = await leerConCache(clave, async () => 'dato nuevo');
    expect(siguiente).toEqual({ valor: 'dato nuevo', acierto: false });
  });

  it('un valor dañado en Redis se recarga y se reemplaza', async () => {
    const clave = { recurso: RECURSOS_CACHE.VIDEOS, sedeId: sedeTemporal.id, variante: 'dañado' };
    await leerConCache(clave, async () => ({ bien: true }));

    const redis = obtenerRedis();
    const [guardada] = await redis.keys(`${PREFIJO_CACHE}:d:${sedeTemporal.id}:videos:*`);
    await redis.set(guardada, '{no es json');

    expect(await leerConCache(clave, async () => ({ bien: 'recargado' }))).toEqual({
      valor: { bien: 'recargado' },
      acierto: false,
    });
    expect((await leerConCache(clave, async () => 'otro')).valor).toEqual({ bien: 'recargado' });
  });

  it('la generación no vuelve atrás si Redis pierde la clave: una invalidación nueva no revive lo viejo', async () => {
    const clave = { recurso: RECURSOS_CACHE.VIDEOS, sedeId: sedeTemporal.id, variante: 'g' };
    await leerConCache(clave, async () => 'v1');
    await invalidarRecursos(sedeTemporal.id, [RECURSOS_CACHE.VIDEOS]);
    await leerConCache(clave, async () => 'v2');

    // Se pierde solo la clave de la generación (ej. desalojo) y se invalida otra vez.
    await obtenerRedis().del(`${PREFIJO_CACHE}:g:${sedeTemporal.id}:videos`);
    await invalidarRecursos(sedeTemporal.id, [RECURSOS_CACHE.VIDEOS]);

    expect((await leerConCache(clave, async () => 'v3')).valor).toBe('v3');
  });
});
