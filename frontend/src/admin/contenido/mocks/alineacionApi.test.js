// Diferencias entre los mocks del contenido y la API real que encontró la Sección B (Ola 5):
// los mocks deben responder como la API (backend/src/services y validacion).
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { clienteHttp, ErrorApi } from '../../../services/clienteHttp.js';
import { reiniciarMocksAdmin } from '../../mocks/handlers.js';
import { guardarSesionMock, obtenerSesionMock } from '../../mocks/sesionMock.js';
import { CONTRASENA_DESARROLLO } from '../../mocks/usuarios.js';
import { reiniciarMocksContenido } from './handlers.js';

const entrar = (rol) => clienteHttp.post('/auth/login', { correo: `${rol}@parroquia.test`, contrasena: CONTRASENA_DESARROLLO });

async function capturar(promesa) {
  try {
    await promesa;
  } catch (e) {
    expect(e).toBeInstanceOf(ErrorApi);
    return e;
  }
  throw new Error('Se esperaba un error');
}

const horario = { tipoHorarioId: 1, diaSemana: 6, horaInicio: '18:00', horaFin: null, descripcion: null, activo: true };
const leerSede = async (id) => (await clienteHttp.get(`/admin/sedes/${id}`)).datos;

describe('mocks de contenido alineados con la API', () => {
  beforeEach(() => {
    reiniciarMocksAdmin();
    reiniciarMocksContenido();
  });
  afterEach(() => {
    reiniciarMocksAdmin();
    reiniciarMocksContenido();
  });

  it('?sede=<inexistente> responde 200 con una lista vacía, no 404', async () => {
    await entrar('admin');
    for (const ruta of ['/admin/horarios', '/admin/servicios', '/admin/grupos-pastorales', '/admin/videos']) {
      const { datos } = await clienteHttp.get(ruta, { parametros: { sede: 'no-existe' } });
      expect(datos).toEqual([]);
    }
  });

  it('un Administrador sin sede debe indicar sedeId al crear (400 en sedeId)', async () => {
    await entrar('admin');
    guardarSesionMock({ ...obtenerSesionMock(), sede: null });

    const sinSede = await capturar(clienteHttp.post('/admin/horarios', horario));
    expect(sinSede.estado).toBe(400);
    expect(sinSede.detalles).toEqual([{ campo: 'sedeId', mensaje: 'Indica la sede.' }]);

    const inexistente = await capturar(clienteHttp.post('/admin/horarios', { ...horario, sedeId: 999 }));
    expect(inexistente.detalles).toEqual([{ campo: 'sedeId', mensaje: 'La sede no existe.' }]);

    const { datos } = await clienteHttp.post('/admin/horarios', { ...horario, sedeId: 2 });
    expect(datos.sede.id).toBe(2);
  });

  it('imagenPortada trae variantes (vacías en el seed, con anchos en una imagen del CDN)', async () => {
    await entrar('admin');
    expect((await leerSede(1)).imagenPortada.variantes).toEqual([]);

    const { datos } = await clienteHttp.patch('/admin/sedes/1', { imagenPortadaId: 8 });
    expect(datos.imagenPortada.variantes.map((v) => v.ancho)).toEqual([480, 960]);
  });

  it('el PATCH del Administrador aplica tipo y sedePadreId', async () => {
    await entrar('admin');
    const { datos } = await clienteHttp.patch('/admin/sedes/2', { tipo: 'CAPILLA', sedePadreId: 1 });
    expect(datos.tipo).toEqual({ codigo: 'CAPILLA', nombre: 'Capilla' });
    expect(datos.sedePadre).toMatchObject({ id: 1, slug: 'senor-de-la-exaltacion' });

    const propia = await capturar(clienteHttp.patch('/admin/sedes/2', { sedePadreId: 2 }));
    expect(propia.detalles[0].campo).toBe('sedePadreId');
    const sinPadre = (await clienteHttp.patch('/admin/sedes/2', { sedePadreId: null })).datos;
    expect(sinPadre.sedePadre).toBeNull();
  });

  it('configuracion se fusiona en profundidad y null borra una clave', async () => {
    await entrar('admin');
    await clienteHttp.patch('/admin/sedes/1', { configuracion: { portada: { titulo: 'Bienvenidos', subtitulo: 'Obrajes' } } });
    const { datos } = await clienteHttp.patch('/admin/sedes/1', {
      configuracion: { portada: { titulo: 'Bienvenidos a la parroquia', subtitulo: null } },
    });
    expect(datos.configuracion.portada).toEqual({ titulo: 'Bienvenidos a la parroquia' });
  });

  it('las redes sociales repetidas o sin https:// responden 400', async () => {
    await entrar('secretaria');
    const repetidas = await capturar(
      clienteHttp.patch('/admin/sedes/1', {
        redesSociales: [
          { redSocialId: 1, url: 'https://facebook.com/a' },
          { redSocialId: 1, url: 'https://facebook.com/b' },
        ],
      }),
    );
    expect(repetidas.detalles).toContainEqual({ campo: 'redesSociales', mensaje: 'No puede haber redes sociales repetidas.' });

    for (const url of ['http://facebook.com/a', 'https://', 'facebook.com/a']) {
      const error = await capturar(clienteHttp.patch('/admin/sedes/1', { redesSociales: [{ redSocialId: 1, url }] }));
      expect(error.detalles).toEqual([
        { campo: 'redesSociales.0.url', mensaje: 'La URL de la red social debe comenzar con https://.' },
      ]);
    }
  });
});
