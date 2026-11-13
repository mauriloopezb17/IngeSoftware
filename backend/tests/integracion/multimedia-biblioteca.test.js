// Biblioteca multimedia (listar, ver, editar y eliminar) contra la aplicación real y PostgreSQL,
// con el almacenamiento simulado (aws-sdk-client-mock): nunca se llama al OCI real.
import { randomUUID } from 'node:crypto';
import { DeleteObjectsCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import sharp from 'sharp';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { limpiarContadoresDeIntentos } from '../apoyo/limite.js';
import { SEDE_PRINCIPAL, borrarUsuariosDePrueba, crearUsuarioDePrueba } from '../apoyo/usuarios.js';

vi.stubEnv('OCI_S3_ENDPOINT', 'https://espacio.compat.objectstorage.sa-santiago-1.oraclecloud.com');
vi.stubEnv('OCI_S3_REGION', 'sa-santiago-1');
vi.stubEnv('OCI_S3_BUCKET_NAME', 'bucket-de-prueba');
vi.stubEnv('OCI_S3_ACCESS_KEY_ID', 'clave-de-acceso-de-prueba');
vi.stubEnv('OCI_S3_SECRET_ACCESS_KEY', 'secreto-oci-de-prueba');
vi.stubEnv('CDN_PUBLIC_URL', 'https://cdn.ejemplo.test');

const { createApp } = await import('../../src/app.js');
const { consultar, cerrarPool } = await import('../../src/db/index.js');
const { cerrarRedis } = await import('../../src/db/redis.js');
const { cerrarClienteS3 } = await import('../../src/storage/oci.js');

const app = createApp();
const s3 = mockClient(S3Client);

const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
const jpeg = (ancho, alto) =>
  sharp({ create: { width: ancho, height: alto, channels: 3, background: '#a33' } })
    .jpeg()
    .toBuffer();

const sesiones = {};
const usuarios = {};
let sedeAjena;

async function iniciarSesion(usuario) {
  const respuesta = await request(app)
    .post('/api/auth/login')
    .send({ correo: usuario.correo, contrasena: usuario.contrasena });
  return respuesta.headers['set-cookie'][0].split(';')[0];
}

async function usuarioConSesion(nombre, opciones) {
  usuarios[nombre] = await crearUsuarioDePrueba(opciones);
  sesiones[nombre] = await iniciarSesion(usuarios[nombre]);
}

// Sube un archivo por la API y devuelve su objeto.
async function subir(quien, buffer, { nombre = 'prueba-archivo.jpg', tipo, campos = {} } = {}) {
  const peticion = request(app).post('/api/admin/multimedia').set('Cookie', sesiones[quien]);
  for (const [campo, valor] of Object.entries(campos)) peticion.field(campo, valor);
  const respuesta = await peticion.attach('archivo', buffer, {
    filename: nombre,
    contentType: tipo,
  });
  expect(respuesta.status).toBe(201);
  return respuesta.body.datos;
}

const claveDe = (datos) => datos.url.replace('https://cdn.ejemplo.test/', '');
const uuidDe = (datos) => claveDe(datos).match(/([0-9a-f-]{36})\.webp$/)[1];

// Filas de prueba que usan un archivo (todas con el prefijo "prueba-" para limpiarlas al final).
const sub = (tabla) => `(SELECT id FROM ${tabla} ORDER BY id LIMIT 1)`;
const usar = {
  portadaPublicacion: (m, titulo) =>
    consultar(
      `INSERT INTO publicacion (sede_id, tipo_publicacion_id, estado_publicacion_id, autor_id, titulo, slug, contenido, imagen_portada_id)
       VALUES (1, ${sub('tipo_publicacion')}, ${sub('estado_publicacion')}, $1, $2, $3, '[]', $4)`,
      [usuarios.marketing.id, titulo, `prueba-${randomUUID()}`, m.id],
    ),
  contenidoPublicacion: (m, titulo) =>
    consultar(
      `INSERT INTO publicacion (sede_id, tipo_publicacion_id, estado_publicacion_id, autor_id, titulo, slug, contenido)
       VALUES (1, ${sub('tipo_publicacion')}, ${sub('estado_publicacion')}, $1, $2, $3, $4::jsonb)`,
      [
        usuarios.marketing.id,
        titulo,
        `prueba-${randomUUID()}`,
        // El contenido usa una variante, no la imagen principal.
        JSON.stringify([
          { type: 'image', props: { url: `${claveDe(m).replace('.webp', '-480w.webp')}` } },
        ]),
      ],
    ),
  imagenEvento: (m, titulo) =>
    consultar(
      `INSERT INTO evento (sede_id, categoria_evento_id, estado_publicacion_id, creado_por, titulo, fecha_inicio, imagen_id)
       VALUES (1, ${sub('categoria_evento')}, ${sub('estado_publicacion')}, $1, $2, now(), $3)`,
      [usuarios.marketing.id, titulo, m.id],
    ),
  imagenGrupo: (m, nombre) =>
    consultar('INSERT INTO grupo_pastoral (sede_id, nombre, imagen_id) VALUES (1, $1, $2)', [
      nombre,
      m.id,
    ]),
  archivoBoletin: (m, titulo) =>
    consultar(
      "INSERT INTO boletin (sede_id, archivo_id, publicado_por, titulo, periodo) VALUES (1, $1, $2, $3, '2099-01-01')",
      [m.id, usuarios.marketing.id, titulo],
    ),
  contenidoServicio: (m, nombre) =>
    consultar(
      `INSERT INTO servicio (sede_id, slug, nombre, descripcion_corta, contenido)
       VALUES (1, $1, $2, 'x', $3::jsonb)`,
      [`prueba-${randomUUID()}`.slice(0, 80), nombre, JSON.stringify({ imagen: claveDe(m) })],
    ),
  portadaSede: (m) =>
    consultar('UPDATE sede SET url_imagen_portada = $2 WHERE id = $1', [sedeAjena.id, m.url]),
};

beforeAll(async () => {
  await limpiarContadoresDeIntentos();
  const { rows } = await consultar(
    `INSERT INTO sede (tipo_sede_id, nombre, slug)
     VALUES ((SELECT id FROM tipo_sede ORDER BY id LIMIT 1), 'prueba-sede ajena', $1)
     RETURNING id, slug, nombre`,
    [`prueba-${randomUUID()}`.slice(0, 40)],
  );
  sedeAjena = rows[0];

  await usuarioConSesion('marketing', { rol: 'MARKETING' });
  await usuarioConSesion('secretaria', { rol: 'SECRETARIA' });
  await usuarioConSesion('admin', { rol: 'ADMINISTRADOR', sede: null });
  await usuarioConSesion('ajeno', { rol: 'SECRETARIA', sede: sedeAjena.slug });
});

beforeEach(() => {
  s3.reset();
  s3.on(PutObjectCommand).resolves({});
  s3.on(DeleteObjectsCommand).resolves({});
});

afterAll(async () => {
  await consultar(
    "DELETE FROM bloque WHERE pagina_id IN (SELECT id FROM pagina WHERE titulo LIKE 'prueba-%')",
  );
  await consultar("DELETE FROM pagina WHERE titulo LIKE 'prueba-%'");
  await consultar("DELETE FROM boletin WHERE titulo LIKE 'prueba-%'");
  await consultar("DELETE FROM evento WHERE titulo LIKE 'prueba-%'");
  await consultar("DELETE FROM grupo_pastoral WHERE nombre LIKE 'prueba-%'");
  await consultar("DELETE FROM publicacion WHERE titulo LIKE 'prueba-%'");
  await consultar("DELETE FROM servicio WHERE nombre LIKE 'prueba-%'");
  await consultar('UPDATE sede SET url_imagen_portada = NULL WHERE id = $1', [sedeAjena.id]);
  await consultar("DELETE FROM archivo_multimedia WHERE nombre_original LIKE 'prueba%'");
  await limpiarContadoresDeIntentos();
  await borrarUsuariosDePrueba();
  await consultar('DELETE FROM sede WHERE id = $1', [sedeAjena.id]);
  cerrarClienteS3();
  await cerrarPool();
  await cerrarRedis();
});

describe('GET /api/admin/multimedia/:id', () => {
  it('devuelve el archivo con el objeto del panel', async () => {
    const creado = await subir('marketing', await jpeg(1000, 500));

    const respuesta = await request(app)
      .get(`/api/admin/multimedia/${creado.id}`)
      .set('Cookie', sesiones.secretaria);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos).toEqual(creado);
  });

  it('404 si no existe y 400 si el id no es un número', async () => {
    const noExiste = await request(app)
      .get('/api/admin/multimedia/2000000000')
      .set('Cookie', sesiones.marketing);
    expect(noExiste.status).toBe(404);

    const malo = await request(app)
      .get('/api/admin/multimedia/abc')
      .set('Cookie', sesiones.marketing);
    expect(malo.status).toBe(400);
  });

  it('403 si es de otra sede; el Administrador lo ve', async () => {
    const ajeno = await subir('ajeno', PDF, {
      nombre: 'prueba-ajeno.pdf',
      tipo: 'application/pdf',
    });

    const denegado = await request(app)
      .get(`/api/admin/multimedia/${ajeno.id}`)
      .set('Cookie', sesiones.marketing);
    expect(denegado.status).toBe(403);
    expect(denegado.body.error.codigo).toBe('SIN_PERMISO');

    const admin = await request(app)
      .get(`/api/admin/multimedia/${ajeno.id}`)
      .set('Cookie', sesiones.admin);
    expect(admin.status).toBe(200);
  });

  it('sin sesión: 401', async () => {
    expect((await request(app).get('/api/admin/multimedia/1')).status).toBe(401);
  });
});

