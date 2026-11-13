// POST /api/admin/multimedia contra la aplicación real y PostgreSQL, con el almacenamiento
// simulado (aws-sdk-client-mock): estas pruebas nunca llaman al OCI real.
import { readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DeleteObjectsCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import sharp from 'sharp';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { limpiarContadoresDeIntentos } from '../apoyo/limite.js';
import { SEDE_PRINCIPAL, borrarUsuariosDePrueba, crearUsuarioDePrueba } from '../apoyo/usuarios.js';

// Almacenamiento de mentira: se fija antes de cargar la aplicación (el entorno se lee una vez).
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

const DIRECTORIO_TEMPORAL = path.join(tmpdir(), 'parroquia-subidas');
const temporales = () => readdirSync(DIRECTORIO_TEMPORAL);

const jpeg = (ancho = 64, alto = 32, extra = {}) =>
  sharp({ create: { width: ancho, height: alto, channels: 3, background: '#a33' } })
    .jpeg(extra)
    .toBuffer();

// PDF mínimo (basta con su firma %PDF-).
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
// Cabecera de un MP4 (caja ftyp con la marca isom).
const MP4 = Buffer.concat([
  Buffer.from([0, 0, 0, 24]),
  Buffer.from('ftypisom'),
  Buffer.from([0, 0, 2, 0]),
  Buffer.from('isomiso2mp41'),
  Buffer.alloc(64),
]);

let cookieMarketing;
let cookieAdminSinSede;
let adminSinSede;
let marketing;

async function iniciarSesion(usuario) {
  const respuesta = await request(app)
    .post('/api/auth/login')
    .send({ correo: usuario.correo, contrasena: usuario.contrasena });
  return respuesta.headers['set-cookie'][0].split(';')[0];
}

const subir = (
  cookie,
  buffer,
  { nombre = 'prueba-foto.jpg', tipo = 'image/jpeg', campos = {} } = {},
) => {
  const peticion = request(app).post('/api/admin/multimedia').set('Cookie', cookie);
  for (const [campo, valor] of Object.entries(campos)) peticion.field(campo, valor);
  return peticion.attach('archivo', buffer, { filename: nombre, contentType: tipo });
};

const subidas = () => s3.commandCalls(PutObjectCommand);

beforeAll(async () => {
  await limpiarContadoresDeIntentos();
  marketing = await crearUsuarioDePrueba({ rol: 'MARKETING' });
  adminSinSede = await crearUsuarioDePrueba({ rol: 'ADMINISTRADOR', sede: null });
  cookieMarketing = await iniciarSesion(marketing);
  cookieAdminSinSede = await iniciarSesion(adminSinSede);
});

beforeEach(() => {
  s3.reset();
  s3.on(PutObjectCommand).resolves({});
});

afterAll(async () => {
  await consultar("DELETE FROM archivo_multimedia WHERE nombre_original LIKE 'prueba%'");
  await limpiarContadoresDeIntentos();
  await borrarUsuariosDePrueba();
  cerrarClienteS3();
  await cerrarPool();
  await cerrarRedis();
});

describe('subida de una imagen', () => {
  it('la guarda como WebP, la registra y responde 201 con Location', async () => {
    const antes = temporales().length;
    const respuesta = await subir(cookieMarketing, await jpeg(), {
      nombre: 'prueba-primeras comuniones ñandú.jpg',
      campos: { textoAlternativo: '  Niños frente al altar  ' },
    });

    expect(respuesta.status).toBe(201);
    const { datos } = respuesta.body;
    expect(respuesta.headers.location).toBe(`/api/admin/multimedia/${datos.id}`);
    expect(datos).toMatchObject({
      nombreOriginal: 'prueba-primeras comuniones ñandú.jpg',
      tipoMime: 'image/webp',
      ancho: 64,
      alto: 32,
      textoAlternativo: 'Niños frente al altar',
      sede: { slug: SEDE_PRINCIPAL },
      subidoPor: { id: marketing.id },
      enUso: false,
    });
    expect(datos.url).toMatch(
      new RegExp(
        `^https://cdn\\.ejemplo\\.test/sedes/${SEDE_PRINCIPAL}/\\d{4}/\\d{2}/[0-9a-f-]{36}\\.webp$`,
      ),
    );
    expect(datos.fechaSubida).toMatch(/-04:00$/);

    const { Key, ContentType, Bucket } = subidas()[0].args[0].input;
    expect(datos.url).toBe(`https://cdn.ejemplo.test/${Key}`);
    expect(ContentType).toBe('image/webp');
    expect(Bucket).toBe('bucket-de-prueba');
    expect(datos.tamanoBytes).toBe(subidas()[0].args[0].input.ContentLength);

    // El temporal se borró.
    expect(temporales().length).toBe(antes);
  });

  it('elimina los metadatos (EXIF) y aplica la orientación', async () => {
    const original = await sharp({
      create: { width: 80, height: 40, channels: 3, background: '#33a' },
    })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();
    expect(await sharp(original).metadata()).toMatchObject({ orientation: 6 });

    const respuesta = await subir(cookieMarketing, original);

    expect(respuesta.status).toBe(201);
    // Orientación 6: la imagen se gira 90° y el EXIF desaparece.
    expect(respuesta.body.datos).toMatchObject({ ancho: 40, alto: 80 });
    const guardada = await sharp(subidas()[0].args[0].input.Body).metadata();
    expect(guardada.exif).toBeUndefined();
    expect(guardada.format).toBe('webp');
  });

  it('reduce el lado largo a 2560 px sin deformarla y nunca la amplía', async () => {
    const grande = await subir(cookieMarketing, await jpeg(3000, 1000));
    expect(grande.body.datos).toMatchObject({ ancho: 2560, alto: 853 });

    const chica = await subir(cookieMarketing, await jpeg(300, 200));
    expect(chica.body.datos).toMatchObject({ ancho: 300, alto: 200 });
  });

  it('un PNG con transparencia la conserva', async () => {
    const png = await sharp({
      create: { width: 20, height: 20, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0.3 } },
    })
      .png()
      .toBuffer();

    const respuesta = await subir(cookieMarketing, png, {
      nombre: 'prueba.png',
      tipo: 'image/png',
    });

    expect(respuesta.status).toBe(201);
    expect((await sharp(subidas()[0].args[0].input.Body).metadata()).hasAlpha).toBe(true);
  });

  it('una imagen dañada es 415 y no sube nada', async () => {
    const dañada = (await jpeg(200, 200)).subarray(0, 300);

    const respuesta = await subir(cookieMarketing, dañada);

    expect(respuesta.status).toBe(415);
    expect(respuesta.body.error.mensaje).toBe('El archivo no es una imagen válida.');
    expect(subidas()).toHaveLength(0);
  });
});

