// POST /api/auth/login contra la base real, con usuarios temporales (no se tocan los del seed).
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { obtenerEntorno } from '../../src/config/entorno.js';
import { cerrarPool, consultar } from '../../src/db/index.js';
import { cerrarRedis } from '../../src/db/redis.js';
import { duracionEnSegundos, verificarToken } from '../../src/utils/sesion.js';
import { ejemploDelContrato } from '../apoyo/contrato.js';
import { limpiarContadoresDeIntentos } from '../apoyo/limite.js';
import { borrarUsuariosDePrueba, crearUsuarioDePrueba } from '../apoyo/usuarios.js';

const app = createApp();
const LOGIN = '/api/auth/login';
const ENCABEZADO = '### `POST /api/auth/login`';

const iniciarSesion = (cuerpo) => request(app).post(LOGIN).send(cuerpo);

// Los fallos de unas pruebas no deben bloquear a las siguientes (límite de intentos por IP).
beforeEach(limpiarContadoresDeIntentos);

afterAll(async () => {
  await limpiarContadoresDeIntentos();
  await borrarUsuariosDePrueba();
  await cerrarPool();
  await cerrarRedis();
});

describe('POST /api/auth/login: inicio correcto', () => {
  it('devuelve el usuario con la forma del ejemplo del contrato', async () => {
    const usuario = await crearUsuarioDePrueba({ rol: 'SECRETARIA' });

    const respuesta = await iniciarSesion({
      correo: usuario.correo,
      contrasena: usuario.contrasena,
    });

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers['cache-control']).toBe('no-store');

    const ejemplo = ejemploDelContrato(ENCABEZADO, 1, 'autenticacion.md');
    expect(Object.keys(respuesta.body)).toEqual(['datos']);
    expect(Object.keys(respuesta.body.datos)).toEqual(Object.keys(ejemplo.datos));
    expect(respuesta.body.datos).toEqual({
      id: usuario.id,
      nombreCompleto: 'Usuario de prueba (SECRETARIA)',
      correo: usuario.correo,
      rol: { codigo: 'SECRETARIA', nombre: 'Secretaría' },
      sede: ejemplo.datos.sede,
      permisos: ejemplo.datos.permisos,
      fechaUltimoAcceso: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-04:00$/),
      sesionExpiraEn: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-04:00$/),
    });
  });

  it('abre la sesión con la cookie parroquia_sesion y los atributos del contrato', async () => {
    const usuario = await crearUsuarioDePrueba({ rol: 'PARROCO' });

    const respuesta = await iniciarSesion({
      correo: usuario.correo,
      contrasena: usuario.contrasena,
    });

    const [cookie] = respuesta.headers['set-cookie'];
    const maxAge = duracionEnSegundos(obtenerEntorno().jwt.expiraEn);
    expect(cookie).toMatch(/^parroquia_sesion=[\w-]+\.[\w-]+\.[\w-]+;/);
    expect(cookie).toContain('Path=/api');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain(`Max-Age=${maxAge}`);
    // Secure solo en producción: las pruebas corren en NODE_ENV=test.
    expect(cookie).not.toContain('Secure');

    // El token no se devuelve en el cuerpo.
    expect(JSON.stringify(respuesta.body)).not.toContain(cookie.split(';')[0].split('=')[1]);
  });

  it('el token lleva sub, rol y sede del usuario, y vence junto con la cookie', async () => {
    const usuario = await crearUsuarioDePrueba({ rol: 'MARKETING' });

    const respuesta = await iniciarSesion({
      correo: usuario.correo,
      contrasena: usuario.contrasena,
    });

    const token = respuesta.headers['set-cookie'][0].split(';')[0].split('=')[1];
    const contenido = verificarToken(token);
    expect(contenido).toMatchObject({ sub: String(usuario.id), rol: 'MARKETING', sede: 1 });
    expect(contenido.exp - contenido.iat).toBe(duracionEnSegundos(obtenerEntorno().jwt.expiraEn));
    expect(new Date(contenido.exp * 1000).getTime()).toBeGreaterThan(Date.now());
  });

  it('compara el correo sin distinguir mayúsculas', async () => {
    const usuario = await crearUsuarioDePrueba();

    const respuesta = await iniciarSesion({
      correo: `  ${usuario.correo.toUpperCase()} `,
      contrasena: usuario.contrasena,
    });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos.correo).toBe(usuario.correo);
  });

  it('actualiza fechaUltimoAcceso con cada inicio de sesión', async () => {
    const usuario = await crearUsuarioDePrueba();
    const antes = await consultar('SELECT fecha_ultimo_acceso FROM usuario WHERE id = $1', [
      usuario.id,
    ]);
    expect(antes.rows[0].fecha_ultimo_acceso).toBeNull();

    const respuesta = await iniciarSesion({
      correo: usuario.correo,
      contrasena: usuario.contrasena,
    });

    const despues = await consultar('SELECT fecha_ultimo_acceso FROM usuario WHERE id = $1', [
      usuario.id,
    ]);
    expect(despues.rows[0].fecha_ultimo_acceso).toBeInstanceOf(Date);
    expect(respuesta.body.datos.fechaUltimoAcceso).not.toBeNull();
  });

  it('un Administrador sin sede recibe "sede": null y todos los permisos', async () => {
    const usuario = await crearUsuarioDePrueba({ rol: 'ADMINISTRADOR', sede: null });

    const respuesta = await iniciarSesion({
      correo: usuario.correo,
      contrasena: usuario.contrasena,
    });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos.sede).toBeNull();
    expect(respuesta.body.datos.rol.codigo).toBe('ADMINISTRADOR');
    expect(respuesta.body.datos.permisos).toContain('usuarios.gestionar');
    expect(
      verificarToken(respuesta.headers['set-cookie'][0].split(';')[0].split('=')[1]),
    ).toMatchObject({ rol: 'ADMINISTRADOR', sede: null });
  });

  it('los permisos dependen del rol', async () => {
    const marketing = await crearUsuarioDePrueba({ rol: 'MARKETING' });

    const respuesta = await iniciarSesion({
      correo: marketing.correo,
      contrasena: marketing.contrasena,
    });

    expect(respuesta.body.datos.permisos).toContain('noticias.redactar');
    expect(respuesta.body.datos.permisos).not.toContain('avisos.gestionar');
    expect(respuesta.body.datos.permisos).not.toContain('noticias.publicar');
  });
});

