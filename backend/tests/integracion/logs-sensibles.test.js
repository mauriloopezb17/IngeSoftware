// Censura de datos sensibles en logs (PAR-160.2): contraseñas, tokens, cabeceras de sesión,
// datos de contacto de observaciones y URLs/filtros con correos o teléfonos.
import { PassThrough } from 'node:stream';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { validarEntorno } from '../../src/config/entorno.js';
import { crearLogger, establecerLogger, reiniciarLogger } from '../../src/config/logger.js';
import { cerrarPool, consultar } from '../../src/db/index.js';
import { cerrarRedis } from '../../src/db/redis.js';
import { crearPanel, sedePrincipal } from '../apoyo/panel.js';

function crearCaptura() {
  const crudo = [];
  const lineas = [];
  const flujo = new PassThrough();
  let resto = '';
  flujo.on('data', (trozo) => {
    resto += trozo.toString('utf8');
    const partes = resto.split('\n');
    resto = partes.pop() ?? '';
    for (const linea of partes) {
      if (linea.trim()) {
        crudo.push(linea);
        lineas.push(JSON.parse(linea));
      }
    }
  });
  const logger = crearLogger(
    validarEntorno({
      NODE_ENV: 'production',
      DATABASE_URL: process.env.DATABASE_URL,
      REDIS_URL: process.env.REDIS_URL,
      JWT_SECRET: process.env.JWT_SECRET,
      LOG_LEVEL: 'info',
    }),
    { destino: flujo, nivel: 'info' },
  );
  return { logger, crudo, lineas };
}

const captura = crearCaptura();
establecerLogger(captura.logger);

const app = createApp();
const panel = crearPanel(app);
let sede;

beforeAll(async () => {
  sede = await sedePrincipal();
});

afterEach(() => {
  captura.crudo.length = 0;
  captura.lineas.length = 0;
});

afterAll(async () => {
  reiniciarLogger();
  await Promise.all([panel.limpiar(), cerrarPool(), cerrarRedis()]);
});

describe('ocultamiento de datos sensibles en logs (PAR-160.2)', () => {
  it('no registra contraseñas en login ni tokens en cabeceras Authorization/Cookie/Set-Cookie', async () => {
    const usuario = await panel.conSesion('secretaria', { rol: 'SECRETARIA', sede: sede.slug });
    const tokenEjemplo = 'jwt-super-secreto-de-prueba-123456';
    captura.crudo.length = 0;
    captura.lineas.length = 0;

    const loginResp = await request(app)
      .post('/api/auth/login')
      .set('Authorization', `Bearer ${tokenEjemplo}`)
      .set('Cookie', `sesion=${tokenEjemplo}`)
      .send({ correo: usuario.correo, contrasena: usuario.contrasena });
    expect(loginResp.status).toBe(200);

    const texto = captura.crudo.join('\n');
    expect(texto).not.toContain(usuario.contrasena);
    expect(texto).not.toContain(tokenEjemplo);
    expect(texto).not.toContain('sesion=');
    expect(captura.lineas.length).toBeGreaterThan(0);
    expect(captura.lineas[0].req?.headers?.authorization).toBe('[oculto]');
    expect(captura.lineas[0].req?.headers?.cookie).toBe('[oculto]');
    if (captura.lineas[0].res?.headers?.['set-cookie'] !== undefined) {
      expect(captura.lineas[0].res.headers['set-cookie']).toBe('[oculto]');
    }
  });

  it('no registra datos personales al enviar una observación ciudadana', async () => {
    const { rows } = await consultar(
      `SELECT id FROM proclama WHERE sede_id = $1 ORDER BY id LIMIT 1`,
      [sede.id],
    );
    const proclamaId = rows[0].id;
    const datos = {
      nombreCompleto: 'Carlos Mendoza Quispe',
      correo: 'carlos.mendoza.secreto@ejemplo.test',
      telefono: '+591 76543210',
      mensaje: 'Observación confidencial de prueba para verificar los logs.',
      sitioWeb: '',
    };

    const respuesta = await request(app)
      .post(`/api/sedes/${sede.slug}/proclamas/${proclamaId}/observaciones`)
      .send(datos);
    expect(respuesta.status).toBe(201);

    const texto = captura.crudo.join('\n');
    expect(texto).not.toContain(datos.nombreCompleto);
    expect(texto).not.toContain(datos.correo);
    expect(texto).not.toContain('76543210');
    expect(texto).not.toContain(datos.mensaje);
  });

  it('censura correos y teléfonos si llegan en la URL o en filtros de listados', async () => {
    await panel.conSesion('parroco', { rol: 'PARROCO', sede: sede.slug });
    captura.crudo.length = 0;
    captura.lineas.length = 0;

    const correo = 'persona.privada@ejemplo.test';
    const telefono = '+59171239876';

    const respuestaObs = await panel
      .como('parroco')
      .get('/api/admin/proclamas/observaciones?estado=todas&pagina=1');
    expect(respuestaObs.status).toBe(200);

    const respuestaFiltros = await panel
      .como('parroco')
      .get(
        `/api/admin/eventos?buscar=${encodeURIComponent(correo)}&correo=${encodeURIComponent(correo)}&telefono=${encodeURIComponent(telefono)}`,
      );
    expect(respuestaFiltros.status).toBe(200);

    const texto = captura.crudo.join('\n');
    expect(texto).not.toContain(correo);
    expect(texto).not.toContain('71239876');
  });
});
