// Pruebas de integración de paginación, filtros y rechazo de parámetros inválidos en listados (PAR-158).
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { cerrarPool } from '../../src/db/index.js';
import { cerrarRedis } from '../../src/db/redis.js';
import { limpiarContadoresDeIntentos } from '../apoyo/limite.js';
import { SEDE_PRINCIPAL, borrarUsuariosDePrueba, crearUsuarioDePrueba } from '../apoyo/usuarios.js';

const app = createApp();
let cookieAdmin;
let cookieParroco;

beforeAll(async () => {
  await limpiarContadoresDeIntentos();
  const admin = await crearUsuarioDePrueba({ rol: 'ADMINISTRADOR', sede: null });
  const parroco = await crearUsuarioDePrueba({ rol: 'PARROCO' });
  const resAdmin = await request(app)
    .post('/api/auth/login')
    .send({ correo: admin.correo, contrasena: admin.contrasena });
  expect(resAdmin.status).toBe(200);
  cookieAdmin = resAdmin.headers['set-cookie'][0].split(';')[0];

  const resParroco = await request(app)
    .post('/api/auth/login')
    .send({ correo: parroco.correo, contrasena: parroco.contrasena });
  expect(resParroco.status).toBe(200);
  cookieParroco = resParroco.headers['set-cookie'][0].split(';')[0];
});

afterAll(async () => {
  await limpiarContadoresDeIntentos();
  await borrarUsuariosDePrueba();
  await cerrarPool();
  await cerrarRedis();
});

const LISTADOS_PORTAL = [
  { ruta: `/api/sedes/${SEDE_PRINCIPAL}/horarios`, filtro: 'tipo=1' },
  { ruta: `/api/sedes/${SEDE_PRINCIPAL}/servicios`, filtro: 'buscar=Bautismo' },
  { ruta: `/api/sedes/${SEDE_PRINCIPAL}/grupos-pastorales`, filtro: 'buscar=Monaguillos' },
  { ruta: `/api/sedes/${SEDE_PRINCIPAL}/videos`, filtro: 'destacado=true' },
  { ruta: `/api/sedes/${SEDE_PRINCIPAL}/publicaciones`, filtro: 'tipo=NOTICIA' },
  { ruta: `/api/sedes/${SEDE_PRINCIPAL}/eventos`, filtro: 'categoria=1' },
  { ruta: `/api/sedes/${SEDE_PRINCIPAL}/proclamas`, filtro: 'anio=2026' },
  { ruta: `/api/sedes/${SEDE_PRINCIPAL}/proclamas/historial`, filtro: 'anio=2026' },
  { ruta: `/api/sedes/${SEDE_PRINCIPAL}/boletines`, filtro: 'anio=2026' },
];

const LISTADOS_ADMIN = [
  { ruta: '/api/admin/publicaciones', filtro: 'tipo=NOTICIA' },
  { ruta: '/api/admin/eventos', filtro: 'estado=PUBLICADO' },
  { ruta: '/api/admin/proclamas', filtro: 'vigentes=true' },
  { ruta: '/api/admin/proclamas/observaciones', filtro: 'estado=todas', parroco: true },
  { ruta: '/api/admin/boletines', filtro: 'anio=2026' },
  { ruta: '/api/admin/multimedia', filtro: 'clase=IMAGEN' },
  { ruta: '/api/admin/usuarios', filtro: 'rol=PARROCO' },
  { ruta: '/api/admin/bitacora', filtro: 'accion=INSERT' },
  { ruta: '/api/admin/horarios', filtro: 'tipo=1' },
  { ruta: '/api/admin/servicios', filtro: 'visible=true' },
  { ruta: '/api/admin/grupos-pastorales', filtro: 'visible=true' },
  { ruta: '/api/admin/videos', filtro: 'destacado=true' },
  { ruta: '/api/admin/paginas', filtro: 'estado=PUBLICADO' },
  { ruta: '/api/admin/sedes', filtro: 'tipo=PARROQUIA' },
];

describe('Paginación, filtros y validación estricta en todos los listados (PAR-158)', () => {
  it.each(LISTADOS_PORTAL)(
    'portal $ruta pagina, devuelve total en página fuera de rango y rechaza parámetros inválidos',
    async ({ ruta, filtro }) => {
      const ok = await request(app).get(`${ruta}?${filtro}&pagina=1&porPagina=2`);
      expect(ok.status).toBe(200);
      expect(ok.body.paginacion).toEqual({
        pagina: 1,
        porPagina: 2,
        total: expect.any(Number),
        totalPaginas: expect.any(Number),
      });

      const fuera = await request(app).get(`${ruta}?pagina=9999&porPagina=2`);
      expect(fuera.status).toBe(200);
      expect(fuera.body.datos).toEqual([]);
      expect(fuera.body.paginacion.pagina).toBe(9999);
      expect(fuera.body.paginacion.total).toEqual(expect.any(Number));

      const desconocido = await request(app).get(`${ruta}?parametroInvalido=1`);
      expect(desconocido.status).toBe(400);
      expect(desconocido.body.error.codigo).toBe('VALIDACION');

      const repetido = await request(app).get(`${ruta}?pagina=1&pagina=2`);
      expect(repetido.status).toBe(400);
      expect(repetido.body.error.codigo).toBe('VALIDACION');
    },
  );

  it.each(LISTADOS_ADMIN)(
    'panel $ruta pagina, devuelve total en página fuera de rango y rechaza parámetros inválidos',
    async ({ ruta, filtro, parroco }) => {
      const cookie = parroco ? cookieParroco : cookieAdmin;
      const ok = await request(app)
        .get(`${ruta}?${filtro}&pagina=1&porPagina=2`)
        .set('Cookie', cookie);
      expect(ok.status).toBe(200);
      expect(ok.body.paginacion).toEqual({
        pagina: 1,
        porPagina: 2,
        total: expect.any(Number),
        totalPaginas: expect.any(Number),
      });

      const fuera = await request(app).get(`${ruta}?pagina=9999&porPagina=2`).set('Cookie', cookie);
      expect(fuera.status).toBe(200);
      expect(fuera.body.datos).toEqual([]);
      expect(fuera.body.paginacion.pagina).toBe(9999);
      expect(fuera.body.paginacion.total).toEqual(expect.any(Number));

      const desconocido = await request(app)
        .get(`${ruta}?parametroInvalido=1`)
        .set('Cookie', cookie);
      expect(desconocido.status).toBe(400);
      expect(desconocido.body.error.codigo).toBe('VALIDACION');

      const repetido = await request(app).get(`${ruta}?pagina=1&pagina=2`).set('Cookie', cookie);
      expect(repetido.status).toBe(400);
      expect(repetido.body.error.codigo).toBe('VALIDACION');
    },
  );
});
