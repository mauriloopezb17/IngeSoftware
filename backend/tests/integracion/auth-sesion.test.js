// GET /api/auth/yo, POST /api/auth/logout y POST /api/auth/cambiar-contrasena contra la base real.
import jwt from 'jsonwebtoken';
import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { obtenerEntorno } from '../../src/config/entorno.js';
import { cerrarPool, consultar } from '../../src/db/index.js';
import { verificarContrasena } from '../../src/utils/contrasenas.js';
import { ejemploDelContrato } from '../apoyo/contrato.js';
import { borrarUsuariosDePrueba, crearUsuarioDePrueba } from '../apoyo/usuarios.js';

const app = createApp();

afterAll(async () => {
  await borrarUsuariosDePrueba();
  await cerrarPool();
});

// Inicia sesión y devuelve el valor de la cabecera Cookie y la respuesta del login.
async function iniciarSesion(usuario) {
  const respuesta = await request(app)
    .post('/api/auth/login')
    .send({ correo: usuario.correo, contrasena: usuario.contrasena });
  expect(respuesta.status).toBe(200);
  return { cookie: respuesta.headers['set-cookie'][0].split(';')[0], login: respuesta.body };
}

// Token con la firma correcta del usuario indicado, para probar el vencimiento.
const tokenPara = (id, opciones = {}) =>
  jwt.sign({ rol: 'SECRETARIA', sede: 1 }, obtenerEntorno().jwt.secreto, {
    algorithm: 'HS256',
    subject: String(id),
    ...opciones,
  });

const cookieDe = (token) => `parroquia_sesion=${token}`;

// La cookie se borra con Max-Age=0 y los mismos atributos con que se creó.
function esBorradoDeCookie(respuesta) {
  const [cookie] = respuesta.headers['set-cookie'] ?? [];
  return (
    cookie?.startsWith('parroquia_sesion=;') &&
    cookie.includes('Max-Age=0') &&
    cookie.includes('Path=/api') &&
    cookie.includes('HttpOnly') &&
    cookie.includes('SameSite=Lax')
  );
}

