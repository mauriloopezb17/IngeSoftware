// Atributos de la cookie de sesión según el entorno (docs/api/autenticacion.md, sección 1).
import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

// Entorno de producción con un secreto que no es el de ejemplo. Valores de prueba.
vi.mock('../../src/config/entorno.js', async (importOriginal) => {
  const original = await importOriginal();
  const entorno = original.validarEntorno({
    DATABASE_URL: 'postgres://usuario:clave@localhost:5432/db_portal_cms',
    REDIS_URL: 'redis://localhost:6379',
    JWT_SECRET: 'secreto-de-produccion-de-prueba-0123456789',
    NODE_ENV: 'production',
  });
  return { ...original, obtenerEntorno: () => entorno };
});

const { borrarCookieSesion, establecerCookieSesion } = await import('../../src/utils/sesion.js');

const app = express();
app.get('/poner', (_req, res) => {
  establecerCookieSesion(res, 'token-de-prueba', 28_800);
  res.end();
});
app.get('/borrar', (_req, res) => {
  borrarCookieSesion(res);
  res.end();
});

describe('cookie de sesión en producción', () => {
  it('lleva Secure además de HttpOnly, SameSite=Lax, Path=/api y Max-Age', async () => {
    const [cookie] = (await request(app).get('/poner')).headers['set-cookie'];

    expect(cookie).toMatch(/^parroquia_sesion=token-de-prueba;/);
    for (const atributo of ['Path=/api', 'HttpOnly', 'Secure', 'SameSite=Lax', 'Max-Age=28800']) {
      expect(cookie).toContain(atributo);
    }
  });

  it('al borrarla conserva los mismos atributos con Max-Age=0', async () => {
    const [cookie] = (await request(app).get('/borrar')).headers['set-cookie'];

    expect(cookie).toMatch(/^parroquia_sesion=;/);
    for (const atributo of ['Path=/api', 'HttpOnly', 'Secure', 'SameSite=Lax', 'Max-Age=0']) {
      expect(cookie).toContain(atributo);
    }
  });
});
