// Pruebas de integración para página, galería y contacto de grupos pastorales (PAR-172, PAR-166.1).
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { cerrarPool, consultar } from '../../src/db/index.js';
import { cerrarRedis } from '../../src/db/redis.js';
import { limpiarContadoresDeIntentos } from '../apoyo/limite.js';
import { SEDE_PRINCIPAL, borrarUsuariosDePrueba, crearUsuarioDePrueba } from '../apoyo/usuarios.js';

const app = createApp();

const sesiones = {};
const usuarios = {};
const gruposCreados = [];
const archivosCreados = [];
let sedeAjena;
let sedePrincipalId;
let imagenPrincipalId;
let videoPrincipalId;
let pdfPrincipalId;
let imagenAjenaId;

const BLOQUE_IMAGEN = (url) => ({
  formato: 'blocknote',
  version: 1,
  bloques: [
    {
      id: 'b-1',
      type: 'paragraph',
      props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
      content: [{ type: 'text', text: 'Bienvenidos al grupo.', styles: {} }],
      children: [],
    },
    {
      id: 'b-2',
      type: 'image',
      props: {
        textAlignment: 'center',
        backgroundColor: 'default',
        name: 'foto',
        url,
        caption: 'Encuentro semanal',
        showPreview: true,
      },
      children: [],
    },
  ],
});

async function iniciarSesion(usuario) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ correo: usuario.correo, contrasena: usuario.contrasena });
  expect(res.status).toBe(200);
  return res.headers['set-cookie'][0].split(';')[0];
}

async function crearGrupo(quien, cuerpo) {
  const res = await request(app)
    .post('/api/admin/grupos-pastorales')
    .set('Cookie', sesiones[quien])
    .send(cuerpo);
  if (res.status === 201) gruposCreados.push(res.body.datos.id);
  return res;
}

beforeAll(async () => {
  await limpiarContadoresDeIntentos();
  const { rows: principalRows } = await consultar('SELECT id FROM sede WHERE slug = $1', [
    SEDE_PRINCIPAL,
  ]);
  sedePrincipalId = principalRows[0].id;

  const { rows: sedesRows } = await consultar(
    `INSERT INTO sede (tipo_sede_id, nombre, slug)
     VALUES ((SELECT id FROM tipo_sede ORDER BY id LIMIT 1), 'prueba-sede grupos-detalle', $1)
     RETURNING id, slug, nombre`,
    [`prueba-gd-${randomUUID()}`.slice(0, 40)],
  );
  sedeAjena = sedesRows[0];

  for (const [nombre, opts] of [
    ['secretaria', { rol: 'SECRETARIA' }],
    ['marketing', { rol: 'MARKETING' }],
    ['ajeno', { rol: 'SECRETARIA', sede: sedeAjena.slug }],
  ]) {
    usuarios[nombre] = await crearUsuarioDePrueba(opts);
    sesiones[nombre] = await iniciarSesion(usuarios[nombre]);
  }

  const uuidImg = randomUUID();
  const uuidVid = randomUUID();
  const { rows: mediaRows } = await consultar(
    `INSERT INTO archivo_multimedia
       (sede_id, subido_por, nombre_original, url, tipo_mime, tamano_bytes, ancho_px, alto_px, texto_alternativo)
     VALUES
       ($1, $2, 'grupo-foto.webp', $5, 'image/webp', 1200, 800, 600, 'Foto grupo detalle'),
       ($1, $2, 'grupo-video.mp4', $6, 'video/mp4', 4500, NULL, NULL, NULL),
       ($1, $2, 'grupo-doc.pdf', '/media/test/grupo-doc.pdf', 'application/pdf', 2000, NULL, NULL, NULL),
       ($3, $4, 'ajena-foto.webp', '/media/test/ajena-foto.webp', 'image/webp', 1200, 800, 600, 'Foto ajena')
     RETURNING id`,
    [
      sedePrincipalId,
      usuarios.secretaria.id,
      sedeAjena.id,
      usuarios.ajeno.id,
      `/media/test/${uuidImg}.webp`,
      `/media/test/${uuidVid}.mp4`,
    ],
  );
  imagenPrincipalId = mediaRows[0].id;
  videoPrincipalId = mediaRows[1].id;
  pdfPrincipalId = mediaRows[2].id;
  imagenAjenaId = mediaRows[3].id;
  archivosCreados.push(imagenPrincipalId, videoPrincipalId, pdfPrincipalId, imagenAjenaId);
});

