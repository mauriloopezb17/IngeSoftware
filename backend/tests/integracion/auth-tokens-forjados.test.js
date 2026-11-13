// Tokens manipulados y CSRF contra la aplicación real: la API solo cree en la cookie firmada,
// y todo lo que importa (rol, sede, estado) lo lee de la base de datos.
import jwt from 'jsonwebtoken';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { obtenerEntorno } from '../../src/config/entorno.js';
import { cerrarPool } from '../../src/db/index.js';
import { cerrarRedis } from '../../src/db/redis.js';
import { limpiarContadoresDeIntentos } from '../apoyo/limite.js';
import { borrarUsuariosDePrueba, crearUsuarioDePrueba } from '../apoyo/usuarios.js';

const app = createApp();

beforeEach(limpiarContadoresDeIntentos);

afterAll(async () => {
  await limpiarContadoresDeIntentos();
  await borrarUsuariosDePrueba();
  await cerrarPool();
  await cerrarRedis();
});

const firmar = (id, contenido, opciones = {}) =>
  jwt.sign(contenido, obtenerEntorno().jwt.secreto, {
    algorithm: 'HS256',
    subject: String(id),
    expiresIn: '1h',
    ...opciones,
  });

async function iniciarSesion(usuario) {
  const respuesta = await request(app)
    .post('/api/auth/login')
    .send({ correo: usuario.correo, contrasena: usuario.contrasena });
  return respuesta.headers['set-cookie'][0].split(';')[0];
}

describe('tokens manipulados', () => {
  it('un token sin firma (alg none) de un usuario real no sirve', async () => {
    const usuario = await crearUsuarioDePrueba({ rol: 'ADMINISTRADOR', sede: null });
    const sinFirma = jwt.sign({ rol: 'ADMINISTRADOR', sede: null }, '', {
      algorithm: 'none',
      subject: String(usuario.id),
    });

    const respuesta = await request(app)
      .get('/api/auth/yo')
      .set('Cookie', `parroquia_sesion=${sinFirma}`);

    expect(respuesta.status).toBe(401);
  });

  it('el rol y la sede del token se ignoran: manda lo que dice la base de datos', async () => {
    const usuario = await crearUsuarioDePrueba({ rol: 'MARKETING' });
    const inflado = firmar(usuario.id, { rol: 'ADMINISTRADOR', sede: null });

    const respuesta = await request(app)
      .get('/api/auth/yo')
      .set('Cookie', `parroquia_sesion=${inflado}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos.rol.codigo).toBe('MARKETING');
    expect(respuesta.body.datos.sede.id).toBe(1);
    expect(respuesta.body.datos.permisos).not.toContain('usuarios.gestionar');
  });

  it('un token válido de un usuario sirve solo para ese usuario', async () => {
    const uno = await crearUsuarioDePrueba();
    const otro = await crearUsuarioDePrueba();

    const respuesta = await request(app)
      .get('/api/auth/yo')
      .set('Cookie', `parroquia_sesion=${firmar(uno.id, { rol: 'SECRETARIA', sede: 1 })}`);

    expect(respuesta.body.datos.correo).toBe(uno.correo);
    expect(respuesta.body.datos.correo).not.toBe(otro.correo);
  });

  it('un token sin sub no sirve', async () => {
    const sinSub = jwt.sign({ rol: 'ADMINISTRADOR' }, obtenerEntorno().jwt.secreto, {
      algorithm: 'HS256',
      expiresIn: '1h',
    });

    const respuesta = await request(app)
      .get('/api/auth/yo')
      .set('Cookie', `parroquia_sesion=${sinSub}`);

    expect(respuesta.status).toBe(401);
  });
});

describe('la sesión solo viaja en la cookie', () => {
  it('un token válido en Authorization: Bearer no abre sesión', async () => {
    const usuario = await crearUsuarioDePrueba();

    const respuesta = await request(app)
      .get('/api/auth/yo')
      .set('Authorization', `Bearer ${firmar(usuario.id, { rol: 'SECRETARIA', sede: 1 })}`);

    expect(respuesta.status).toBe(401);
  });

  it('un token válido en la URL no abre sesión', async () => {
    const usuario = await crearUsuarioDePrueba();
    const token = firmar(usuario.id, { rol: 'SECRETARIA', sede: 1 });

    const respuesta = await request(app).get(
      `/api/auth/yo?parroquia_sesion=${token}&token=${token}`,
    );

    expect(respuesta.status).toBe(401);
  });

  it('la cookie se reconoce entre otras cookies', async () => {
    const usuario = await crearUsuarioDePrueba();
    const cookie = await iniciarSesion(usuario);

    const respuesta = await request(app)
      .get('/api/auth/yo')
      .set('Cookie', `otra=1; ${cookie}; analitica=xyz`);

    expect(respuesta.status).toBe(200);
  });

  it('una cookie con otro nombre no sirve', async () => {
    const usuario = await crearUsuarioDePrueba();
    const token = (await iniciarSesion(usuario)).split('=')[1];

    const respuesta = await request(app).get('/api/auth/yo').set('Cookie', `sesion=${token}`);

    expect(respuesta.status).toBe(401);
  });
});

describe('CSRF contra la aplicación real', () => {
  it('login con Sec-Fetch-Site cross-site: 403 y sin cookie', async () => {
    const usuario = await crearUsuarioDePrueba();

    const respuesta = await request(app)
      .post('/api/auth/login')
      .set('Sec-Fetch-Site', 'cross-site')
      .send({ correo: usuario.correo, contrasena: usuario.contrasena });

    expect(respuesta.status).toBe(403);
    expect(respuesta.body.error.codigo).toBe('SIN_PERMISO');
    expect(respuesta.headers['set-cookie']).toBeUndefined();
  });

  it('logout con Origin "null": 403 y la cookie no se toca', async () => {
    const respuesta = await request(app).post('/api/auth/logout').set('Origin', 'null');

    expect(respuesta.status).toBe(403);
    expect(respuesta.headers['set-cookie']).toBeUndefined();
  });

  it.each(['post', 'patch', 'delete'])(
    '%s en /api/admin desde otro origen con sesión válida: 403 antes de cualquier otra cosa',
    async (metodo) => {
      const usuario = await crearUsuarioDePrueba();
      const cookie = await iniciarSesion(usuario);

      const respuesta = await request(app)
        [metodo]('/api/admin/avisos/1')
        .set('Cookie', cookie)
        .set('Origin', 'https://sitio-malo.example');

      expect(respuesta.status).toBe(403);
      expect(respuesta.body.error.codigo).toBe('SIN_PERMISO');
    },
  );

  it('las lecturas (GET) no se ven afectadas por el Origin', async () => {
    const respuesta = await request(app).get('/api/sedes').set('Origin', 'https://otro.example');

    expect(respuesta.status).toBe(200);
  });

  it('el Origin del frontend (CORS_ORIGEN) y Sec-Fetch-Site same-site funcionan', async () => {
    const usuario = await crearUsuarioDePrueba();

    const respuesta = await request(app)
      .post('/api/auth/login')
      .set('Origin', obtenerEntorno().corsOrigenes[0])
      .set('Sec-Fetch-Site', 'same-site')
      .send({ correo: usuario.correo, contrasena: usuario.contrasena });

    expect(respuesta.status).toBe(200);
  });
});