describe('variantes de una imagen', () => {
  const subidasPorClave = () =>
    Object.fromEntries(subidas().map((c) => [c.args[0].input.Key, c.args[0].input]));

  it('genera solo las menores que el ancho guardado y las sube junto a la principal', async () => {
    const respuesta = await subir(cookieMarketing, await jpeg(1000, 500));

    expect(respuesta.status).toBe(201);
    const { url, variantes, ancho } = respuesta.body.datos;
    expect(ancho).toBe(1000);
    expect(variantes.map((v) => v.ancho)).toEqual([480, 960]);

    const base = url.replace(/\.webp$/, '');
    expect(variantes.map((v) => v.url)).toEqual([`${base}-480w.webp`, `${base}-960w.webp`]);

    const claves = subidasPorClave();
    expect(Object.keys(claves)).toHaveLength(3);
    for (const variante of variantes) {
      const objeto = claves[variante.url.replace('https://cdn.ejemplo.test/', '')];
      expect(objeto.ContentType).toBe('image/webp');
      expect((await sharp(objeto.Body).metadata()).width).toBe(variante.ancho);
    }
  });

  it('una imagen de 2560 px tiene las tres variantes', async () => {
    const respuesta = await subir(cookieMarketing, await jpeg(3000, 1000));

    expect(respuesta.body.datos.variantes.map((v) => v.ancho)).toEqual([480, 960, 1600]);
    expect(subidas()).toHaveLength(4);
  });

  it('una imagen chica no tiene variantes', async () => {
    const respuesta = await subir(cookieMarketing, await jpeg(400, 300));

    expect(respuesta.body.datos.variantes).toEqual([]);
    expect(subidas()).toHaveLength(1);
  });

  it('un PDF y un video tienen variantes vacías', async () => {
    const pdf = await subir(cookieMarketing, PDF, {
      nombre: 'prueba.pdf',
      tipo: 'application/pdf',
    });
    expect(pdf.body.datos.variantes).toEqual([]);
  });

  it('si falla una variante, se borra lo ya subido y no se registra nada', async () => {
    const { rows: previas } = await consultar('SELECT count(*)::int AS n FROM archivo_multimedia');
    let llamadas = 0;
    s3.reset();
    s3.on(DeleteObjectsCommand).resolves({});
    s3.on(PutObjectCommand).callsFake(() => {
      llamadas += 1;
      if (llamadas === 2) throw new Error('falló la segunda subida');
      return {};
    });

    const respuesta = await subir(cookieMarketing, await jpeg(1000, 500));

    expect(respuesta.status).toBe(503);
    const borrados = s3
      .commandCalls(DeleteObjectsCommand)
      .flatMap((c) => c.args[0].input.Delete.Objects);
    expect(borrados).toHaveLength(1);
    expect(borrados[0].Key).toBe(subidas()[0].args[0].input.Key);
    const { rows: posteriores } = await consultar(
      'SELECT count(*)::int AS n FROM archivo_multimedia',
    );
    expect(posteriores[0].n).toBe(previas[0].n);
  });
});