describe('GET /api/auth/yo', () => {
  const ejemploError = () => ejemploDelContrato('### `GET /api/auth/yo`', 0, 'autenticacion.md');

  it('devuelve el mismo objeto que el login', async () => {
    const usuario = await crearUsuarioDePrueba({ rol: 'SECRETARIA' });
    const { cookie, login } = await iniciarSesion(usuario);

    const respuesta = await request(app).get('/api/auth/yo').set('Cookie', cookie);

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers['cache-control']).toBe('no-store');
    expect(respuesta.body).toEqual(login);
  });

  it('sin cookie: 401 con el mensaje del contrato', async () => {
    const respuesta = await request(app).get('/api/auth/yo');

    expect(respuesta.status).toBe(401);
    expect(respuesta.body).toEqual(ejemploError());
    expect(respuesta.headers['set-cookie']).toBeUndefined();
  });

  it('con un token inválido: 401 y se borra la cookie', async () => {
    const respuesta = await request(app)
      .get('/api/auth/yo')
      .set('Cookie', cookieDe('no-es-un-token'));

    expect(respuesta.status).toBe(401);
    expect(respuesta.body).toEqual(ejemploError());
    expect(esBorradoDeCookie(respuesta)).toBe(true);
  });

  it('con un token vencido: 401 y se borra la cookie', async () => {
    const usuario = await crearUsuarioDePrueba();

    const respuesta = await request(app)
      .get('/api/auth/yo')
      .set('Cookie', cookieDe(tokenPara(usuario.id, { expiresIn: -10 })));

    expect(respuesta.status).toBe(401);
    expect(respuesta.body).toEqual(ejemploError());
    expect(esBorradoDeCookie(respuesta)).toBe(true);
  });

  it('con un token firmado con otro secreto: 401', async () => {
    const usuario = await crearUsuarioDePrueba();
    const ajeno = jwt.sign(
      { rol: 'ADMINISTRADOR', sede: null },
      'otro-secreto-de-32-caracteres-xxxxx',
      {
        algorithm: 'HS256',
        subject: String(usuario.id),
      },
    );

    const respuesta = await request(app).get('/api/auth/yo').set('Cookie', cookieDe(ajeno));

    expect(respuesta.status).toBe(401);
  });

  it('con un token cuyo usuario ya no existe: 401 y se borra la cookie', async () => {
    const respuesta = await request(app)
      .get('/api/auth/yo')
      .set('Cookie', cookieDe(tokenPara(2_000_000_000)));

    expect(respuesta.status).toBe(401);
    expect(esBorradoDeCookie(respuesta)).toBe(true);
  });

  it('con un sub que no es un id: 401', async () => {
    const respuesta = await request(app)
      .get('/api/auth/yo')
      .set('Cookie', cookieDe(tokenPara('abc')));

    expect(respuesta.status).toBe(401);
  });

  it('si el usuario se desactiva, la sesión abierta deja de servir de inmediato', async () => {
    const usuario = await crearUsuarioDePrueba();
    const { cookie } = await iniciarSesion(usuario);
    expect((await request(app).get('/api/auth/yo').set('Cookie', cookie)).status).toBe(200);

    await consultar('UPDATE usuario SET activo = false WHERE id = $1', [usuario.id]);
    const respuesta = await request(app).get('/api/auth/yo').set('Cookie', cookie);

    expect(respuesta.status).toBe(401);
    expect(esBorradoDeCookie(respuesta)).toBe(true);
  });

  it('si le cambian el rol, los permisos cambian de inmediato sin volver a iniciar sesión', async () => {
    const usuario = await crearUsuarioDePrueba({ rol: 'MARKETING' });
    const { cookie } = await iniciarSesion(usuario);

    await consultar(
      "UPDATE usuario SET rol_id = (SELECT id FROM rol WHERE nombre = 'Administrador') WHERE id = $1",
      [usuario.id],
    );
    const respuesta = await request(app).get('/api/auth/yo').set('Cookie', cookie);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos.rol.codigo).toBe('ADMINISTRADOR');
    expect(respuesta.body.datos.permisos).toContain('usuarios.gestionar');
  });

  it('un Administrador sin sede recibe "sede": null', async () => {
    const usuario = await crearUsuarioDePrueba({ rol: 'ADMINISTRADOR', sede: null });
    const { cookie } = await iniciarSesion(usuario);

    const respuesta = await request(app).get('/api/auth/yo').set('Cookie', cookie);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos.sede).toBeNull();
  });

  it('nunca devuelve el hash de la contraseña', async () => {
    const usuario = await crearUsuarioDePrueba();
    const { cookie } = await iniciarSesion(usuario);

    const respuesta = await request(app).get('/api/auth/yo').set('Cookie', cookie);

    expect(JSON.stringify(respuesta.body)).not.toMatch(/argon2|hash/i);
  });
});

describe('POST /api/auth/logout', () => {
  it('borra la cookie con Max-Age=0 y responde 204 sin cuerpo', async () => {
    const usuario = await crearUsuarioDePrueba();
    const { cookie } = await iniciarSesion(usuario);

    const respuesta = await request(app).post('/api/auth/logout').set('Cookie', cookie);

    expect(respuesta.status).toBe(204);
    expect(respuesta.text).toBe('');
    expect(esBorradoDeCookie(respuesta)).toBe(true);
  });

  it('es idempotente: funciona aunque no haya sesión', async () => {
    const primera = await request(app).post('/api/auth/logout');
    const segunda = await request(app).post('/api/auth/logout');

    expect(primera.status).toBe(204);
    expect(segunda.status).toBe(204);
    expect(esBorradoDeCookie(primera)).toBe(true);
  });

  it('rechaza un Origin que no es el del frontend con 403', async () => {
    const respuesta = await request(app)
      .post('/api/auth/logout')
      .set('Origin', 'https://sitio-malo.example');

    expect(respuesta.status).toBe(403);
  });
});