describe('POST /api/auth/login: credenciales incorrectas', () => {
  const ejemploError = () => ejemploDelContrato(ENCABEZADO, 2, 'autenticacion.md');

  it('contraseña incorrecta: 401 con el mensaje del contrato y sin cookie', async () => {
    const usuario = await crearUsuarioDePrueba();

    const respuesta = await iniciarSesion({
      correo: usuario.correo,
      contrasena: 'incorrecta-1234',
    });

    expect(respuesta.status).toBe(401);
    expect(respuesta.body).toEqual(ejemploError());
    expect(respuesta.headers['set-cookie']).toBeUndefined();
  });

  it('correo inexistente: exactamente la misma respuesta', async () => {
    const respuesta = await iniciarSesion({
      correo: 'no-existe@parroquia.test',
      contrasena: 'Exaltacion-Obrajes-167',
    });

    expect(respuesta.status).toBe(401);
    expect(respuesta.body).toEqual(ejemploError());
    expect(respuesta.headers['set-cookie']).toBeUndefined();
  });

  it('usuario inactivo con la contraseña correcta: exactamente la misma respuesta', async () => {
    const usuario = await crearUsuarioDePrueba({ activo: false });

    const respuesta = await iniciarSesion({
      correo: usuario.correo,
      contrasena: usuario.contrasena,
    });

    expect(respuesta.status).toBe(401);
    expect(respuesta.body).toEqual(ejemploError());
    expect(respuesta.headers['set-cookie']).toBeUndefined();
  });

  it('un inicio fallido no cambia fechaUltimoAcceso', async () => {
    const usuario = await crearUsuarioDePrueba();

    await iniciarSesion({ correo: usuario.correo, contrasena: 'incorrecta-1234' });

    const { rows } = await consultar('SELECT fecha_ultimo_acceso FROM usuario WHERE id = $1', [
      usuario.id,
    ]);
    expect(rows[0].fecha_ultimo_acceso).toBeNull();
  });

  it('la respuesta no incluye la contraseña ni su hash', async () => {
    const usuario = await crearUsuarioDePrueba();

    const respuesta = await iniciarSesion({
      correo: usuario.correo,
      contrasena: usuario.contrasena,
    });

    const texto = JSON.stringify(respuesta.body);
    expect(texto).not.toContain(usuario.contrasena);
    expect(texto).not.toContain('argon2');
    expect(texto).not.toContain('hash');
  });
});

describe('POST /api/auth/login: validación', () => {
  it('falta el correo y la contraseña: 400 con un detalle por campo', async () => {
    const respuesta = await iniciarSesion({});

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('VALIDACION');
    expect(respuesta.body.error.detalles.map((d) => d.campo).sort()).toEqual([
      'contrasena',
      'correo',
    ]);
  });

  it.each([
    ['correo con formato inválido', { correo: 'no-es-un-correo', contrasena: 'x' }, 'correo'],
    [
      'correo de más de 120 caracteres',
      { correo: `${'a'.repeat(120)}@x.org`, contrasena: 'x' },
      'correo',
    ],
    ['contraseña vacía', { correo: 'a@parroquia.test', contrasena: '' }, 'contrasena'],
    [
      'contraseña de más de 200 caracteres',
      { correo: 'a@parroquia.test', contrasena: 'x'.repeat(201) },
      'contrasena',
    ],
    ['contraseña que no es texto', { correo: 'a@parroquia.test', contrasena: 123 }, 'contrasena'],
    [
      'un campo que no existe',
      { correo: 'a@parroquia.test', contrasena: 'x', rol: 'ADMINISTRADOR' },
      'rol',
    ],
  ])('%s: 400', async (_nombre, cuerpo, campo) => {
    const respuesta = await iniciarSesion(cuerpo);

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.detalles.map((d) => d.campo)).toContain(campo);
  });

  it('no consulta la base con datos inválidos (no revela nada con un 400)', async () => {
    const respuesta = await iniciarSesion({ correo: 'no-es-un-correo', contrasena: 'x' });

    expect(respuesta.status).toBe(400);
    expect(respuesta.headers['set-cookie']).toBeUndefined();
  });
});

describe('POST /api/auth/login: protección CSRF', () => {
  it('rechaza un Origin que no es el del frontend con 403', async () => {
    const usuario = await crearUsuarioDePrueba();

    const respuesta = await request(app)
      .post(LOGIN)
      .set('Origin', 'https://sitio-malo.example')
      .send({ correo: usuario.correo, contrasena: usuario.contrasena });

    expect(respuesta.status).toBe(403);
    expect(respuesta.body.error.codigo).toBe('SIN_PERMISO');
    expect(respuesta.headers['set-cookie']).toBeUndefined();
  });

  it('acepta el Origin del frontend', async () => {
    const usuario = await crearUsuarioDePrueba();

    const respuesta = await request(app)
      .post(LOGIN)
      .set('Origin', obtenerEntorno().corsOrigenes[0])
      .send({ correo: usuario.correo, contrasena: usuario.contrasena });

    expect(respuesta.status).toBe(200);
  });
});
