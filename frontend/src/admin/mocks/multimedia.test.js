import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { clienteHttp, ErrorApi } from '../../services/clienteHttp.js';
import { reiniciarMocksAdmin } from './handlers.js';
import { validarArchivo } from './multimediaMock.js';
import { CONTRASENA_DESARROLLO } from './usuarios.js';

const MB = 1024 * 1024;

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

function formulario(archivo, campos = {}) {
  const datos = new FormData();
  if (archivo) datos.append('archivo', archivo);
  for (const [clave, valor] of Object.entries(campos)) datos.append(clave, valor);
  return datos;
}

const imagen = (nombre = 'foto.jpg', tipo = 'image/jpeg', bytes = 'contenido') => new File([bytes], nombre, { type: tipo });

const listar = (parametros) => clienteHttp.get('/admin/multimedia', { parametros });

describe('mocks de multimedia del panel', () => {
  beforeEach(reiniciarMocksAdmin);
  afterEach(reiniciarMocksAdmin);

  describe('sin sesión', () => {
    it('todas las operaciones responden 401', async () => {
      for (const llamada of [
        () => listar(),
        () => clienteHttp.post('/admin/multimedia', formulario(imagen())),
        () => clienteHttp.patch('/admin/multimedia/8', { textoAlternativo: 'x' }),
        () => clienteHttp.delete('/admin/multimedia/9'),
      ]) {
        expect((await capturar(llamada())).estado).toBe(401);
      }
    });
  });

  describe('GET /admin/multimedia', () => {
    beforeEach(() => entrar('admin'));

    it('devuelve la primera página, ordenada por fecha de subida descendente', async () => {
      const { datos, paginacion } = await listar();

      expect(paginacion).toEqual({ pagina: 1, porPagina: 10, total: 14, totalPaginas: 2 });
      expect(datos).toHaveLength(10);
      expect(datos[0].id).toBe(8);
      const fechas = datos.map((a) => a.fechaSubida);
      expect(fechas).toEqual([...fechas].sort().reverse());
    });

    it('incluye el ejemplo del contrato campo por campo', async () => {
      const { datos } = await listar({ buscar: 'primeras comuniones' });

      expect(datos).toEqual([
        {
          id: 8,
          url: 'https://cdn.pasionistas.org.bo/sedes/senor-de-la-exaltacion/2026/11/4b1e9c2a-7d3f-4e8a-9c61-2f0d8a5b3e17.webp',
          nombreOriginal: 'primeras comuniones 2026.webp',
          tipoMime: 'image/webp',
          tamanoBytes: 412870,
          ancho: 1600,
          alto: 1067,
          textoAlternativo: 'Niños de primera comunión frente al altar',
          sede: { id: 1, nombre: 'Parroquia Señor de la Exaltación', slug: 'senor-de-la-exaltacion' },
          subidoPor: { id: 4, nombreCompleto: 'Marketing (desarrollo)' },
          fechaSubida: '2026-11-12T09:12:44-04:00',
          enUso: true,
        },
      ]);
    });

    it('incluye los archivos del seed con sus URL relativas', async () => {
      const { datos } = await listar({ porPagina: 50, orden: 'fechaSubida' });

      expect(datos.map((a) => a.url).filter((url) => url.startsWith('/media/seed/'))).toEqual([
        '/media/seed/exterior-parroquia.webp',
        '/media/seed/crucifijo.webp',
        '/media/seed/altar.webp',
        '/media/seed/padre_gregorio.jpg',
        '/media/seed/pastoral-familiar.jpg',
        '/media/seed/portada-final.mp4',
      ]);
    });

    it('pagina: la segunda página trae el resto y una fuera de rango no es un error', async () => {
      const segunda = await listar({ pagina: 2 });
      expect(segunda.datos).toHaveLength(4);
      expect(segunda.paginacion.pagina).toBe(2);

      const fuera = await listar({ pagina: 9 });
      expect(fuera.datos).toEqual([]);
      expect(fuera.paginacion).toEqual({ pagina: 9, porPagina: 10, total: 14, totalPaginas: 2 });
    });

    it('filtra por clase', async () => {
      expect((await listar({ clase: 'IMAGEN' })).paginacion.total).toBe(10);
      expect((await listar({ clase: 'VIDEO' })).datos.map((a) => a.id).sort((a, b) => a - b)).toEqual([6, 13]);
      expect((await listar({ clase: 'DOCUMENTO' })).datos.map((a) => a.tipoMime)).toEqual([
        'application/pdf',
        'application/pdf',
      ]);
    });

    it('filtra por enUso', async () => {
      expect((await listar({ enUso: 'true' })).paginacion.total).toBe(8);
      const libres = await listar({ enUso: 'false', porPagina: 50 });
      expect(libres.paginacion.total).toBe(6);
      expect(libres.datos.every((a) => a.enUso === false)).toBe(true);
    });

    it('busca en el nombre original y en el texto alternativo, sin distinguir tildes ni mayúsculas', async () => {
      expect((await listar({ buscar: 'PROCESION' })).datos.map((a) => a.id)).toEqual([9]);
      expect((await listar({ buscar: 'ninos de primera' })).datos.map((a) => a.id)).toEqual([8]);
      expect((await listar({ buscar: 'zzz' })).paginacion).toMatchObject({ total: 0, totalPaginas: 0 });
    });

    it('ordena por tamaño', async () => {
      expect((await listar({ orden: 'tamanoBytes' })).datos[0].id).toBe(2);
      expect((await listar({ orden: '-tamanoBytes' })).datos[0].id).toBe(13);
    });

    it('responde 400 VALIDACION con parámetros inválidos', async () => {
      const e = await capturar(listar({ porPagina: 51, clase: 'FOTO' }));

      expect(e.estado).toBe(400);
      expect(e.codigo).toBe('VALIDACION');
      expect(e.detalles.map((d) => d.campo).sort()).toEqual(['query.clase', 'query.porPagina']);
    });

    it('el Administrador recibe 404 con una sede que no existe', async () => {
      expect((await capturar(listar({ sede: 'no-existe' }))).estado).toBe(404);
      expect((await listar({ sede: 'senor-de-la-exaltacion' })).paginacion.total).toBe(14);
    });
  });

  describe('restricción por sede', () => {
    it('un rol distinto del Administrador no puede pedir otra sede', async () => {
      await entrar('marketing');

      const e = await capturar(listar({ sede: 'otra-sede' }));
      expect(e.estado).toBe(403);
      expect(e.codigo).toBe('SIN_PERMISO');
      expect(e.message).toBe('Este recurso pertenece a otra sede.');
      expect((await listar({ sede: 'senor-de-la-exaltacion' })).paginacion.total).toBe(14);
    });
  });

  describe('POST /admin/multimedia', () => {
    beforeEach(() => entrar('marketing'));

    it('sube una imagen: 201 con el objeto archivo y enUso false', async () => {
      const { datos } = await clienteHttp.post(
        '/admin/multimedia',
        formulario(imagen('Misa de Navidad.jpg'), { textoAlternativo: 'Misa de Navidad' }),
      );

      expect(datos).toMatchObject({
        id: 15,
        tipoMime: 'image/jpeg',
        tamanoBytes: 9,
        textoAlternativo: 'Misa de Navidad',
        sede: { id: 1, slug: 'senor-de-la-exaltacion' },
        subidoPor: { id: 4, nombreCompleto: 'Marketing (desarrollo)' },
        enUso: false,
      });
      expect(datos.fechaSubida).toMatch(/-04:00$/);
      // En jsdom el fetch de Node pierde el nombre del File ("blob"); en un navegador se conserva.
      expect(datos.nombreOriginal).toBeTruthy();

      // Aparece primero en la biblioteca.
      expect((await listar()).datos[0].id).toBe(15);
    });

    it('acepta video y PDF, sin texto alternativo', async () => {
      const video = await clienteHttp.post('/admin/multimedia', formulario(imagen('a.mp4', 'video/mp4')));
      const pdf = await clienteHttp.post('/admin/multimedia', formulario(imagen('a.pdf', 'application/pdf')));

      expect(video.datos).toMatchObject({ tipoMime: 'video/mp4', textoAlternativo: null });
      expect(pdf.datos).toMatchObject({ tipoMime: 'application/pdf', ancho: null, alto: null });
    });

    it('responde 415 TIPO_NO_PERMITIDO con GIF, SVG o ejecutables', async () => {
      for (const tipo of ['image/gif', 'image/svg+xml', 'application/x-msdownload']) {
        const e = await capturar(clienteHttp.post('/admin/multimedia', formulario(imagen('x', tipo))));
        expect(e.estado).toBe(415);
        expect(e.codigo).toBe('TIPO_NO_PERMITIDO');
      }
    });

    it('responde 415 si la petición no es multipart/form-data', async () => {
      const e = await capturar(clienteHttp.post('/admin/multimedia', { archivo: 'x' }));

      expect(e.estado).toBe(415);
      expect(e.codigo).toBe('TIPO_NO_PERMITIDO');
    });

    it('responde 413 con el límite en el mensaje si una imagen pasa de 30 MB', async () => {
      const grande = new File([new Uint8Array(30 * MB + 1)], 'grande.jpg', { type: 'image/jpeg' });

      const e = await capturar(clienteHttp.post('/admin/multimedia', formulario(grande)));
      expect(e.estado).toBe(413);
      expect(e.codigo).toBe('ARCHIVO_DEMASIADO_GRANDE');
      expect(e.message).toBe('Las imágenes pueden pesar hasta 30 MB.');
    });

    it('responde 413 si un PDF pasa de 50 MB', async () => {
      const grande = new File([new Uint8Array(50 * MB + 1)], 'grande.pdf', { type: 'application/pdf' });

      const e = await capturar(clienteHttp.post('/admin/multimedia', formulario(grande)));
      expect(e.estado).toBe(413);
      expect(e.message).toBe('Los documentos PDF pueden pesar hasta 50 MB.');
    });

    it('los límites por clase se aplican (video hasta 2 GB)', () => {
      expect(validarArchivo({ type: 'video/mp4', size: 2048 * MB })).toBeNull();
      expect(validarArchivo({ type: 'video/webm', size: 2048 * MB + 1 })).toMatchObject({
        estado: 413,
        mensaje: 'Los videos pueden pesar hasta 2 GB.',
      });
      expect(validarArchivo({ type: 'image/png', size: 30 * MB })).toBeNull();
    });

    it('responde 400 VALIDACION si falta el archivo, si hay más de uno o si el texto es muy largo', async () => {
      const sinArchivo = await capturar(clienteHttp.post('/admin/multimedia', formulario(null, { textoAlternativo: 'x' })));
      expect(sinArchivo.estado).toBe(400);
      expect(sinArchivo.detalles[0].campo).toBe('archivo');

      const dos = formulario(imagen('a.jpg'));
      dos.append('archivo', imagen('b.jpg'));
      const variosArchivos = await capturar(clienteHttp.post('/admin/multimedia', dos));
      expect(variosArchivos.estado).toBe(400);
      expect(variosArchivos.detalles[0].mensaje).toBe('Envía un solo archivo.');

      const largo = await capturar(
        clienteHttp.post('/admin/multimedia', formulario(imagen(), { textoAlternativo: 'a'.repeat(256) })),
      );
      expect(largo.estado).toBe(400);
      expect(largo.detalles[0].campo).toBe('textoAlternativo');
    });
  });

  describe('PATCH /admin/multimedia/:id', () => {
    beforeEach(() => entrar('marketing'));

    it('cambia el texto alternativo y devuelve el objeto completo', async () => {
      const { datos } = await clienteHttp.patch('/admin/multimedia/8', {
        textoAlternativo: 'Niños de primera comunión con sus catequistas frente al altar',
      });

      expect(datos.id).toBe(8);
      expect(datos.textoAlternativo).toBe('Niños de primera comunión con sus catequistas frente al altar');
      expect(datos.nombreOriginal).toBe('primeras comuniones 2026.webp');
    });

    it('null borra el texto alternativo', async () => {
      const { datos } = await clienteHttp.patch('/admin/multimedia/8', { textoAlternativo: null });

      expect(datos.textoAlternativo).toBeNull();
    });

    it('responde 404 si no existe y 400 si el cuerpo no es válido', async () => {
      expect((await capturar(clienteHttp.patch('/admin/multimedia/999', { textoAlternativo: 'x' }))).estado).toBe(404);
      expect((await capturar(clienteHttp.patch('/admin/multimedia/8', {}))).estado).toBe(400);
      expect(
        (await capturar(clienteHttp.patch('/admin/multimedia/8', { textoAlternativo: 'a'.repeat(256) }))).estado,
      ).toBe(400);
    });
  });

  describe('DELETE /admin/multimedia/:id', () => {
    it('elimina un archivo que no está en uso: 204 y deja de existir', async () => {
      await entrar('admin');

      expect(await clienteHttp.delete('/admin/multimedia/9')).toBeNull();
      expect((await listar({ porPagina: 50 })).paginacion.total).toBe(13);
      expect((await capturar(clienteHttp.delete('/admin/multimedia/9'))).estado).toBe(404);
    });

    it('responde 409 CONFLICTO con el motivo si el archivo está en uso (ejemplo del contrato)', async () => {
      await entrar('admin');

      const e = await capturar(clienteHttp.delete('/admin/multimedia/8'));
      expect(e.estado).toBe(409);
      expect(e.codigo).toBe('CONFLICTO');
      expect(e.message).toBe('El archivo está en uso y no se puede eliminar.');
      expect(e.detalles).toEqual([
        {
          campo: 'id',
          mensaje: 'Usado como portada de la publicación «Primeras comuniones: 42 niños recibieron a Jesús».',
        },
      ]);
    });

    it('fuera del Administrador, cada usuario solo elimina lo que subió', async () => {
      await entrar('marketing');

      const ajeno = await capturar(clienteHttp.delete('/admin/multimedia/10')); // lo subió Secretaría
      expect(ajeno.estado).toBe(403);
      expect(ajeno.codigo).toBe('SIN_PERMISO');

      expect(await clienteHttp.delete('/admin/multimedia/9')).toBeNull(); // lo subió Marketing
    });
  });
});
