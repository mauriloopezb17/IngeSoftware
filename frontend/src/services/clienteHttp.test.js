import { describe, it, expect, vi } from 'vitest';
import { http, HttpResponse } from 'msw';

import { server } from '../mocks/server.js';
import { api } from '../mocks/handlers/index.js';
import { clienteHttp, ErrorApi } from './clienteHttp.js';

describe('clienteHttp', () => {
  it('obtiene JSON de la API (handler de salud incluido en los mocks)', async () => {
    const datos = await clienteHttp.get('/salud');

    expect(datos.estado).toBe('ok');
  });

  it('envía los parámetros omitiendo los vacíos', async () => {
    let urlRecibida;
    server.use(
      http.get(api('/publicaciones'), ({ request }) => {
        urlRecibida = new URL(request.url);
        return HttpResponse.json({ datos: [] });
      }),
    );

    await clienteHttp.get('/publicaciones', {
      parametros: { pagina: 2, categoria: '', buscar: undefined, tipo: 'noticia' },
    });

    expect(urlRecibida.searchParams.get('pagina')).toBe('2');
    expect(urlRecibida.searchParams.get('tipo')).toBe('noticia');
    expect(urlRecibida.searchParams.has('categoria')).toBe(false);
    expect(urlRecibida.searchParams.has('buscar')).toBe(false);
  });

  it('envía el cuerpo como JSON y las credenciales de sesión', async () => {
    let recibido;
    server.use(
      http.post(api('/auth/login'), async ({ request }) => {
        recibido = {
          tipo: request.headers.get('content-type'),
          cuerpo: await request.json(),
        };
        return HttpResponse.json({ ok: true });
      }),
    );
    // En Node, Request siempre informa "same-origin"; se comprueba lo enviado a fetch.
    const espiaFetch = vi.spyOn(globalThis, 'fetch');

    await clienteHttp.post('/auth/login', { correo: 'a@b.com', contrasena: 'x' });

    expect(recibido.tipo).toBe('application/json');
    expect(recibido.cuerpo).toEqual({ correo: 'a@b.com', contrasena: 'x' });
    expect(espiaFetch.mock.calls[0][1].credentials).toBe('include');
    espiaFetch.mockRestore();
  });

  it('no fuerza Content-Type al enviar archivos (FormData)', async () => {
    let tipo;
    server.use(
      http.post(api('/admin/multimedia'), ({ request }) => {
        tipo = request.headers.get('content-type');
        return HttpResponse.json({ id: 1 }, { status: 201 });
      }),
    );

    const formulario = new FormData();
    formulario.append('archivo', new Blob(['x'], { type: 'image/png' }), 'foto.png');
    await clienteHttp.post('/admin/multimedia', formulario);

    expect(tipo).toMatch(/^multipart\/form-data; boundary=/);
  });

  it('devuelve null cuando la respuesta es 204', async () => {
    server.use(http.delete(api('/admin/noticias/1'), () => new HttpResponse(null, { status: 204 })));

    expect(await clienteHttp.delete('/admin/noticias/1')).toBeNull();
  });

  it('convierte los errores de la API en ErrorApi', async () => {
    server.use(
      http.get(api('/publicaciones/nada'), () =>
        HttpResponse.json(
          { error: { codigo: 'NO_ENCONTRADO', mensaje: 'La publicación no existe.' } },
          { status: 404 },
        ),
      ),
    );

    const fallo = await clienteHttp.get('/publicaciones/nada').catch((error) => error);

    expect(fallo).toBeInstanceOf(ErrorApi);
    expect(fallo.estado).toBe(404);
    expect(fallo.codigo).toBe('NO_ENCONTRADO');
    expect(fallo.message).toBe('La publicación no existe.');
  });

  it('informa estado 0 cuando no hay conexión con el servidor', async () => {
    server.use(http.get(api('/salud'), () => HttpResponse.error()));

    const fallo = await clienteHttp.get('/salud').catch((error) => error);

    expect(fallo).toBeInstanceOf(ErrorApi);
    expect(fallo.estado).toBe(0);
  });
});
