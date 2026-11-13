// ADR-02 de punta a punta: con la caché activa pero Redis inalcanzable (un puerto sin ningún
// servicio, con el cliente real de ioredis), el portal y el panel siguen funcionando contra
// PostgreSQL, sin errores y sin esperar a Redis en cada petición.
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { crearPanel } from '../apoyo/panel.js';

vi.stubEnv('CACHE_HABILITADA', 'true');
vi.stubEnv('REDIS_URL', 'redis://127.0.0.1:1');

const { createApp } = await import('../../src/app.js');
const { consultar, cerrarPool } = await import('../../src/db/index.js');
const { cerrarRedis } = await import('../../src/db/redis.js');
const { reiniciarEstadoDeRedis } = await import('../../src/services/cache.service.js');
const horariosService = await import('../../src/services/horarios.service.js');
const sedesService = await import('../../src/services/sedes.service.js');

const app = createApp();
const PRINCIPAL = 'senor-de-la-exaltacion';
const panel = crearPanel(app);
const { como } = panel;
let sede;

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

beforeAll(async () => {
  reiniciarEstadoDeRedis();
  sede = await panel.crearSede();
  await panel.conSesion('parroco', { rol: 'PARROCO', sede: sede.slug });
});

afterAll(async () => {
  await consultar('DELETE FROM horario WHERE sede_id = $1', [sede.id]);
  await panel.limpiar();
  await cerrarPool();
  await cerrarRedis();
});

describe('portal con Redis inalcanzable', () => {
  it.each(ENDPOINTS)('%s responde 200 desde la base, con X-Cache: BYPASS', async (ruta) => {
    const primera = await request(app).get(ruta);
    const segunda = await request(app).get(ruta);

    expect(primera.status).toBe(200);
    expect(segunda.status).toBe(200);
    expect(primera.headers['x-cache']).toBe('BYPASS');
    expect(segunda.headers['x-cache']).toBe('BYPASS');
    expect(segunda.body).toEqual(primera.body);
  });

  it('los datos son los de PostgreSQL (los mismos que da el servicio sin caché)', async () => {
    const lista = await request(app).get('/api/sedes');
    expect(lista.body.datos).toEqual(JSON.parse(JSON.stringify(await sedesService.listarSedes())));

    const principal = lista.body.datos.find((s) => s.slug === PRINCIPAL);
    const horarios = await request(app).get(`/api/sedes/${PRINCIPAL}/horarios`);
    expect(horarios.body.datos).toEqual(
      JSON.parse(JSON.stringify(await horariosService.listarHorarios(principal.id))),
    );
  });

  it('un 404 sigue siendo 404 y un 400 sigue siendo 400', async () => {
    expect((await request(app).get(`/api/sedes/${PRINCIPAL}/publicaciones/no-existe`)).status).toBe(
      404,
    );
    expect((await request(app).get('/api/sedes/sede-inexistente/horarios')).status).toBe(404);
    expect((await request(app).get(`/api/sedes/${PRINCIPAL}/eventos?porPagina=999`)).status).toBe(
      400,
    );
  });

  it('no espera a Redis en cada petición: tras el primer fallo, las siguientes son inmediatas', async () => {
    // Una primera lectura (que puede esperar a que falle la conexión) abre la pausa.
    await request(app).get(`/api/sedes/${PRINCIPAL}/horarios`);

    const inicio = performance.now();
    for (let i = 0; i < 30; i++) {
      expect((await request(app).get(`/api/sedes/${PRINCIPAL}/horarios`)).status).toBe(200);
    }
    // Sin la pausa, cada petición esperaría hasta 1 segundo a Redis (30 s en total).
    expect(performance.now() - inicio).toBeLessThan(3_000);
  });
});

describe('panel con Redis inalcanzable', () => {
  it('crear, editar y eliminar funciona, y el portal ve el cambio de inmediato (lee de la base)', async () => {
    const ruta = `/api/sedes/${sede.slug}/horarios`;
    const filas = (respuesta) => respuesta.body.datos.flatMap((tipo) => tipo.filas);

    const creado = await como('parroco').post('/api/admin/horarios', {
      tipoHorarioId: 1,
      diaSemana: 2,
      horaInicio: '07:00',
      descripcion: 'Sin Redis',
    });
    expect(creado.status).toBe(201);
    expect(filas(await request(app).get(ruta))[0].horarios[0].descripcion).toBe('Sin Redis');

    const editado = await como('parroco').patch(`/api/admin/horarios/${creado.body.datos.id}`, {
      horaInicio: '08:15',
    });
    expect(editado.status).toBe(200);
    expect(filas(await request(app).get(ruta))[0].horarios[0].horaInicio).toBe('08:15');

    const eliminado = await como('parroco').delete(`/api/admin/horarios/${creado.body.datos.id}`);
    expect(eliminado.status).toBe(204);
    expect((await request(app).get(ruta)).body.datos).toEqual([]);
  });

  it('/api/salud sigue respondiendo', async () => {
    expect((await request(app).get('/api/salud')).status).toBeLessThan(600);
  });
});
