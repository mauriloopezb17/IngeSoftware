import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { clienteHttp, ErrorApi } from '../../services/clienteHttp.js';
import { reiniciarMocksAdmin } from './handlers.js';
import { CONTRASENA_DESARROLLO, usuariosSeed } from './usuarios.js';

const iniciar = (correo, contrasena = CONTRASENA_DESARROLLO) =>
  clienteHttp.post('/auth/login', { correo, contrasena });

async function capturarError(promesa) {
  try {
    await promesa;
  } catch (e) {
    return e;
  }
  throw new Error('Se esperaba un error');
}

describe('mocks de autenticación del panel', () => {
  beforeEach(reiniciarMocksAdmin);
  afterEach(reiniciarMocksAdmin);

  it('acepta los cuatro usuarios del seed con la contraseña de desarrollo', async () => {
    for (const usuario of usuariosSeed) {
      const { datos } = await iniciar(usuario.correo);
      expect(datos.correo).toBe(usuario.correo);
      expect(datos.rol.codigo).toBe(usuario.rol.codigo);
      expect(datos.sede).toEqual({
        id: 1,
        nombre: 'Parroquia Señor de la Exaltación',
        slug: 'senor-de-la-exaltacion',
      });
    }
  });

  it('devuelve el objeto del contrato con las fechas de acceso y de vencimiento', async () => {
    const { datos } = await iniciar('Secretaria@Parroquia.test'); // sin distinguir mayúsculas

    expect(datos).toMatchObject({
      id: 3,
      nombreCompleto: 'Secretaría (desarrollo)',
      rol: { codigo: 'SECRETARIA', nombre: 'Secretaría' },
    });
    expect(datos.permisos).toContain('avisos.gestionar');
    expect(datos.permisos).not.toContain('noticias.redactar');
    expect(datos.fechaUltimoAcceso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-04:00$/);
    expect(new Date(datos.sesionExpiraEn) - new Date(datos.fechaUltimoAcceso)).toBe(8 * 3600 * 1000);
  });

  it('responde 401 NO_AUTENTICADO con credenciales malas, sin revelar cuál falló', async () => {
    const malaClave = await capturarError(iniciar('admin@parroquia.test', 'otra-clave'));
    const malCorreo = await capturarError(iniciar('nadie@parroquia.test'));

    for (const e of [malaClave, malCorreo]) {
      expect(e).toBeInstanceOf(ErrorApi);
      expect(e.estado).toBe(401);
      expect(e.codigo).toBe('NO_AUTENTICADO');
      expect(e.message).toBe('Correo o contraseña incorrectos.');
    }
  });

  it('responde 400 VALIDACION con detalles por campo', async () => {
    const e = await capturarError(clienteHttp.post('/auth/login', { correo: 'no-es-correo' }));

    expect(e.estado).toBe(400);
    expect(e.codigo).toBe('VALIDACION');
    expect(e.detalles.map((d) => d.campo)).toEqual(['correo', 'contrasena']);
  });

  it('responde 429 con Retry-After tras 5 intentos fallidos del mismo correo', async () => {
    for (let i = 0; i < 5; i++) {
      await capturarError(iniciar('parroco@parroquia.test', 'mala'));
    }

    // Aun con la contraseña correcta, el correo queda bloqueado.
    const e = await capturarError(iniciar('parroco@parroquia.test'));
    expect(e.estado).toBe(429);
    expect(e.codigo).toBe('DEMASIADAS_SOLICITUDES');

    // Otro correo no se ve afectado.
    await expect(iniciar('admin@parroquia.test')).resolves.toBeDefined();
  });

  it('GET /auth/yo responde 401 sin sesión y el usuario con sesión', async () => {
    const sinSesion = await capturarError(clienteHttp.get('/auth/yo'));
    expect(sinSesion.estado).toBe(401);
    expect(sinSesion.message).toBe('Tu sesión expiró. Vuelve a iniciar sesión.');

    await iniciar('marketing@parroquia.test');
    const { datos } = await clienteHttp.get('/auth/yo');
    expect(datos.rol.codigo).toBe('MARKETING');
  });

  it('la sesión sobrevive a una recarga (sessionStorage)', async () => {
    await iniciar('admin@parroquia.test');
    expect(window.sessionStorage.getItem('admin-mock-sesion')).toContain('admin@parroquia.test');
  });

  it('logout responde 204, cierra la sesión y es idempotente', async () => {
    await iniciar('admin@parroquia.test');

    expect(await clienteHttp.post('/auth/logout')).toBeNull();
    expect(window.sessionStorage.getItem('admin-mock-sesion')).toBeNull();
    expect((await capturarError(clienteHttp.get('/auth/yo'))).estado).toBe(401);

    expect(await clienteHttp.post('/auth/logout')).toBeNull();
  });
});
