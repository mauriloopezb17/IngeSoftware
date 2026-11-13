import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { clienteHttp, ErrorApi } from '../../../services/clienteHttp.js';
import { reiniciarMocksAdmin } from '../../mocks/handlers.js';
import { CONTRASENA_DESARROLLO } from '../../mocks/usuarios.js';
import { reiniciarMocksContenido } from './handlers.js';

const entrar = (rol = 'secretaria') =>
  clienteHttp.post('/auth/login', {
    correo: `${rol}@parroquia.test`,
    contrasena: CONTRASENA_DESARROLLO,
  });

async function capturarError(promesa) {
  try {
    await promesa;
  } catch (e) {
    return e;
  }
  throw new Error('Se esperaba un error');
}

describe('mocks de contenido de la parroquia', () => {
  beforeEach(() => {
    reiniciarMocksAdmin();
    reiniciarMocksContenido();
  });

  afterEach(() => {
    reiniciarMocksAdmin();
    reiniciarMocksContenido();
  });

  describe('autenticación y catálogos', () => {
    it('rechaza peticiones sin sesión con 401 NO_AUTENTICADO', async () => {
      const e = await capturarError(clienteHttp.get('/admin/horarios'));
      expect(e).toBeInstanceOf(ErrorApi);
      expect(e.estado).toBe(401);
      expect(e.codigo).toBe('NO_AUTENTICADO');
    });

    it('devuelve todos los catálogos del contrato', async () => {
      await entrar('marketing');
      const { datos } = await clienteHttp.get('/admin/catalogos');

      expect(Object.keys(datos)).toEqual([
        'roles',
        'tiposSede',
        'estadosPublicacion',
        'tiposPublicacion',
        'categorias',
        'categoriasEvento',
        'tiposHorario',
        'redesSociales',
        'tiposBloque',
      ]);
      expect(datos.tiposHorario).toHaveLength(4);
      expect(datos.redesSociales).toHaveLength(5);
      expect(datos.tiposBloque).toHaveLength(6);
    });
  });

  describe('horarios', () => {
    it('lista los 34 horarios del seed y permite crear, editar y eliminar', async () => {
      await entrar('secretaria');
      const inicial = await clienteHttp.get('/admin/horarios');
      expect(inicial.datos).toHaveLength(34);

      const creado = await clienteHttp.post('/admin/horarios', {
        tipoHorarioId: 1,
        diaSemana: 3,
        horaInicio: '12:00',
        horaFin: '13:00',
        descripcion: 'Misa del mediodía',
        activo: true,
      });
      expect(creado.datos.id).toBe(35);
      expect(creado.datos.tipo.nombre).toBe('Santa Misa');

      const editado = await clienteHttp.patch(`/admin/horarios/${creado.datos.id}`, {
        activo: false,
      });
      expect(editado.datos.activo).toBe(false);

      await clienteHttp.delete(`/admin/horarios/${creado.datos.id}`);
      const final = await clienteHttp.get('/admin/horarios');
      expect(final.datos).toHaveLength(34);
    });

    it('Marketing puede consultar horarios pero recibe 403 al modificar', async () => {
      await entrar('marketing');
      const { datos } = await clienteHttp.get('/admin/horarios');
      expect(datos).toHaveLength(34);

      const e = await capturarError(
        clienteHttp.post('/admin/horarios', {
          tipoHorarioId: 1,
          diaSemana: 1,
          horaInicio: '10:00',
        }),
      );
      expect(e.estado).toBe(403);
      expect(e.codigo).toBe('SIN_PERMISO');
    });

    it('valida formato de hora y rango día 1..7 con 400 VALIDACION', async () => {
      await entrar('secretaria');
      const e = await capturarError(
        clienteHttp.post('/admin/horarios', {
          tipoHorarioId: 1,
          diaSemana: 9,
          horaInicio: '18:00',
          horaFin: '17:00',
        }),
      );
      expect(e.estado).toBe(400);
      expect(e.codigo).toBe('VALIDACION');
      expect(e.detalles.map((d) => d.campo)).toEqual(['diaSemana', 'horaFin']);
    });
  });

  describe('servicios y preguntas frecuentes', () => {
    it('gestiona CRUD, reordenamiento y preguntas frecuentes', async () => {
      await entrar('secretaria');
      const lista = await clienteHttp.get('/admin/servicios');
      expect(lista.datos).toHaveLength(6);

      const creado = await clienteHttp.post('/admin/servicios', {
        nombre: 'Dirección espiritual',
        descripcionCorta: 'Acompañamiento personal con los sacerdotes.',
        icono: 'heart-handshake',
        contenido: {
          datos: [{ etiqueta: 'Atención', valor: 'Previa cita en secretaría' }],
        },
        visible: true,
      });
      expect(creado.datos.slug).toBe('direccion-espiritual');

      const faq1 = await clienteHttp.post(`/admin/servicios/${creado.datos.id}/preguntas-frecuentes`, {
        pregunta: '¿Cómo solicito una cita?',
        respuesta: 'En secretaría o por teléfono.',
        activa: true,
      });
      const faq2 = await clienteHttp.post(`/admin/servicios/${creado.datos.id}/preguntas-frecuentes`, {
        pregunta: '¿Tiene costo?',
        respuesta: 'No tiene ningún costo.',
        activa: true,
      });

      const reordenadas = await clienteHttp.post(
        `/admin/servicios/${creado.datos.id}/preguntas-frecuentes/reordenar`,
        { ids: [faq2.datos.id, faq1.datos.id] },
      );
      expect(reordenadas.datos.map((f) => f.id)).toEqual([faq2.datos.id, faq1.datos.id]);

      await clienteHttp.delete(
        `/admin/servicios/${creado.datos.id}/preguntas-frecuentes/${faq1.datos.id}`,
      );
      const detalle = await clienteHttp.get(`/admin/servicios/${creado.datos.id}`);
      expect(detalle.datos.preguntasFrecuentes).toHaveLength(1);
    });
  });

  describe('grupos pastorales', () => {
    it('crea grupo con imagen de la biblioteca y reordena', async () => {
      await entrar('secretaria');
      const creado = await clienteHttp.post('/admin/grupos-pastorales', {
        nombre: 'Pastoral Familiar',
        horarioReunion: 'Sábados · 17:00',
        icono: 'users',
        imagenId: 5,
        visible: true,
      });
      expect(creado.datos.imagen).toMatchObject({ id: 5, url: '/media/seed/pastoral-familiar.jpg' });

      const reorden = await clienteHttp.post('/admin/grupos-pastorales/reordenar', {
        ids: [7, 1, 2, 3, 4, 5, 6],
      });
      expect(reorden.datos[0].id).toBe(7);
    });
  });

  describe('videos de YouTube', () => {
    it('Marketing puede crear, editar y reordenar videos y rechaza duplicados con 409', async () => {
      await entrar('marketing');
      const creado = await clienteHttp.post('/admin/videos', {
        youtube: 'https://www.youtube.com/watch?v=pX7aQm3kR2c',
        titulo: 'Un recorrido por nuestra parroquia',
        duracionSegundos: 30,
        destacado: true,
        fechaPublicacion: '2026-10-15',
      });
      expect(creado.datos.youtubeVideoId).toBe('pX7aQm3kR2c');
      expect(creado.datos.urlInsercion).toBe('https://www.youtube-nocookie.com/embed/pX7aQm3kR2c');

      const dup = await capturarError(
        clienteHttp.post('/admin/videos', {
          youtube: 'https://youtu.be/pX7aQm3kR2c',
          titulo: 'Duplicado',
        }),
      );
      expect(dup.estado).toBe(409);
      expect(dup.codigo).toBe('CONFLICTO');
    });
  });

  describe('sedes y redes sociales', () => {
    it('Secretaría edita su sede pero no puede ver otras sedes ni crear sedes', async () => {
      await entrar('secretaria');
      const lista = await clienteHttp.get('/admin/sedes');
      expect(lista.datos).toHaveLength(1);

      const otra = await capturarError(clienteHttp.get('/admin/sedes/2'));
      expect(otra.estado).toBe(403);

      const editada = await clienteHttp.patch('/admin/sedes/1', {
        whatsapp: '+591 71234567',
        configuracion: { textoBarraSuperior: 'Nuevo aviso' },
        redesSociales: [{ redSocialId: 1, url: 'https://www.facebook.com/parroquia' }],
      });
      expect(editada.datos.whatsapp).toBe('+591 71234567');
      expect(editada.datos.configuracion.textoBarraSuperior).toBe('Nuevo aviso');
      expect(editada.datos.configuracion.colorPrimario).toBe('#231F20');
      expect(editada.datos.redesSociales).toHaveLength(1);

      const crear = await capturarError(
        clienteHttp.post('/admin/sedes', { nombre: 'Capilla Nueva', tipo: 'CAPILLA' }),
      );
      expect(crear.estado).toBe(403);
    });

    it('Administrador ve todas las sedes y puede crear una nueva', async () => {
      await entrar('admin');
      const lista = await clienteHttp.get('/admin/sedes');
      expect(lista.datos).toHaveLength(3);

      const creada = await clienteHttp.post('/admin/sedes', {
        nombre: 'Capilla Santa Gema',
        slug: 'capilla-santa-gema',
        tipo: 'CAPILLA',
        sedePadreId: 1,
        direccion: 'Calle 15 de Obrajes, La Paz',
        activo: false,
      });
      expect(creada.datos.slug).toBe('capilla-santa-gema');
      expect(creada.datos.activo).toBe(false);
    });
  });
});

