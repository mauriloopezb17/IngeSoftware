import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse, delay } from 'msw';

import { api } from '../../mocks/api.js';
import { server } from '../../mocks/server.js';
import { ErrorApi } from '../../services/clienteHttp.js';
import { reiniciarMocksAdmin } from '../mocks/handlers.js';
import { subirArchivo } from './api.js';
import { fueCancelada, subirFormulario } from './subidaXhr.js';

const archivo = (nombre = 'foto.png', tipo = 'image/png', tamano = 200_000) =>
  new File([new Uint8Array(tamano)], nombre, { type: tipo });

describe('subida con XMLHttpRequest (progreso y cancelación)', () => {
  beforeEach(reiniciarMocksAdmin);
  afterEach(reiniciarMocksAdmin);

  it('informa el avance de 0 a 100 y devuelve el archivo creado', async () => {
    const avances = [];
    // Hace falta la sesión: el mock exige ser un usuario con multimedia.subir.
    const { clienteHttp } = await import('../../services/clienteHttp.js');
    await clienteHttp.post('/auth/login', { correo: 'marketing@parroquia.test', contrasena: 'Parroquia2026!' });

    const subido = await subirArchivo({ archivo: archivo(), onProgreso: (p) => avances.push(p) });

    expect(subido).toMatchObject({ tipoMime: 'image/png', enUso: false });
    expect(avances.length).toBeGreaterThan(0);
    expect(avances.at(-1)).toBe(100);
    expect(avances.every((p) => p >= 0 && p <= 100)).toBe(true);
    // Nunca retrocede.
    expect(avances).toEqual([...avances].sort((a, b) => a - b));
  });

  it('un error de la API sale como ErrorApi con su código y detalles (igual que clienteHttp)', async () => {
    server.use(
      http.post(api('/admin/multimedia'), () =>
        HttpResponse.json(
          { error: { codigo: 'ARCHIVO_DEMASIADO_GRANDE', mensaje: 'Las imágenes pueden pesar hasta 30 MB.', detalles: [] } },
          { status: 413 },
        ),
      ),
    );

    const error = await subirArchivo({ archivo: archivo() }).catch((e) => e);

    expect(error).toBeInstanceOf(ErrorApi);
    expect(error).toMatchObject({ estado: 413, codigo: 'ARCHIVO_DEMASIADO_GRANDE', message: 'Las imágenes pueden pesar hasta 30 MB.' });
  });

  it('un 401 sale como ErrorApi 401 (el panel vuelve al login)', async () => {
    server.use(
      http.post(api('/admin/multimedia'), () =>
        HttpResponse.json({ error: { codigo: 'NO_AUTENTICADO', mensaje: 'Tu sesión expiró.', detalles: [] } }, { status: 401 }),
      ),
    );

    await expect(subirArchivo({ archivo: archivo() })).rejects.toMatchObject({ estado: 401, codigo: 'NO_AUTENTICADO' });
  });

  it('sin conexión sale como ErrorApi con estado 0', async () => {
    server.use(http.post(api('/admin/multimedia'), () => HttpResponse.error()));

    await expect(subirArchivo({ archivo: archivo() })).rejects.toMatchObject({
      estado: 0,
      message: 'No se pudo conectar con el servidor.',
    });
  });

  it('se puede cancelar mientras sube: se rechaza con AbortError y no es un fallo', async () => {
    server.use(
      http.post(api('/admin/multimedia'), async () => {
        await delay(5000);
        return HttpResponse.json({ datos: {} }, { status: 201 });
      }),
    );
    const control = new AbortController();

    const promesa = subirArchivo({ archivo: archivo(), senal: control.signal });
    setTimeout(() => control.abort(), 50);
    const error = await promesa.catch((e) => e);

    expect(fueCancelada(error)).toBe(true);
    expect(error).not.toBeInstanceOf(ErrorApi);
  });

  it('una señal ya cancelada no envía nada', async () => {
    const control = new AbortController();
    control.abort();

    const error = await subirFormulario('/admin/multimedia', new FormData(), { senal: control.signal }).catch((e) => e);

    expect(fueCancelada(error)).toBe(true);
  });
});