afterAll(async () => {
  if (gruposCreados.length > 0) {
    await consultar(
      "DELETE FROM bitacora_cambio WHERE entidad = 'grupo_pastoral' AND entidad_id = ANY($1::text[])",
      [gruposCreados],
    );
    await consultar('DELETE FROM grupo_pastoral WHERE id = ANY($1)', [gruposCreados]);
  }
  if (archivosCreados.length > 0) {
    await consultar('DELETE FROM archivo_multimedia WHERE id = ANY($1)', [archivosCreados]);
  }
  await limpiarContadoresDeIntentos();
  await borrarUsuariosDePrueba();
  await consultar('DELETE FROM sede WHERE id = $1', [sedeAjena.id]);
  await cerrarPool();
  await cerrarRedis();
});

describe('Página, galería y contacto de grupos pastorales (PAR-172, PAR-166.1)', () => {
  it('genera slugs únicos cuando hay nombres repetidos y rechaza slug duplicado explícito (409)', async () => {
    const sufijo = randomUUID().slice(0, 6);
    const nombre = `Grupo Repetido ${sufijo}`;
    const g1 = await crearGrupo('secretaria', { nombre, visible: false });
    const g2 = await crearGrupo('secretaria', { nombre, visible: false });

    expect(g1.status).toBe(201);
    expect(g2.status).toBe(201);
    expect(g2.body.datos.slug).toBe(`${g1.body.datos.slug}-2`);

    const duplicado = await crearGrupo('secretaria', {
      nombre: `Otro ${sufijo}`,
      slug: g1.body.datos.slug,
      visible: false,
    });
    expect(duplicado.status).toBe(409);
  });

  it('valida WhatsApp, correo, archivos de otra sede/tipo y tope de 24 en galería', async () => {
    const invalidoContacto = await crearGrupo('secretaria', {
      nombre: `Grupo Inválido ${randomUUID().slice(0, 6)}`,
      whatsapp: 'abc-123',
      correo: 'no-es-correo',
    });
    expect(invalidoContacto.status).toBe(400);
    expect(invalidoContacto.body.error.detalles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ campo: 'whatsapp' }),
        expect.objectContaining({ campo: 'correo' }),
      ]),
    );

    const demasiados = await crearGrupo('secretaria', {
      nombre: `Grupo Lleno ${randomUUID().slice(0, 6)}`,
      detalle: { galeria: Array.from({ length: 25 }, () => imagenPrincipalId) },
    });
    expect(demasiados.status).toBe(400);

    const archivoAjeno = await crearGrupo('secretaria', {
      nombre: `Grupo Ajeno ${randomUUID().slice(0, 6)}`,
      detalle: { galeria: [imagenAjenaId, pdfPrincipalId] },
    });
    expect(archivoAjeno.status).toBe(400);
    expect(archivoAjeno.body.error.detalles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ campo: 'detalle.galeria.0' }),
        expect.objectContaining({ campo: 'detalle.galeria.1' }),
      ]),
    );
  });

  it('permite a Marketing editar solo /detalle (200) y bloquea CRUD completo (403) y sin sesión (401)', async () => {
    const creado = await crearGrupo('secretaria', {
      nombre: `Pastoral Prueba ${randomUUID().slice(0, 6)}`,
      visible: true,
    });
    expect(creado.status).toBe(201);
    const id = creado.body.datos.id;

    const sinSesion = await request(app)
      .patch(`/api/admin/grupos-pastorales/${id}/detalle`)
      .send({});
    expect(sinSesion.status).toBe(401);

    const marketingPatchGeneral = await request(app)
      .patch(`/api/admin/grupos-pastorales/${id}`)
      .set('Cookie', sesiones.marketing)
      .send({ nombre: 'No debería' });
    expect(marketingPatchGeneral.status).toBe(403);

    const marketingDelete = await request(app)
      .delete(`/api/admin/grupos-pastorales/${id}`)
      .set('Cookie', sesiones.marketing);
    expect(marketingDelete.status).toBe(403);

    const {
      rows: [img],
    } = await consultar('SELECT url FROM archivo_multimedia WHERE id = $1', [imagenPrincipalId]);

    const resDetalle = await request(app)
      .patch(`/api/admin/grupos-pastorales/${id}/detalle`)
      .set('Cookie', sesiones.marketing)
      .send({
        descripcion: 'Descripción de ejemplo para el grupo.',
        horarioReunion: 'Sábados · 17:00',
        responsable: 'María Pérez (de ejemplo)',
        whatsapp: '+591 71234567',
        correo: 'grupo@parroquia.test',
        imagenId: imagenPrincipalId,
        detalle: {
          contenido: BLOQUE_IMAGEN(img.url),
          galeria: [imagenPrincipalId, videoPrincipalId],
          videoYoutubeId: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        },
      });
    expect(resDetalle.status).toBe(200);
    expect(resDetalle.body.datos).toMatchObject({
      id,
      responsable: 'María Pérez (de ejemplo)',
      whatsapp: '+591 71234567',
      correo: 'grupo@parroquia.test',
      detalle: {
        galeria: [imagenPrincipalId, videoPrincipalId],
        videoYoutubeId: 'dQw4w9WgXcQ',
      },
    });

    // La biblioteca cuenta la galería y el contenido como en uso.
    const lib = await request(app)
      .get(`/api/admin/multimedia/${videoPrincipalId}`)
      .set('Cookie', sesiones.secretaria);
    expect(lib.status).toBe(200);
    expect(lib.body.datos.enUso).toBe(true);
  });

  it('sirve el detalle público, responde 404 para ocultos o de otra sede e invalida la caché al editar', async () => {
    const creado = await crearGrupo('secretaria', {
      nombre: `Grupo Público ${randomUUID().slice(0, 6)}`,
      responsable: 'Carlos López (de ejemplo)',
      whatsapp: '71234567',
      correo: '',
      imagenId: imagenPrincipalId,
      detalle: {
        galeria: [imagenPrincipalId, videoPrincipalId],
        videoYoutubeId: 'dQw4w9WgXcQ',
      },
      visible: true,
    });
    expect(creado.status).toBe(201);
    const { id, slug } = creado.body.datos;
    expect(creado.body.datos.correo).toBeNull();

    const listado = await request(app).get(
      `/api/sedes/${SEDE_PRINCIPAL}/grupos-pastorales?porPagina=100`,
    );
    expect(listado.status).toBe(200);
    const item = listado.body.datos.find((g) => g.id === id);
    expect(item).toMatchObject({ slug, tieneDetalle: true });

    const pub = await request(app).get(`/api/sedes/${SEDE_PRINCIPAL}/grupos-pastorales/${slug}`);
    expect(pub.status).toBe(200);
    expect(pub.body.datos.galeria).toHaveLength(2);
    expect(pub.body.datos.galeria[0]).toMatchObject({
      id: imagenPrincipalId,
      tipoMime: 'image/webp',
      variantes: expect.any(Array),
    });
    expect(pub.body.datos.galeria[1]).toMatchObject({
      id: videoPrincipalId,
      tipoMime: 'video/mp4',
    });

    const otraSede = await request(app).get(
      `/api/sedes/${sedeAjena.slug}/grupos-pastorales/${slug}`,
    );
    expect(otraSede.status).toBe(404);

    // Editar detalle invalida la caché del detalle público.
    const editado = await request(app)
      .patch(`/api/admin/grupos-pastorales/${id}/detalle`)
      .set('Cookie', sesiones.marketing)
      .send({ responsable: 'Ana Gómez (de ejemplo)' });
    expect(editado.status).toBe(200);

    const pubActualizado = await request(app).get(
      `/api/sedes/${SEDE_PRINCIPAL}/grupos-pastorales/${slug}`,
    );
    expect(pubActualizado.status).toBe(200);
    expect(pubActualizado.body.datos.responsable).toBe('Ana Gómez (de ejemplo)');

    // Ocultar el grupo devuelve 404 en el portal.
    const oculto = await request(app)
      .patch(`/api/admin/grupos-pastorales/${id}`)
      .set('Cookie', sesiones.secretaria)
      .send({ visible: false });
    expect(oculto.status).toBe(200);

    const pubOculto = await request(app).get(
      `/api/sedes/${SEDE_PRINCIPAL}/grupos-pastorales/${slug}`,
    );
    expect(pubOculto.status).toBe(404);
  });
});
