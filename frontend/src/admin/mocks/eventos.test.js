import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { clienteHttp, ErrorApi } from '../../services/clienteHttp.js';
import { estaFinalizado } from './eventosMock.js';
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

const valido = {
  titulo: 'Vigilia de Pentecostés',
  fechaInicio: '2027-05-15T20:00:00-04:00',
  categoriaEventoId: 1,
};
const crear = (cuerpo) => clienteHttp.post('/admin/eventos', { ...valido, ...cuerpo });

describe('mock de eventos (admin.md §4)', () => {
  beforeEach(reiniciarMocksAdmin);
  afterEach(reiniciarMocksAdmin);

  it('crea en PUBLICADO por defecto, con creadoPor y la categoría embebida', async () => {
    await entrar('secretaria');
    const { datos } = await crear();

    expect(datos).toMatchObject({
      estado: { codigo: 'PUBLICADO' },
      categoria: { id: 1, nombre: 'Liturgia', colorHex: '#E2AD11' },
      creadoPor: { id: 3 },
      todoElDia: false,
      imagen: null,
      idExternoM365: null,
      finalizado: false,
    });
  });

  it('exige eventos.gestionar para escribir: Marketing recibe 403', async () => {
    await entrar('marketing');
    const error = await capturar(crear());
    expect(error.estado).toBe(403);
    expect(error.codigo).toBe('SIN_PERMISO');
    // Pero sí puede consultar.
    const { datos } = await clienteHttp.get('/admin/eventos');
    expect(datos.length).toBeGreaterThan(0);
  });

  it('valida el cuerpo: EN_REVISION, fecha sin zona, fin anterior al inicio y categoría', async () => {
    await entrar('secretaria');

    const revision = await capturar(crear({ estado: 'EN_REVISION' }));
    expect(revision.detalles).toEqual([expect.objectContaining({ campo: 'estado' })]);

    const sinZona = await capturar(crear({ fechaInicio: '2027-05-15T20:00:00' }));
    expect(sinZona.detalles[0].campo).toBe('fechaInicio');

    const fin = await capturar(crear({ fechaFin: '2027-05-15T19:00:00-04:00' }));
    expect(fin.detalles[0].campo).toBe('fechaFin');

    const categoria = await capturar(crear({ categoriaEventoId: 99 }));
    expect(categoria.detalles[0].campo).toBe('categoriaEventoId');
  });

  it('filtra por finalizados y ordena por fechaInicio', async () => {
    await entrar('parroco');
    const pasados = await clienteHttp.get('/admin/eventos', { parametros: { finalizados: 'true' } });
    expect(pasados.datos.every((e) => e.finalizado)).toBe(true);
    expect(pasados.datos.map((e) => e.titulo)).toEqual(['Kermés parroquial', 'Retiro de catequistas']);

    const desc = await clienteHttp.get('/admin/eventos', { parametros: { finalizados: 'false', orden: '-fechaInicio' } });
    expect(desc.datos[0].titulo).toBe('Concierto de villancicos');
  });

  it('PATCH cambia solo lo enviado y DELETE responde 204', async () => {
    await entrar('secretaria');
    const { datos } = await clienteHttp.patch('/admin/eventos/5', { estado: 'BORRADOR' });
    expect(datos).toMatchObject({ estado: { codigo: 'BORRADOR' }, titulo: 'Solemnidad de Cristo Rey del Universo' });
    expect(datos.imagen).toMatchObject({ id: 3, variantes: expect.any(Array) });

    await expect(clienteHttp.delete('/admin/eventos/5')).resolves.toBeNull();
    const error = await capturar(clienteHttp.get('/admin/eventos/5'));
    expect(error.estado).toBe(404);
  });
});

describe('regla de «finalizado» (publico.md, RF-09)', () => {
  const ahora = new Date('2026-11-18T21:00:00-04:00');

  it('sin fechaFin sigue vigente hasta el final del día de inicio, en hora de Bolivia', () => {
    expect(estaFinalizado({ fechaInicio: '2026-11-18T19:00:00-04:00', fechaFin: null }, ahora)).toBe(false);
    expect(estaFinalizado({ fechaInicio: '2026-11-17T19:00:00-04:00', fechaFin: null }, ahora)).toBe(true);
  });

  it('con fechaFin termina en esa hora; si es de todo el día, al final de ese día', () => {
    expect(estaFinalizado({ fechaInicio: '2026-11-18T08:00:00-04:00', fechaFin: '2026-11-18T20:00:00-04:00' }, ahora)).toBe(true);
    expect(
      estaFinalizado(
        { fechaInicio: '2026-11-16T00:00:00-04:00', fechaFin: '2026-11-18T00:00:00-04:00', todoElDia: true },
        ahora,
      ),
    ).toBe(false);
  });
});
