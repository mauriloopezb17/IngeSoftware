import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { obtenerEntorno } from '../../src/config/entorno.js';
import { manejarErrores } from '../../src/middlewares/errores.js';
import { protegerCsrf } from '../../src/middlewares/csrf.js';

// Mini aplicación: la protección y una ruta por método que responde 204 si la deja pasar.
const app = express();
app.use(protegerCsrf);
app.all('/ruta', (_req, res) => res.status(204).end());
app.use(manejarErrores);

const ORIGEN_PERMITIDO = obtenerEntorno().corsOrigenes[0];

describe('protegerCsrf', () => {
  it.each(['post', 'patch', 'delete'])('en %s deja pasar el origen permitido', async (metodo) => {
    const respuesta = await request(app)[metodo]('/ruta').set('Origin', ORIGEN_PERMITIDO);

    expect(respuesta.status).toBe(204);
  });

  it.each(['post', 'patch', 'delete'])(
    'en %s rechaza un origen distinto con 403',
    async (metodo) => {
      const respuesta = await request(app)
        [metodo]('/ruta')
        .set('Origin', 'https://sitio-malo.example');

      expect(respuesta.status).toBe(403);
      expect(respuesta.body.error.codigo).toBe('SIN_PERMISO');
    },
  );

  it('rechaza el origen "null" (páginas aisladas o iframes con sandbox)', async () => {
    const respuesta = await request(app).post('/ruta').set('Origin', 'null');

    expect(respuesta.status).toBe(403);
  });

  it('deja pasar una petición sin Origin (herramientas que no son un navegador)', async () => {
    expect((await request(app).post('/ruta')).status).toBe(204);
  });

  it('rechaza Sec-Fetch-Site cross-site aunque no venga Origin', async () => {
    const respuesta = await request(app).post('/ruta').set('Sec-Fetch-Site', 'cross-site');

    expect(respuesta.status).toBe(403);
    expect(respuesta.body.error.codigo).toBe('SIN_PERMISO');
  });

  it('rechaza Sec-Fetch-Site cross-site aunque el Origin sea el permitido', async () => {
    const respuesta = await request(app)
      .post('/ruta')
      .set('Origin', ORIGEN_PERMITIDO)
      .set('Sec-Fetch-Site', 'cross-site');

    expect(respuesta.status).toBe(403);
  });

  it.each(['same-origin', 'same-site', 'none'])(
    'deja pasar Sec-Fetch-Site %s con el origen permitido',
    async (valor) => {
      const respuesta = await request(app)
        .post('/ruta')
        .set('Origin', ORIGEN_PERMITIDO)
        .set('Sec-Fetch-Site', valor);

      expect(respuesta.status).toBe(204);
    },
  );

  it('no revisa los métodos que no modifican datos', async () => {
    const respuesta = await request(app)
      .get('/ruta')
      .set('Origin', 'https://sitio-malo.example')
      .set('Sec-Fetch-Site', 'cross-site');

    expect(respuesta.status).toBe(204);
  });
});
