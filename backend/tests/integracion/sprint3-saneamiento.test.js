// Pruebas de saneamiento de los endpoints nuevos del sprint 3 (PAR-164, PAR-166, PAR-170, PAR-171, PAR-172, PAR-173).
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { cerrarPool, consultar } from '../../src/db/index.js';
import { cerrarRedis } from '../../src/db/redis.js';
import { crearPanel, sedePrincipal } from '../apoyo/panel.js';

const app = createApp();
const panel = crearPanel(app);
const { como } = panel;

let sede;
let grupoId;
let servicioId;
let conteoInicial;

async function contarTablas() {
  const [u, p, s] = await Promise.all([
    consultar('SELECT count(*)::int AS n FROM usuario'),
    consultar('SELECT count(*)::int AS n FROM publicacion'),
    consultar('SELECT count(*)::int AS n FROM sede'),
  ]);
  return { usuario: u.rows[0].n, publicacion: p.rows[0].n, sede: s.rows[0].n };
}

function sinFugas(res) {
  const texto = JSON.stringify(res.body ?? {});
  expect(texto).not.toMatch(/\bSELECT\b|\bINSERT\b|\bUPDATE\b|pg_|node_modules|"stack"/i);
}

beforeAll(async () => {
  sede = await sedePrincipal();
  await panel.conSesion('admin', { rol: 'ADMINISTRADOR', sede: null });
  await panel.conSesion('parroco', { rol: 'PARROCO', sede: sede.slug });

  const [{ rows: grp }, { rows: srv }] = await Promise.all([
    consultar('SELECT id FROM grupo_pastoral WHERE sede_id = $1 AND visible LIMIT 1', [sede.id]),
    consultar('SELECT id FROM servicio WHERE sede_id = $1 AND visible LIMIT 1', [sede.id]),
  ]);
  grupoId = grp[0].id;
  servicioId = srv[0].id;
  conteoInicial = await contarTablas();
});

afterAll(async () => {
  await panel.limpiar();
  await cerrarPool();
  await cerrarRedis();
});