describe('POST /api/auth/cambiar-contrasena', () => {
  const NUEVA = 'Nueva-Contrasena-2026';
  const cambiar = (cookie, cuerpo) =>
    request(app).post('/api/auth/cambiar-contrasena').set('Cookie', cookie).send(cuerpo);

  it('cambia la contraseña: 204, la sesión sigue abierta y la nueva sirve para el login', async () => {
    const usuario = await crearUsuarioDePrueba();
    const { cookie } = await iniciarSesion(usuario);

    const respuesta = await cambiar(cookie, {
      contrasenaActual: usuario.contrasena,
      contrasenaNueva: NUEVA,
    });

    expect(respuesta.status).toBe(204);
    expect(respuesta.text).toBe('');
    expect(respuesta.headers['cache-control']).toBe('no-store');
    expect((await request(app).get('/api/auth/yo').set('Cookie', cookie)).status).toBe(200);

    const conLaNueva = await request(app)
      .post('/api/auth/login')
      .send({ correo: usuario.correo, contrasena: NUEVA });
    const conLaVieja = await request(app)
      .post('/api/auth/login')
      .send({ correo: usuario.correo, contrasena: usuario.contrasena });
    expect(conLaNueva.status).toBe(200);
    expect(conLaVieja.status).toBe(401);
  });

  it('guarda la contraseña nueva como hash argon2id', async () => {
    const usuario = await crearUsuarioDePrueba();
    const { cookie } = await iniciarSesion(usuario);

    await cambiar(cookie, { contrasenaActual: usuario.contrasena, contrasenaNueva: NUEVA });

    const { rows } = await consultar('SELECT hash_contrasena FROM usuario WHERE id = $1', [
      usuario.id,
    ]);
    expect(rows[0].hash_contrasena).toMatch(/^\$argon2id\$/);
    expect(rows[0].hash_contrasena).not.toContain(NUEVA);
    expect(await verificarContrasena(NUEVA, rows[0].hash_contrasena)).toBe(true);
  });

  it('contraseña actual incorrecta: 400 con el detalle en contrasenaActual y sin cambios', async () => {
    const usuario = await crearUsuarioDePrueba();
    const { cookie } = await iniciarSesion(usuario);

    const respuesta = await cambiar(cookie, {
      contrasenaActual: 'no-es-la-actual-123',
      contrasenaNueva: NUEVA,
    });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('VALIDACION');
    expect(respuesta.body.error.detalles).toEqual([
      { campo: 'contrasenaActual', mensaje: 'La contraseña actual es incorrecta.' },
    ]);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ correo: usuario.correo, contrasena: usuario.contrasena });
    expect(login.status).toBe(200);
  });

  it.each([
    ['de menos de 10 caracteres', 'corta-123'],
    ['de más de 200 caracteres', 'x'.repeat(201)],
    ['igual a la actual', 'Exaltacion-Obrajes-167'],
  ])('contraseña nueva %s: 400 con el detalle en contrasenaNueva', async (_nombre, nueva) => {
    const usuario = await crearUsuarioDePrueba();
    const { cookie } = await iniciarSesion(usuario);

    const respuesta = await cambiar(cookie, {
      contrasenaActual: usuario.contrasena,
      contrasenaNueva: nueva,
    });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.detalles.map((detalle) => detalle.campo)).toEqual([
      'contrasenaNueva',
    ]);
  });

  it('faltan los dos campos: 400 con un detalle por campo', async () => {
    const usuario = await crearUsuarioDePrueba();
    const { cookie } = await iniciarSesion(usuario);

    const respuesta = await cambiar(cookie, {});

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.detalles.map((detalle) => detalle.campo).sort()).toEqual([
      'contrasenaActual',
      'contrasenaNueva',
    ]);
  });

  it('sin sesión: 401, antes de validar el cuerpo', async () => {
    const respuesta = await request(app).post('/api/auth/cambiar-contrasena').send({});

    expect(respuesta.status).toBe(401);
    expect(respuesta.body.error.codigo).toBe('NO_AUTENTICADO');
  });

  it('con un Origin que no es el del frontend: 403', async () => {
    const usuario = await crearUsuarioDePrueba();
    const { cookie } = await iniciarSesion(usuario);

    const respuesta = await cambiar(cookie, {
      contrasenaActual: usuario.contrasena,
      contrasenaNueva: NUEVA,
    }).set('Origin', 'https://sitio-malo.example');

    expect(respuesta.status).toBe(403);
    const login = await request(app)
      .post('/api/auth/login')
      .send({ correo: usuario.correo, contrasena: usuario.contrasena });
    expect(login.status).toBe(200);
  });

  it('no incluye las contraseñas en la respuesta de error', async () => {
    const usuario = await crearUsuarioDePrueba();
    const { cookie } = await iniciarSesion(usuario);

    const respuesta = await cambiar(cookie, {
      contrasenaActual: 'clave-secreta-incorrecta',
      contrasenaNueva: NUEVA,
    });

    expect(JSON.stringify(respuesta.body)).not.toContain('clave-secreta-incorrecta');
    expect(JSON.stringify(respuesta.body)).not.toContain(NUEVA);
  });
});