describe('tipo real y tamaño', () => {
  it.each([
    [
      'un texto que dice ser JPEG',
      Buffer.from('hola, esto no es una imagen'),
      'prueba.jpg',
      'image/jpeg',
    ],
    [
      'un SVG',
      Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),
      'prueba.svg',
      'image/svg+xml',
    ],
    [
      'un GIF',
      Buffer.from('GIF89a\u0001\u0000\u0001\u0000\u0000\u0000\u0000;', 'latin1'),
      'prueba.gif',
      'image/gif',
    ],
    [
      'un ejecutable que dice ser PDF',
      Buffer.from('MZ\u0090\u0000\u0003'.padEnd(64, '\0'), 'latin1'),
      'prueba.pdf',
      'application/pdf',
    ],
  ])('%s: 415', async (_descripcion, contenido, nombre, tipo) => {
    const respuesta = await subir(cookieMarketing, contenido, { nombre, tipo });

    expect(respuesta.status).toBe(415);
    expect(respuesta.body.error.codigo).toBe('TIPO_NO_PERMITIDO');
    expect(respuesta.body.error.mensaje).toMatch(/imágenes JPEG, PNG y WebP/);
    expect(subidas()).toHaveLength(0);
  });

  it('un PDF verdadero se acepta aunque se envíe como octet-stream, y se guarda tal cual', async () => {
    const respuesta = await subir(cookieMarketing, PDF, {
      nombre: 'prueba-boletin.pdf',
      tipo: 'application/octet-stream',
    });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.datos).toMatchObject({
      tipoMime: 'application/pdf',
      tamanoBytes: PDF.length,
      ancho: null,
      alto: null,
    });
    expect(respuesta.body.datos.url).toMatch(/\.pdf$/);
    expect(subidas()[0].args[0].input.ContentType).toBe('application/pdf');
  });

  it('un MP4 se acepta y se guarda sin procesar', async () => {
    const respuesta = await subir(cookieMarketing, MP4, {
      nombre: 'prueba-misa.mp4',
      tipo: 'video/mp4',
    });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.datos).toMatchObject({ tipoMime: 'video/mp4', ancho: null });
    expect(respuesta.body.datos.url).toMatch(/\.mp4$/);
  });

  it('una imagen de más de 30 MB es 413 con el mensaje de su clase', async () => {
    const pesada = Buffer.concat([await jpeg(), Buffer.alloc(31 * 1024 * 1024)]);

    const respuesta = await subir(cookieMarketing, pesada);

    expect(respuesta.status).toBe(413);
    expect(respuesta.body.error).toMatchObject({
      codigo: 'ARCHIVO_DEMASIADO_GRANDE',
      mensaje: 'Las imágenes pueden pesar hasta 30 MB.',
    });
    expect(subidas()).toHaveLength(0);
  });

  it('un PDF de más de 50 MB es 413', async () => {
    const pesado = Buffer.concat([PDF, Buffer.alloc(51 * 1024 * 1024)]);

    const respuesta = await subir(cookieMarketing, pesado, {
      nombre: 'prueba.pdf',
      tipo: 'application/pdf',
    });

    expect(respuesta.status).toBe(413);
    expect(respuesta.body.error.mensaje).toBe('Los documentos pueden pesar hasta 50 MB.');
  });

  it('con el almacenamiento casi lleno responde 409 y no sube nada', async () => {
    const { rows } = await consultar(
      `INSERT INTO archivo_multimedia (sede_id, subido_por, nombre_original, url, tipo_mime, tamano_bytes)
       VALUES (1, $1, 'prueba-capacidad', 'sedes/prueba/capacidad.mp4', 'video/mp4', $2)
       RETURNING id`,
      [marketing.id, 46 * 1024 ** 3],
    );

    try {
      const respuesta = await subir(cookieMarketing, PDF, {
        nombre: 'prueba.pdf',
        tipo: 'application/pdf',
      });

      expect(respuesta.status).toBe(409);
      expect(respuesta.body.error.mensaje).toBe('El almacenamiento está casi lleno.');
      expect(subidas()).toHaveLength(0);
    } finally {
      await consultar('DELETE FROM archivo_multimedia WHERE id = $1', [rows[0].id]);
    }
  });
});

