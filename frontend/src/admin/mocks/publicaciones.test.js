import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { clienteHttp, ErrorApi } from '../../services/clienteHttp.js';
import { reiniciarMocksAdmin } from './handlers.js';
import { parrafo } from './publicacionesDatos.js';
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

const documento = (...bloques) => ({ formato: 'blocknote', version: 1, bloques });
const contenidoValido = () => documento(parrafo('b1', 'Texto de la noticia.'));

const listar = (parametros) => clienteHttp.get('/admin/publicaciones', { parametros });
const leer = async (id) => (await clienteHttp.get(`/admin/publicaciones/${id}`)).datos;
const accion = async (id, nombre, cuerpo) =>
  (await clienteHttp.post(`/admin/publicaciones/${id}/${nombre}`, cuerpo)).datos;

async function crear(cuerpo = {}) {
  const { datos } = await clienteHttp.post('/admin/publicaciones', {
    tipo: 'NOTICIA',
    titulo: 'Noticia de prueba',
    contenido: contenidoValido(),
    ...cuerpo,
  });
  return datos;
}

// Ids de los datos de muestra (publicacionesDatos.js).
const ID = {
  PUBLICADA: 1,
  BORRADOR_DE_MARKETING: 4,
  RECHAZADA_DE_MARKETING: 5,
  EN_REVISION_A: 6,
  EN_REVISION_CRISTO_REY: 7,
  PROGRAMADA: 8,
  EXPIRADA: 9,
  ARCHIVADA: 10,
  BORRADOR_DEL_PARROCO: 11,
};