describe('GET /api/admin/multimedia (biblioteca)', () => {
  let imagen;
  let pdf;
  let delAjeno;

  beforeAll(async () => {
    imagen = await subir('marketing', await jpeg(500, 300), {
      nombre: 'prueba-Primera Comunión.jpg',
      campos: { textoAlternativo: 'Niños frente al zafiro' },
    });
    pdf = await subir('marketing', PDF, { nombre: 'prueba-boletin.pdf', tipo: 'application/pdf' });
    delAjeno = await subir('ajeno', PDF, { nombre: 'prueba-otra.pdf', tipo: 'application/pdf' });
  });

  const listar = (quien, consulta = '') =>
    request(app).get(`/api/admin/multimedia?${consulta}`).set('Cookie', sesiones[quien]);
  const ids = (respuesta) => respuesta.body.datos.map((d) => d.id);

  it('un usuario de sede solo ve los archivos de su sede, el más reciente primero', async () => {
    const respuesta = await listar('marketing', 'porPagina=50');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.paginacion).toMatchObject({ pagina: 1, porPagina: 50 });
    expect(respuesta.body.datos.every((d) => d.sede.slug === SEDE_PRINCIPAL)).toBe(true);
    expect(ids(respuesta)).toContain(imagen.id);
    expect(ids(respuesta)).not.toContain(delAjeno.id);
    const fechas = respuesta.body.datos.map((d) => d.fechaSubida);
    expect(fechas).toEqual([...fechas].sort().reverse());
  });

  it('pedir otra sede es 403 para un usuario de sede; el Administrador filtra por sede', async () => {
    expect((await listar('marketing', `sede=${sedeAjena.slug}`)).status).toBe(403);

    const admin = await listar('admin', `sede=${sedeAjena.slug}`);
    expect(admin.status).toBe(200);
    expect(admin.body.datos.every((d) => d.sede.slug === sedeAjena.slug)).toBe(true);
    expect(ids(admin)).toContain(delAjeno.id);
  });

  it('filtra por clase', async () => {
    const imagenes = await listar('marketing', 'clase=IMAGEN&porPagina=50');
    expect(imagenes.body.datos.every((d) => d.tipoMime.startsWith('image/'))).toBe(true);
    expect(ids(imagenes)).toContain(imagen.id);

    const documentos = await listar('marketing', 'clase=DOCUMENTO&porPagina=50');
    expect(documentos.body.datos.every((d) => d.tipoMime === 'application/pdf')).toBe(true);
    expect(ids(documentos)).toContain(pdf.id);
    expect(ids(documentos)).not.toContain(imagen.id);

    expect((await listar('marketing', 'clase=AUDIO')).status).toBe(400);
  });

  it('busca en el nombre y en el texto alternativo, sin importar mayúsculas ni acentos', async () => {
    expect(ids(await listar('marketing', 'buscar=primera comunion'))).toEqual([imagen.id]);
    expect(ids(await listar('marketing', 'buscar=ZAFIRO'))).toEqual([imagen.id]);
    expect(ids(await listar('marketing', 'buscar=nada-de-esto-existe'))).toEqual([]);
  });

  it('filtra por enUso', async () => {
    await usar.portadaPublicacion(imagen, 'prueba-publicación de la lista');

    const enUso = await listar('marketing', 'enUso=true&porPagina=50');
    expect(ids(enUso)).toContain(imagen.id);
    expect(enUso.body.datos.every((d) => d.enUso)).toBe(true);

    const libres = await listar('marketing', 'enUso=false&porPagina=50');
    expect(ids(libres)).toContain(pdf.id);
    expect(ids(libres)).not.toContain(imagen.id);
  });

  it('ordena por tamaño y pagina', async () => {
    const asc = await listar('marketing', 'orden=tamanoBytes&porPagina=50');
    const tamanos = asc.body.datos.map((d) => d.tamanoBytes);
    expect(tamanos).toEqual([...tamanos].sort((a, b) => a - b));

    const dos = await listar('marketing', 'porPagina=1&pagina=2');
    expect(dos.body.datos).toHaveLength(1);
    expect(dos.body.paginacion.pagina).toBe(2);
    expect(dos.body.paginacion.total).toBeGreaterThanOrEqual(2);

    expect((await listar('marketing', 'orden=nombre')).status).toBe(400);
  });
});