describe('validación del formulario', () => {
  it('sin archivo: 400', async () => {
    const respuesta = await request(app)
      .post('/api/admin/multimedia')
      .set('Cookie', cookieMarketing)
      .field('textoAlternativo', 'x');

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.detalles).toEqual([
      { campo: 'archivo', mensaje: 'Falta el archivo.' },
    ]);
  });

  it('más de un archivo: 400', async () => {
    const respuesta = await request(app)
      .post('/api/admin/multimedia')
      .set('Cookie', cookieMarketing)
      .attach('archivo', PDF, 'prueba-1.pdf')
      .attach('archivo', PDF, 'prueba-2.pdf');

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.detalles).toEqual([
      { campo: 'archivo', mensaje: 'Envía un solo archivo.' },
    ]);
    expect(subidas()).toHaveLength(0);
  });

  it('un texto alternativo de más de 255 caracteres: 400', async () => {
    const respuesta = await subir(cookieMarketing, await jpeg(), {
      campos: { textoAlternativo: 'a'.repeat(256) },
    });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.detalles).toEqual([
      {
        campo: 'textoAlternativo',
        mensaje: 'El texto alternativo puede tener hasta 255 caracteres.',
      },
    ]);
  });

  it('una petición que no es multipart: 415', async () => {
    const respuesta = await request(app)
      .post('/api/admin/multimedia')
      .set('Cookie', cookieMarketing)
      .send({ archivo: 'x' });

    expect(respuesta.status).toBe(415);
    expect(respuesta.body.error.mensaje).toBe('La petición debe ser multipart/form-data.');
  });
});

describe('sede del archivo', () => {
  it('un usuario de sede usa la suya e ignora sedeId', async () => {
    const respuesta = await subir(cookieMarketing, await jpeg(), { campos: { sedeId: '999' } });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.datos.sede.slug).toBe(SEDE_PRINCIPAL);
  });

  it('el Administrador sin sede debe indicarla', async () => {
    const respuesta = await subir(cookieAdminSinSede, await jpeg());

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.detalles).toEqual([
      { campo: 'sedeId', mensaje: 'Indica la sede del archivo.' },
    ]);
  });

  it('el Administrador puede elegir cualquier sede activa', async () => {
    const { rows } = await consultar(
      'SELECT id, slug FROM sede WHERE activo AND slug <> $1 ORDER BY id LIMIT 1',
      [SEDE_PRINCIPAL],
    );
    if (rows.length === 0) return;

    const respuesta = await subir(cookieAdminSinSede, await jpeg(), {
      campos: { sedeId: String(rows[0].id) },
    });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.datos.sede.slug).toBe(rows[0].slug);
    expect(subidas()[0].args[0].input.Key).toMatch(new RegExp(`^sedes/${rows[0].slug}/`));
  });

  it('una sede que no existe: 400', async () => {
    const respuesta = await subir(cookieAdminSinSede, await jpeg(), {
      campos: { sedeId: '99999' },
    });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.detalles).toEqual([
      { campo: 'sedeId', mensaje: 'La sede no existe o está inactiva.' },
    ]);
  });
});

describe('sesión y fallos del almacenamiento', () => {
  it('sin sesión: 401', async () => {
    const respuesta = await request(app)
      .post('/api/admin/multimedia')
      .attach('archivo', PDF, 'prueba.pdf');

    expect(respuesta.status).toBe(401);
  });

  it('si el bucket falla: 503, no se registra nada y no queda el temporal', async () => {
    const antes = temporales().length;
    const { rows: previas } = await consultar('SELECT count(*)::int AS n FROM archivo_multimedia');
    s3.reset();
    s3.on(PutObjectCommand).rejects(new Error('AccessDenied clave-de-acceso-de-prueba'));

    const respuesta = await subir(cookieMarketing, await jpeg());

    expect(respuesta.status).toBe(503);
    expect(respuesta.body.error.codigo).toBe('SERVICIO_NO_DISPONIBLE');
    expect(JSON.stringify(respuesta.body)).not.toMatch(/AccessDenied|clave-de-acceso/);
    const { rows: posteriores } = await consultar(
      'SELECT count(*)::int AS n FROM archivo_multimedia',
    );
    expect(posteriores[0].n).toBe(previas[0].n);
    expect(temporales().length).toBe(antes);
  });
});