describe('saneamiento de endpoints nuevos del sprint 3', () => {
  const CASOS_PUBLICOS = [
    {
      nombre: 'árbol con parámetro desconocido',
      ruta: '/api/sedes/arbol?extra=1',
      estados: [400, 200],
    },
    {
      nombre: 'grupo slug traversal',
      ruta: `/api/sedes/${sede?.slug ?? 'senor-de-la-exaltacion'}/grupos-pastorales/..%2Fetc`,
      estados: [400, 404],
    },
    {
      nombre: 'grupo slug de 200 chars',
      ruta: `/api/sedes/senor-de-la-exaltacion/grupos-pastorales/${'a'.repeat(200)}`,
      estados: [400, 404],
    },
    {
      nombre: 'noticias de servicio slug malicioso',
      ruta: '/api/sedes/senor-de-la-exaltacion/servicios/..%2F/noticias',
      estados: [400, 404],
    },
    {
      nombre: 'noticias de servicio porPagina > 12',
      ruta: '/api/sedes/senor-de-la-exaltacion/servicios/bautismo/noticias?porPagina=99',
      estados: [400],
    },
    {
      nombre: 'noticias de servicio param desconocido',
      ruta: '/api/sedes/senor-de-la-exaltacion/servicios/bautismo/noticias?desconocido=1',
      estados: [400],
    },
    {
      nombre: 'noticias de grupo slug malicioso',
      ruta: '/api/sedes/senor-de-la-exaltacion/grupos-pastorales/..%2F/noticias',
      estados: [400, 404],
    },
    {
      nombre: 'noticias de grupo pagina=abc',
      ruta: '/api/sedes/senor-de-la-exaltacion/grupos-pastorales/coro/noticias?pagina=abc',
      estados: [400, 404],
    },
    { nombre: 'buscar sin q', ruta: '/api/sedes/senor-de-la-exaltacion/buscar', estados: [400] },
    {
      nombre: 'buscar con inyección SQL',
      ruta: `/api/sedes/senor-de-la-exaltacion/buscar?q=${encodeURIComponent("' OR '1'='1")}`,
      estados: [200, 400],
    },
    {
      nombre: 'buscar con tipo inválido',
      ruta: '/api/sedes/senor-de-la-exaltacion/buscar?q=misa&tipo=proclama',
      estados: [400],
    },
    {
      nombre: 'buscar con param desconocido',
      ruta: '/api/sedes/senor-de-la-exaltacion/buscar?q=misa&extra=1',
      estados: [400],
    },
  ];

  it.each(CASOS_PUBLICOS)('público — $nombre', async ({ ruta, estados }) => {
    const res = await request(app).get(ruta.replace('undefined', sede.slug));
    expect(estados).toContain(res.status);
    sinFugas(res);
  });

  // HALLAZGO: GET /api/sedes/:sede/grupos-pastorales/:slug responde 500 con byte nulo (%00) porque no valida el formato del slug antes de consultar PostgreSQL.
  it.fails('público — grupo slug con byte nulo no debe responder 500', async () => {
    const res = await request(app).get(`/api/sedes/${sede.slug}/grupos-pastorales/coro%00x`);
    expect([400, 404]).toContain(res.status);
  });

  const CASOS_ADMIN = [
    {
      nombre: 'mover sede con campo desconocido',
      rol: 'admin',
      metodo: 'post',
      ruta: () => `/api/admin/sedes/${sede.id}/mover`,
      cuerpo: { sedePadreId: null, orden: 0, extra: 'no' },
      estados: [400],
    },
    {
      nombre: 'mover sede con tipo erróneo en orden',
      rol: 'admin',
      metodo: 'post',
      ruta: () => `/api/admin/sedes/${sede.id}/mover`,
      cuerpo: { sedePadreId: null, orden: 'primero' },
      estados: [400],
    },
    {
      nombre: 'grupo detalle con campo desconocido',
      rol: 'admin',
      metodo: 'patch',
      ruta: () => `/api/admin/grupos-pastorales/${grupoId}/detalle`,
      cuerpo: { extra: 1 },
      estados: [400],
    },
    {
      nombre: 'grupo detalle con id malicioso',
      rol: 'admin',
      metodo: 'patch',
      ruta: () => '/api/admin/grupos-pastorales/abc/detalle',
      cuerpo: {},
      estados: [400],
    },
    {
      nombre: 'servicio detalle con campo desconocido',
      rol: 'admin',
      metodo: 'patch',
      ruta: () => `/api/admin/servicios/${servicioId}/detalle`,
      cuerpo: { visible: false },
      estados: [400],
    },
    {
      nombre: 'servicio detalle con galería > 24',
      rol: 'admin',
      metodo: 'patch',
      ruta: () => `/api/admin/servicios/${servicioId}/detalle`,
      cuerpo: { detalle: { galeria: Array.from({ length: 25 }, () => 1) } },
      estados: [400],
    },
    {
      nombre: 'usuarios grupoIds con tipo erróneo',
      rol: 'admin',
      metodo: 'post',
      ruta: () => '/api/admin/usuarios',
      cuerpo: {
        nombreCompleto: 'Prueba Mal',
        correo: 'mal@ejemplo.test',
        contrasena: 'ClaveValida123!',
        rol: 'COORDINADOR',
        sedeId: 1,
        grupoIds: ['no-numero'],
      },
      estados: [400],
    },
    {
      nombre: 'observación detalle con id no numérico',
      rol: 'parroco',
      metodo: 'get',
      ruta: () => '/api/admin/proclamas/observaciones/abc',
      estados: [400],
    },
    {
      nombre: 'observación detalle con id inexistente',
      rol: 'parroco',
      metodo: 'get',
      ruta: () => '/api/admin/proclamas/observaciones/99999999',
      estados: [404],
    },
  ];

  it.each(CASOS_ADMIN)('admin — $nombre', async ({ rol, metodo, ruta, cuerpo, estados }) => {
    const req = como(rol)[metodo](ruta(), cuerpo);
    const res = await req;
    expect(estados).toContain(res.status);
    sinFugas(res);
  });

  it('mantiene intactas las tablas usuario, publicacion y sede', async () => {
    expect(await contarTablas()).toEqual(conteoInicial);
  });
});