describe('PATCH /api/admin/multimedia/:id', () => {
  it('cambia el texto alternativo; null o vacío lo borra', async () => {
    const creado = await subir('marketing', await jpeg(100, 100));
    const editar = (cuerpo, quien = 'secretaria') =>
      request(app)
        .patch(`/api/admin/multimedia/${creado.id}`)
        .set('Cookie', sesiones[quien])
        .send(cuerpo);

    const cambio = await editar({ textoAlternativo: '  Nuevo texto  ' });
    expect(cambio.status).toBe(200);
    expect(cambio.body.datos.textoAlternativo).toBe('Nuevo texto');
    expect(cambio.body.datos).toEqual({ ...creado, textoAlternativo: 'Nuevo texto' });

    expect((await editar({ textoAlternativo: null })).body.datos.textoAlternativo).toBeNull();
    expect((await editar({ textoAlternativo: '' })).body.datos.textoAlternativo).toBeNull();
  });

  it('rechaza otros campos, textos largos y cuerpos sin textoAlternativo', async () => {
    const creado = await subir('marketing', await jpeg(100, 100));
    const editar = (cuerpo) =>
      request(app)
        .patch(`/api/admin/multimedia/${creado.id}`)
        .set('Cookie', sesiones.marketing)
        .send(cuerpo);

    const otro = await editar({ textoAlternativo: 'x', url: 'https://malo.test/a.webp' });
    expect(otro.status).toBe(400);
    expect(otro.body.error.detalles).toEqual([{ campo: 'url', mensaje: 'Campo no permitido.' }]);

    expect((await editar({ textoAlternativo: 'a'.repeat(256) })).status).toBe(400);
    expect((await editar({})).status).toBe(400);
  });

  it('404 si no existe y 403 si es de otra sede', async () => {
    const ajeno = await subir('ajeno', PDF, {
      nombre: 'prueba-ajeno.pdf',
      tipo: 'application/pdf',
    });
    const patch = (id) =>
      request(app)
        .patch(`/api/admin/multimedia/${id}`)
        .set('Cookie', sesiones.marketing)
        .send({ textoAlternativo: 'x' });

    expect((await patch(2000000000)).status).toBe(404);
    expect((await patch(ajeno.id)).status).toBe(403);
  });
});