describe('mocks de publicaciones del panel', () => {
  beforeEach(reiniciarMocksAdmin);
  afterEach(reiniciarMocksAdmin);

  it('sin sesión, todas las operaciones responden 401', async () => {
    for (const llamada of [
      () => listar(),
      () => leer(1),
      () => clienteHttp.post('/admin/publicaciones', {}),
      () => clienteHttp.patch('/admin/publicaciones/1', {}),
      () => clienteHttp.delete('/admin/publicaciones/4'),
      () => clienteHttp.post('/admin/publicaciones/6/aprobar'),
    ]) {
      expect((await capturar(llamada())).estado).toBe(401);
    }
  });

  describe('listado', () => {
    it('devuelve la lista paginada sin el contenido, con fecha de creación descendente por defecto', async () => {
      await entrar('marketing');
      const { datos, paginacion } = await listar();

      expect(paginacion).toMatchObject({ pagina: 1, porPagina: 10, total: 11, totalPaginas: 2 });
      expect(datos).toHaveLength(10);
      expect(datos.every((p) => !('contenido' in p))).toBe(true);
      const fechas = datos.map((p) => p.fechaCreacion);
      expect(fechas).toEqual([...fechas].sort().reverse());
    });

    it('filtra por estado y por tipo (varios valores separados por comas)', async () => {
      await entrar('parroco');

      const enRevision = (await listar({ estado: 'EN_REVISION' })).datos;
      expect(enRevision.map((p) => p.id).sort()).toEqual([ID.EN_REVISION_A, ID.EN_REVISION_CRISTO_REY]);

      const noticias = (await listar({ tipo: 'NOTICIA,NOTA_DE_PRENSA', porPagina: 50 })).datos;
      expect(noticias.some((p) => p.tipo.codigo === 'AVISO')).toBe(false);
      expect(noticias).toHaveLength(9);

      const avisos = (await listar({ tipo: 'AVISO' })).datos;
      expect(avisos.map((p) => p.tipo.codigo)).toEqual(['AVISO', 'AVISO']);
    });

    it('filtra por autor=yo, categoría y búsqueda sin distinguir acentos', async () => {
      await entrar('marketing');

      const propias = (await listar({ autor: 'yo', porPagina: 50 })).datos;
      expect(propias.map((p) => p.id).sort((a, b) => a - b)).toEqual([4, 5, 6, 7]);

      const porCategoria = (await listar({ categoria: 'pasionistas' })).datos;
      expect(porCategoria.every((p) => p.categoria.slug === 'pasionistas')).toBe(true);

      const buscada = (await listar({ buscar: 'procesion' })).datos;
      expect(buscada.map((p) => p.id)).toContain(ID.EN_REVISION_CRISTO_REY);
    });

    it('responde 400 con un estado o una página inválidos y una página fuera de rango da lista vacía', async () => {
      await entrar('parroco');

      const e = await capturar(listar({ estado: 'BORRADORCITO', porPagina: 500 }));
      expect(e.estado).toBe(400);
      expect(e.codigo).toBe('VALIDACION');
      expect(e.detalles.map((d) => d.campo)).toEqual(['query.estado', 'query.porPagina']);

      const fuera = await listar({ pagina: 9 });
      expect(fuera.datos).toEqual([]);
      expect(fuera.paginacion.total).toBe(11);
    });
  });

  describe('detalle y acciones disponibles por rol', () => {
    it('trae el contenido con el envoltorio BlockNote y devuelve 404 si no existe', async () => {
      await entrar('marketing');
      const pub = await leer(ID.EN_REVISION_CRISTO_REY);

      expect(pub.contenido).toMatchObject({ formato: 'blocknote', version: 1 });
      expect(pub.imagenPortada).toMatchObject({ id: 3 });
      expect((await capturar(leer(999))).estado).toBe(404);
    });

    it('Marketing: edita y envía solo su borrador; en revisión no tiene acciones; lo ajeno solo se lee', async () => {
      await entrar('marketing');

      expect((await leer(ID.BORRADOR_DE_MARKETING)).acciones).toEqual(['EDITAR', 'ELIMINAR', 'ENVIAR_REVISION']);
      expect((await leer(ID.EN_REVISION_CRISTO_REY)).acciones).toEqual([]);
      expect((await leer(ID.BORRADOR_DEL_PARROCO)).acciones).toEqual([]);
      expect((await leer(ID.PUBLICADA)).acciones).toEqual([]);
    });

    it('Párroco: publica, aprueba, rechaza, archiva y restaura', async () => {
      await entrar('parroco');

      expect((await leer(ID.RECHAZADA_DE_MARKETING)).acciones).toEqual(['EDITAR', 'ELIMINAR', 'PUBLICAR']);
      expect((await leer(ID.EN_REVISION_CRISTO_REY)).acciones).toEqual(['EDITAR', 'APROBAR', 'RECHAZAR']);
      expect((await leer(ID.PUBLICADA)).acciones).toEqual(['EDITAR', 'ARCHIVAR']);
      expect((await leer(ID.ARCHIVADA)).acciones).toEqual(['RESTAURAR', 'ELIMINAR']);
    });

    it('calcula visibleEnPortal: vigente sí; programada, expirada y borrador no', async () => {
      await entrar('parroco');

      expect((await leer(ID.PUBLICADA)).visibleEnPortal).toBe(true);
      expect((await leer(ID.PROGRAMADA)).visibleEnPortal).toBe(false);
      expect((await leer(ID.EXPIRADA)).visibleEnPortal).toBe(false);
      expect((await leer(ID.BORRADOR_DE_MARKETING)).visibleEnPortal).toBe(false);
    });

    it('el autor ve la observación del rechazo en su borrador', async () => {
      await entrar('marketing');
      const pub = await leer(ID.RECHAZADA_DE_MARKETING);

      expect(pub.estado.codigo).toBe('BORRADOR');
      expect(pub.revision.observacion).toMatch(/foto del encuentro/);
      expect(pub.revision.revisadoPor.nombreCompleto).toBe('Párroco (desarrollo)');
    });
  });

  describe('crear', () => {
    it('crea siempre en BORRADOR, con el autor de la sesión y un slug generado', async () => {
      await entrar('marketing');
      const pub = await crear({ titulo: 'Misa de Navidad: ¡horarios!' });

      expect(pub).toMatchObject({
        estado: { codigo: 'BORRADOR' },
        tipo: { codigo: 'NOTICIA' },
        slug: 'misa-de-navidad-horarios',
        autor: { id: 4 },
        revision: null,
        visibleEnPortal: false,
        acciones: ['EDITAR', 'ELIMINAR', 'ENVIAR_REVISION'],
      });
      expect(await leer(pub.id)).toMatchObject({ id: pub.id });
    });

    it('agrega un sufijo si el slug generado ya existe', async () => {
      await entrar('marketing');
      const a = await crear({ titulo: 'Titulo repetido' });
      const b = await crear({ titulo: 'Titulo repetido' });

      expect([a.slug, b.slug]).toEqual(['titulo-repetido', 'titulo-repetido-2']);
    });

    it('responde 409 si el slug indicado ya existe', async () => {
      await entrar('marketing');
      const e = await capturar(crear({ slug: 'primeras-comuniones-42-ninos-recibieron-a-jesus' }));

      expect(e.estado).toBe(409);
      expect(e.codigo).toBe('CONFLICTO');
    });

    it('responde 403 si el rol no puede crear ese tipo', async () => {
      await entrar('secretaria');
      expect((await capturar(crear())).estado).toBe(403);

      await entrar('marketing');
      const e = await capturar(crear({ tipo: 'AVISO' }));
      expect(e.estado).toBe(403);
      expect(e.codigo).toBe('SIN_PERMISO');
    });

    it('responde 400 con un detalle por campo inválido', async () => {
      await entrar('marketing');
      const e = await capturar(
        crear({ titulo: 'ab', resumen: 'x'.repeat(401), categoriaId: 99, imagenPortadaId: 6, urlExterna: 'http://x.com' }),
      );

      expect(e.estado).toBe(400);
      expect(e.detalles.map((d) => d.campo).sort()).toEqual(
        ['categoriaId', 'imagenPortadaId', 'resumen', 'titulo', 'urlExterna'].sort(),
      );
    });

    it('rechaza los bloques, estilos y enlaces que contenido.md no permite', async () => {
      await entrar('marketing');
      const malos = [
        documento({ id: 't', type: 'table', props: {}, content: [], children: [] }),
        documento({ ...parrafo('h', 'Título'), type: 'heading', props: { level: 1, isToggleable: false } }),
        documento({
          ...parrafo('c', 'x'),
          content: [{ type: 'text', text: 'x', styles: { code: true } }],
        }),
        documento({
          ...parrafo('e', 'x'),
          content: [{ type: 'link', href: 'javascript:alert(1)', content: [{ type: 'text', text: 'x', styles: {} }] }],
        }),
        documento({ id: 'i', type: 'image', props: { url: 'https://otro-sitio.com/foto.jpg' }, children: [] }),
      ];

      for (const contenido of malos) {
        const e = await capturar(crear({ contenido }));
        expect(e.estado).toBe(400);
        expect(e.detalles[0].campo).toBe('contenido.bloques');
      }
      expect((await capturar(crear({ contenido: { formato: 'html', bloques: [] } }))).detalles[0].campo).toBe('contenido');
    });

    it('acepta imágenes de la biblioteca en el contenido', async () => {
      await entrar('marketing');
      const imagen = {
        id: 'img',
        type: 'image',
        props: { url: '/media/seed/crucifijo.webp', caption: 'Crucifijo', showPreview: true },
        children: [],
      };

      expect((await crear({ contenido: documento(imagen) })).estado.codigo).toBe('BORRADOR');
    });
  });

  describe('flujo de Marketing: redactar, enviar a revisión y no poder editar', () => {
    it('envía a revisión su borrador y después no puede editarlo, eliminarlo ni publicarlo', async () => {
      await entrar('marketing');
      const nueva = await crear({ titulo: 'Retiro de jóvenes' });

      const enviada = await accion(nueva.id, 'enviar-revision');
      expect(enviada.estado).toEqual({ codigo: 'EN_REVISION', nombre: 'En revisión' });
      expect(enviada.acciones).toEqual([]);

      const edicion = await capturar(clienteHttp.patch(`/admin/publicaciones/${nueva.id}`, { titulo: 'Otro título' }));
      expect(edicion.estado).toBe(403);
      expect(edicion.codigo).toBe('SIN_PERMISO');

      expect((await capturar(clienteHttp.delete(`/admin/publicaciones/${nueva.id}`))).estado).toBe(409);
      expect((await capturar(accion(nueva.id, 'publicar'))).estado).toBe(403);
      expect((await capturar(accion(nueva.id, 'aprobar'))).estado).toBe(403);
      expect((await capturar(accion(nueva.id, 'rechazar', { observacion: 'No me gusta' }))).estado).toBe(403);
    });

    it('no puede editar ni enviar el borrador de otro autor', async () => {
      await entrar('marketing');

      const edicion = await capturar(clienteHttp.patch(`/admin/publicaciones/${ID.BORRADOR_DEL_PARROCO}`, { destacada: true }));
      expect(edicion.estado).toBe(403);
      expect((await capturar(accion(ID.BORRADOR_DEL_PARROCO, 'enviar-revision'))).estado).toBe(403);
    });

    it('no puede enviar a revisión algo que no está en borrador (409) ni un aviso (409)', async () => {
      await entrar('marketing');

      const e = await capturar(accion(ID.EN_REVISION_A, 'enviar-revision'));
      expect(e.estado).toBe(409);
      expect(e.message).toBe('Solo se pueden enviar a revisión publicaciones en borrador. Esta está en «En revisión».');
      expect((await capturar(accion(2, 'enviar-revision'))).estado).toBe(409);
    });

    it('exige un borrador completo para enviarlo: contenido y texto alternativo de la portada', async () => {
      await entrar('marketing');
      const vacio = await crear({ contenido: documento(parrafo('v', '')), imagenPortadaId: 12 });

      const e = await capturar(accion(vacio.id, 'enviar-revision'));
      expect(e.estado).toBe(400);
      expect(e.message).toBe('La publicación no está lista para publicarse.');
      expect(e.detalles.map((d) => d.campo)).toEqual(['contenido.bloques', 'imagenPortadaId']);

      // Con un enlace externo y sin portada ya cumple.
      await clienteHttp.patch(`/admin/publicaciones/${vacio.id}`, {
        urlExterna: 'https://ejemplo.org/nota',
        imagenPortadaId: null,
      });
      expect((await accion(vacio.id, 'enviar-revision')).estado.codigo).toBe('EN_REVISION');
    });

    it('después del rechazo corrige su borrador y lo vuelve a enviar', async () => {
      await entrar('marketing');

      const editada = (await clienteHttp.patch(`/admin/publicaciones/${ID.RECHAZADA_DE_MARKETING}`, { resumen: 'Resumen nuevo' })).datos;
      expect(editada.estado.codigo).toBe('BORRADOR');
      expect(editada.revision.observacion).not.toBeNull(); // se conserva hasta la nueva decisión

      expect((await accion(ID.RECHAZADA_DE_MARKETING, 'enviar-revision')).estado.codigo).toBe('EN_REVISION');
    });
  });

  describe('flujo del Párroco: aprobar y rechazar', () => {
    it('aprueba una publicación en revisión: queda publicada, con revisor y sin observación', async () => {
      await entrar('parroco');
      const pub = await accion(ID.EN_REVISION_A, 'aprobar');

      expect(pub.estado.codigo).toBe('PUBLICADO');
      expect(pub.revision).toMatchObject({ revisadoPor: { id: 2 }, observacion: null });
      expect(pub.visibleEnPortal).toBe(true);
      expect(pub.acciones).toEqual(['EDITAR', 'ARCHIVAR']);
    });

    it('con fecha futura la aprobación la deja programada', async () => {
      await entrar('parroco');
      const pub = await accion(ID.EN_REVISION_CRISTO_REY, 'aprobar'); // su fecha deseada es futura

      expect(pub.estado.codigo).toBe('PUBLICADO');
      expect(pub.visibleEnPortal).toBe(false);
      expect(new Date(pub.fechaPublicacion).getTime()).toBeGreaterThan(Date.now());
    });

    it('rechazar sin observación da error 400, y con observación vuelve a borrador', async () => {
      await entrar('parroco');

      for (const cuerpo of [undefined, { observacion: '' }, { observacion: '   ' }, { observacion: 'abcd' }]) {
        const e = await capturar(accion(ID.EN_REVISION_A, 'rechazar', cuerpo));
        expect(e.estado).toBe(400);
        expect(e.detalles).toEqual([
          { campo: 'observacion', mensaje: 'La observación es obligatoria, de 5 a 500 caracteres.' },
        ]);
      }
      expect((await capturar(accion(ID.EN_REVISION_A, 'rechazar', { observacion: 'x'.repeat(501) }))).estado).toBe(400);
      expect((await leer(ID.EN_REVISION_A)).estado.codigo).toBe('EN_REVISION'); // nada cambió

      const pub = await accion(ID.EN_REVISION_A, 'rechazar', { observacion: 'Falta la hora de la misa.' });
      expect(pub.estado.codigo).toBe('BORRADOR');
      expect(pub.revision).toMatchObject({ revisadoPor: { id: 2 }, observacion: 'Falta la hora de la misa.' });
    });

    it('el autor ve la observación en su borrador después del rechazo', async () => {
      await entrar('parroco');
      await accion(ID.EN_REVISION_A, 'rechazar', { observacion: 'Falta la hora de la misa.' });

      await entrar('marketing');
      const pub = await leer(ID.EN_REVISION_A);
      expect(pub.revision.observacion).toBe('Falta la hora de la misa.');
      expect(pub.acciones).toEqual(['EDITAR', 'ELIMINAR', 'ENVIAR_REVISION']);
    });

    it('una acción desde un estado que no le corresponde responde 409 y no cambia nada', async () => {
      await entrar('parroco');

      const e = await capturar(accion(ID.BORRADOR_DE_MARKETING, 'aprobar'));
      expect(e.estado).toBe(409);
      expect(e.codigo).toBe('CONFLICTO');
      expect(e.message).toBe('Solo se pueden aprobar publicaciones en revisión. Esta está en «Borrador».');
      expect((await leer(ID.BORRADOR_DE_MARKETING)).estado.codigo).toBe('BORRADOR');
      expect((await capturar(accion(ID.PUBLICADA, 'rechazar', { observacion: 'Ya publicada' }))).estado).toBe(409);
    });

    it('si dos personas deciden, gana la primera y la segunda recibe 409', async () => {
      await entrar('parroco');
      await accion(ID.EN_REVISION_A, 'aprobar');

      expect((await capturar(accion(ID.EN_REVISION_A, 'rechazar', { observacion: 'Demasiado tarde' }))).estado).toBe(409);
    });
  });

  describe('publicar, archivar, restaurar, editar y eliminar', () => {
    it('el Párroco publica directo un borrador, lo archiva y lo restaura', async () => {
      await entrar('parroco');

      const publicada = await accion(ID.BORRADOR_DEL_PARROCO, 'publicar');
      expect(publicada).toMatchObject({ estado: { codigo: 'PUBLICADO' }, visibleEnPortal: true });

      expect((await accion(ID.BORRADOR_DEL_PARROCO, 'archivar')).estado.codigo).toBe('ARCHIVADO');
      expect((await accion(ID.BORRADOR_DEL_PARROCO, 'restaurar')).estado.codigo).toBe('BORRADOR');
    });

    it('programa con una fecha futura y valida la expiración', async () => {
      await entrar('parroco');
      const futura = new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString();
      const pasada = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

      const e = await capturar(accion(ID.BORRADOR_DEL_PARROCO, 'publicar', { fechaPublicacion: futura, fechaExpiracion: pasada }));
      expect(e.estado).toBe(400);
      expect(e.detalles.map((d) => d.campo)).toEqual(['fechaExpiracion']);

      const pub = await accion(ID.BORRADOR_DEL_PARROCO, 'publicar', { fechaPublicacion: futura });
      expect(pub.visibleEnPortal).toBe(false);
      expect(pub.estado.codigo).toBe('PUBLICADO');
    });

    it('una fecha de publicación pasada se cambia por ahora', async () => {
      await entrar('parroco');
      const pasada = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const pub = await accion(ID.BORRADOR_DEL_PARROCO, 'publicar', { fechaPublicacion: pasada });

      expect(new Date(pub.fechaPublicacion).getTime()).toBeGreaterThan(Date.now() - 60 * 1000);
    });

    it('edita según el estado: archivada no (409), publicada no cambia el slug (409), tipo no cambia (400)', async () => {
      await entrar('parroco');

      expect((await capturar(clienteHttp.patch(`/admin/publicaciones/${ID.ARCHIVADA}`, { titulo: 'Nuevo' }))).estado).toBe(409);
      expect((await capturar(clienteHttp.patch(`/admin/publicaciones/${ID.PUBLICADA}`, { slug: 'otro-slug' }))).estado).toBe(409);
      expect((await capturar(clienteHttp.patch(`/admin/publicaciones/${ID.PUBLICADA}`, { tipo: 'AVISO' }))).estado).toBe(400);

      const editada = (
        await clienteHttp.patch(`/admin/publicaciones/${ID.EN_REVISION_A}`, { titulo: 'Título corregido', resumen: null })
      ).datos;
      expect(editada).toMatchObject({ titulo: 'Título corregido', resumen: null, estado: { codigo: 'EN_REVISION' } });
    });

    it('elimina borradores propios y archivadas; en revisión y publicadas son 409 aun para el Administrador', async () => {
      await entrar('marketing');
      const propia = await crear();
      await clienteHttp.delete(`/admin/publicaciones/${propia.id}`);
      expect((await capturar(leer(propia.id))).estado).toBe(404);
      expect((await capturar(clienteHttp.delete(`/admin/publicaciones/${ID.BORRADOR_DEL_PARROCO}`))).estado).toBe(403);

      await entrar('admin');
      expect((await capturar(clienteHttp.delete(`/admin/publicaciones/${ID.EN_REVISION_A}`))).estado).toBe(409);
      expect((await capturar(clienteHttp.delete(`/admin/publicaciones/${ID.PUBLICADA}`))).estado).toBe(409);
      await clienteHttp.delete(`/admin/publicaciones/${ID.ARCHIVADA}`);
      expect((await capturar(leer(ID.ARCHIVADA))).estado).toBe(404);
    });
  });
});
