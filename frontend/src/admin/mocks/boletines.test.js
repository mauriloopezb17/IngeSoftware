import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { clienteHttp, ErrorApi } from '../../services/clienteHttp.js';
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

// Ids de multimediaDatos.js: 7 y 14 son PDF; 8 es una imagen.
const crear = (cuerpo) =>
  clienteHttp.post('/admin/boletines', { titulo: 'Edición de noviembre 2026', periodo: '2026-11', archivoId: 14, ...cuerpo });

describe('mock de boletines (admin.md §11)', () => {
  beforeEach(reiniciarMocksAdmin);
  afterEach(reiniciarMocksAdmin);

  it('lista con el objeto del contrato: periodo al primer día del mes, archivo, sede y publicadoPor', async () => {
    await entrar('secretaria');
    const { datos, paginacion } = await clienteHttp.get('/admin/boletines');

    expect(paginacion.total).toBe(1);
    expect(datos[0]).toMatchObject({
      titulo: 'Edición de octubre 2026',
      periodo: '2026-10-01',
      sede: { slug: 'senor-de-la-exaltacion' },
      publicadoPor: { id: 3 },
      archivo: { id: 7, tipoMime: 'application/pdf', nombreOriginal: expect.any(String), tamanoBytes: expect.any(Number) },
    });
  });

  it('publica con periodo YYYY-MM y ordena del más reciente al más antiguo; filtra por año', async () => {
    await entrar('secretaria');
    const { datos } = await crear();
    expect(datos).toMatchObject({ periodo: '2026-11-01', publicadoPor: { id: 3 }, archivo: { id: 14 } });

    await crear({ titulo: 'Edición de diciembre 2025', periodo: '2025-12' });
    const todos = (await clienteHttp.get('/admin/boletines')).datos;
    expect(todos.map((b) => b.periodo)).toEqual(['2026-11-01', '2026-10-01', '2025-12-01']);
    const de2025 = (await clienteHttp.get('/admin/boletines', { parametros: { anio: '2025' } })).datos;
    expect(de2025).toHaveLength(1);
  });

  it('repetir el periodo en la sede es 409', async () => {
    await entrar('secretaria');
    const error = await capturar(crear({ periodo: '2026-10' }));
    expect(error.estado).toBe(409);
    expect(error.codigo).toBe('CONFLICTO');
  });

  it('el archivo debe ser un PDF de la biblioteca: imagen o id inexistente es 400', async () => {
    await entrar('secretaria');
    for (const archivoId of [8, 9999, null]) {
      const error = await capturar(crear({ archivoId }));
      expect(error.estado).toBe(400);
      expect(error.detalles[0].campo).toBe('archivoId');
    }
  });

  it('valida título y formato del periodo', async () => {
    await entrar('secretaria');
    expect((await capturar(crear({ titulo: ' ' }))).detalles[0].campo).toBe('titulo');
    expect((await capturar(crear({ periodo: '2026-13' }))).detalles[0].campo).toBe('periodo');
    expect((await capturar(crear({ periodo: '2026-11-01' }))).detalles[0].campo).toBe('periodo');
  });

  it('PATCH cambia título, periodo o PDF; no choca consigo mismo; DELETE responde 204', async () => {
    await entrar('secretaria');
    const { datos } = await clienteHttp.patch('/admin/boletines/1', { titulo: 'Octubre 2026 (corregido)', periodo: '2026-10' });
    expect(datos).toMatchObject({ titulo: 'Octubre 2026 (corregido)', periodo: '2026-10-01' });
    const reemplazado = (await clienteHttp.patch('/admin/boletines/1', { archivoId: 14 })).datos;
    expect(reemplazado.archivo.id).toBe(14);

    await expect(clienteHttp.delete('/admin/boletines/1')).resolves.toBeNull();
    expect((await capturar(clienteHttp.get('/admin/boletines/1'))).estado).toBe(404);
  });

  it('Marketing puede gestionar boletines (boletines.gestionar)', async () => {
    await entrar('marketing');
    const { datos } = await crear({ periodo: '2027-01' });
    expect(datos.publicadoPor.id).toBe(4);
  });
});
