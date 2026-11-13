import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { clienteHttp, ErrorApi } from '../../services/clienteHttp.js';
import { hoyBolivia } from './apoyoMock.js';
import { reiniciarMocksAdmin } from './handlers.js';
import { CONTRASENA_DESARROLLO } from './usuarios.js';

const entrar = (usuario) =>
  clienteHttp.post('/auth/login', { correo: `${usuario}@parroquia.test`, contrasena: CONTRASENA_DESARROLLO });

async function capturar(promesa) {
  try {
    await promesa;
  } catch (e) {
    expect(e).toBeInstanceOf(ErrorApi);
    return e;
  }
  throw new Error('Se esperaba un error');
}

const dia = (n) => hoyBolivia(new Date(Date.now() + n * 86400000));
const matrimonio = (n) => `${dia(n)}T12:00:00-04:00`;
const leer = async (id) => (await clienteHttp.get(`/admin/proclamas/${id}`)).datos;

describe('mock de proclamas (admin.md §10)', () => {
  beforeEach(reiniciarMocksAdmin);
  afterEach(reiniciarMocksAdmin);

  it('calcula numeroProclama y vigente según las fechas', async () => {
    await entrar('secretaria');
    const vigentes = (await clienteHttp.get('/admin/proclamas', { parametros: { vigentes: 'true' } })).datos;
    expect(vigentes.map((p) => [p.id, p.numeroProclama])).toEqual([
      [1, 3],
      [2, 2],
      [3, 1],
    ]);

    const historial = (await clienteHttp.get('/admin/proclamas', { parametros: { vigentes: 'false', orden: '-fechaMatrimonio' } })).datos;
    expect(historial.map((p) => p.id)).toEqual([4, 5]);
    expect(historial.find((p) => p.id === 4)).toMatchObject({ vigente: false, numeroProclama: null });
  });

  it('busca por nombre sin distinguir acentos y filtra por año', async () => {
    await entrar('parroco');
    const porNombre = (await clienteHttp.get('/admin/proclamas', { parametros: { buscar: 'gutierrez' } })).datos;
    expect(porNombre.map((p) => p.id)).toEqual([3]);
    const sinAnio = await clienteHttp.get('/admin/proclamas', { parametros: { anio: '1990' } });
    expect(sinAnio.datos).toEqual([]);
  });

  it('crea con su primera publicación y valida nombres, fechas y límites', async () => {
    await entrar('secretaria');
    const { datos } = await clienteHttp.post('/admin/proclamas', {
      contrayente1: 'Pablo R.',
      contrayente2: 'Sonia T.',
      fechaMatrimonio: matrimonio(30),
      publicaciones: [{ fecha: dia(1) }],
    });
    expect(datos).toMatchObject({ publicaciones: [{ numero: 1, fecha: dia(1) }], vigente: false, numeroProclama: null });

    const base = { contrayente1: 'A', contrayente2: 'B', fechaMatrimonio: matrimonio(30) };
    const sinNombre = await capturar(clienteHttp.post('/admin/proclamas', { ...base, contrayente1: ' ' }));
    expect(sinNombre.detalles[0].campo).toBe('contrayente1');
    const despues = await capturar(clienteHttp.post('/admin/proclamas', { ...base, publicaciones: [{ fecha: dia(31) }] }));
    expect(despues.detalles[0]).toEqual({ campo: 'publicaciones.0.fecha', mensaje: 'Debe ser anterior a la fecha del matrimonio.' });
    const desordenadas = await capturar(
      clienteHttp.post('/admin/proclamas', { ...base, publicaciones: [{ fecha: dia(5) }, { fecha: dia(2) }] }),
    );
    expect(desordenadas.detalles[0]).toEqual({ campo: 'publicaciones.1.fecha', mensaje: 'Debe ser posterior a la proclama anterior.' });
  });

  it('agrega la siguiente publicación (la 4.ª es 409), cambia fechas y solo quita la última', async () => {
    await entrar('secretaria');
    const agregada = (await clienteHttp.post('/admin/proclamas/3/publicaciones', { fecha: dia(2) })).datos;
    expect(agregada.publicaciones.map((p) => p.numero)).toEqual([1, 2]);

    await clienteHttp.post('/admin/proclamas/3/publicaciones', { fecha: dia(9) });
    const cuarta = await capturar(clienteHttp.post('/admin/proclamas/3/publicaciones', { fecha: dia(16) }));
    expect(cuarta.estado).toBe(409);
    expect(cuarta.message).toBe('La proclama ya tiene sus 3 publicaciones.');

    const anterior = await capturar(clienteHttp.patch('/admin/proclamas/3/publicaciones/2', { fecha: dia(-8) }));
    expect(anterior.estado).toBe(400);
    const cambiada = (await clienteHttp.patch('/admin/proclamas/3/publicaciones/2', { fecha: dia(3) })).datos;
    expect(cambiada.publicaciones[1].fecha).toBe(dia(3));

    const noEsUltima = await capturar(clienteHttp.delete('/admin/proclamas/3/publicaciones/1'));
    expect(noEsUltima.estado).toBe(409);
    expect(noEsUltima.message).toBe('Solo se puede quitar la última publicación (la 3).');
    // 200 con la proclama actualizada, no 204 (admin.md §10).
    const { datos: tras } = await clienteHttp.delete('/admin/proclamas/3/publicaciones/3');
    expect(tras.publicaciones.map((p) => p.numero)).toEqual([1, 2]);
    expect((await leer(3)).publicaciones).toHaveLength(2);
    expect((await capturar(clienteHttp.delete('/admin/proclamas/3/publicaciones/3'))).estado).toBe(404);
  });

  it('no elimina una proclama con publicaciones ya alcanzadas, pero sí una solo programada', async () => {
    await entrar('secretaria');
    const alcanzada = await capturar(clienteHttp.delete('/admin/proclamas/1'));
    expect(alcanzada.estado).toBe(409);
    expect(alcanzada.codigo).toBe('CONFLICTO');

    await expect(clienteHttp.delete('/admin/proclamas/4')).resolves.toBeNull();
    expect((await capturar(clienteHttp.get('/admin/proclamas/4'))).estado).toBe(404);
  });

  it('Marketing consulta pero no escribe (403)', async () => {
    await entrar('marketing');
    expect((await clienteHttp.get('/admin/proclamas')).datos.length).toBeGreaterThan(0);
    const error = await capturar(clienteHttp.patch('/admin/proclamas/1', { contrayente1: 'X' }));
    expect(error.estado).toBe(403);
  });

  it('el matrimonio no puede quedar antes de una publicación', async () => {
    await entrar('secretaria');
    const error = await capturar(clienteHttp.patch('/admin/proclamas/3', { fechaMatrimonio: matrimonio(-6) }));
    expect(error.detalles[0].campo).toBe('fechaMatrimonio');
  });

  it('rechaza campos que no son del cuerpo y el año fuera de rango', async () => {
    await entrar('secretaria');
    const extra = await capturar(clienteHttp.patch('/admin/proclamas/3', { tramiteOrigenId: 5 }));
    expect(extra.detalles).toEqual([{ campo: 'tramiteOrigenId', mensaje: 'Campo no permitido.' }]);
    const anio = await capturar(clienteHttp.get('/admin/proclamas', { parametros: { anio: '1850' } }));
    expect(anio.detalles[0].campo).toBe('query.anio');
  });
});