describe('DELETE /api/admin/multimedia/:id', () => {
  const borrar = (id, quien) =>
    request(app).delete(`/api/admin/multimedia/${id}`).set('Cookie', sesiones[quien]);
  const existe = async (id) =>
    (await consultar('SELECT 1 FROM archivo_multimedia WHERE id = $1', [id])).rowCount === 1;
  const borrados = () =>
    s3
      .commandCalls(DeleteObjectsCommand)
      .flatMap((llamada) => llamada.args[0].input.Delete.Objects.map((o) => o.Key));

  it('borra la fila y los objetos, variantes incluidas', async () => {
    const creado = await subir('marketing', await jpeg(1000, 500));

    const respuesta = await borrar(creado.id, 'marketing');

    expect(respuesta.status).toBe(204);
    expect(respuesta.body).toEqual({});
    expect(await existe(creado.id)).toBe(false);
    const base = claveDe(creado).replace('.webp', '');
    expect(borrados().sort()).toEqual([`${base}-480w.webp`, `${base}-960w.webp`, `${base}.webp`]);
  });

  it('borra un PDF con un solo objeto', async () => {
    const creado = await subir('marketing', PDF, { nombre: 'prueba.pdf', tipo: 'application/pdf' });

    expect((await borrar(creado.id, 'marketing')).status).toBe(204);
    expect(borrados()).toEqual([claveDe(creado)]);
  });

  it('un usuario solo borra lo que subió; el Administrador puede borrar todo', async () => {
    const delMarketing = await subir('marketing', await jpeg(100, 100));

    const denegado = await borrar(delMarketing.id, 'secretaria');
    expect(denegado.status).toBe(403);
    expect(denegado.body.error.mensaje).toBe('Solo puedes eliminar los archivos que tú subiste.');
    expect(await existe(delMarketing.id)).toBe(true);
    expect(s3.commandCalls(DeleteObjectsCommand)).toHaveLength(0);

    expect((await borrar(delMarketing.id, 'admin')).status).toBe(204);
  });

  it('403 si es de otra sede y 404 si no existe', async () => {
    const ajeno = await subir('ajeno', PDF, {
      nombre: 'prueba-ajeno.pdf',
      tipo: 'application/pdf',
    });

    expect((await borrar(ajeno.id, 'marketing')).status).toBe(403);
    expect((await borrar(2000000000, 'marketing')).status).toBe(404);
  });

  it.each([
    ['portadaPublicacion', 'Usado como portada de la publicación «prueba-pub».', 'prueba-pub'],
    ['imagenEvento', 'Usado como imagen del evento «prueba-evento».', 'prueba-evento'],
    ['imagenGrupo', 'Usado como imagen del grupo «prueba-grupo».', 'prueba-grupo'],
    ['archivoBoletin', 'Usado como archivo del boletín «prueba-boletin».', 'prueba-boletin'],
    [
      'contenidoPublicacion',
      'Usado dentro del contenido de la publicación «prueba-contenido».',
      'prueba-contenido',
    ],
    [
      'contenidoServicio',
      'Usado dentro del contenido del servicio «prueba-servicio».',
      'prueba-servicio',
    ],
  ])('en uso (%s): 409 con el detalle y no se borra nada', async (uso, mensaje, nombre) => {
    const creado = await subir('marketing', await jpeg(1000, 500));
    await usar[uso](creado, nombre);

    const respuesta = await borrar(creado.id, 'marketing');

    expect(respuesta.status).toBe(409);
    expect(respuesta.body.error).toEqual({
      codigo: 'CONFLICTO',
      mensaje: 'El archivo está en uso y no se puede eliminar.',
      detalles: [{ campo: 'id', mensaje }],
    });
    expect(await existe(creado.id)).toBe(true);
    expect(s3.commandCalls(DeleteObjectsCommand)).toHaveLength(0);

    const detalle = await request(app)
      .get(`/api/admin/multimedia/${creado.id}`)
      .set('Cookie', sesiones.marketing);
    expect(detalle.body.datos.enUso).toBe(true);
  });

  it('en uso como portada de una sede', async () => {
    const creado = await subir('ajeno', await jpeg(300, 200));
    await usar.portadaSede(creado);

    const respuesta = await borrar(creado.id, 'ajeno');

    expect(respuesta.status).toBe(409);
    expect(respuesta.body.error.detalles).toEqual([
      { campo: 'id', mensaje: `Usado como portada de la sede «${sedeAjena.nombre}».` },
    ]);
    await consultar('UPDATE sede SET url_imagen_portada = NULL WHERE id = $1', [sedeAjena.id]);
    expect((await borrar(creado.id, 'ajeno')).status).toBe(204);
  });

  it('se detecta el uso de una variante dentro del contenido por el uuid del archivo', async () => {
    const creado = await subir('marketing', await jpeg(1000, 500));
    await usar.contenidoPublicacion(creado, 'prueba-con-variante');
    expect(uuidDe(creado)).toHaveLength(36);

    expect((await borrar(creado.id, 'marketing')).status).toBe(409);
  });

  it('lista hasta 5 usos y resume el resto', async () => {
    const creado = await subir('marketing', await jpeg(300, 200));
    for (let i = 1; i <= 7; i += 1) await usar.portadaPublicacion(creado, `prueba-uso ${i}`);

    const respuesta = await borrar(creado.id, 'marketing');

    const { detalles } = respuesta.body.error;
    expect(detalles).toHaveLength(6);
    expect(detalles[5]).toEqual({ campo: 'id', mensaje: 'Y 2 usos más.' });
  });

  it('si el bucket falla: 503 y la fila sigue (se puede reintentar)', async () => {
    const creado = await subir('marketing', await jpeg(300, 200));
    s3.reset();
    s3.on(DeleteObjectsCommand).rejects(new Error('AccessDenied clave-de-acceso-de-prueba'));

    const respuesta = await borrar(creado.id, 'marketing');

    expect(respuesta.status).toBe(503);
    expect(respuesta.body.error.codigo).toBe('SERVICIO_NO_DISPONIBLE');
    expect(JSON.stringify(respuesta.body)).not.toMatch(/AccessDenied|clave-de-acceso/);
    expect(await existe(creado.id)).toBe(true);

    s3.reset();
    s3.on(DeleteObjectsCommand).resolves({});
    expect((await borrar(creado.id, 'marketing')).status).toBe(204);
  });

  it('un archivo del seed (sin objeto en el bucket) se borra sin tocar el bucket', async () => {
    const { rows } = await consultar(
      `INSERT INTO archivo_multimedia (sede_id, subido_por, nombre_original, url, tipo_mime, tamano_bytes, ancho_px, alto_px)
       VALUES (1, $1, 'prueba-seed', $2, 'image/webp', 1000, 2000, 1000) RETURNING id`,
      [usuarios.marketing.id, `/media/seed/prueba-${randomUUID()}.webp`],
    );

    expect((await borrar(rows[0].id, 'admin')).status).toBe(204);
    expect(s3.commandCalls(DeleteObjectsCommand)).toHaveLength(0);
  });
});
