// Gestión de grupos pastorales y videos en el panel CMS (/api/admin/grupos-pastorales y /videos).
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
const videosCreados = [];
const archivosCreados = [];
let sedeAjena;
let sedePrincipalId;
let imagenPrincipalId;
let pdfPrincipalId;
let imagenAjenaId;

async function iniciarSesion(usuario) {
  const respuesta = await request(app)
    .post('/api/auth/login')
    .send({ correo: usuario.correo, contrasena: usuario.contrasena });
  expect(respuesta.status).toBe(200);
  return respuesta.headers['set-cookie'][0].split(';')[0];
}

async function crearGrupoApi(quien, cuerpo) {
  const res = await request(app)
    .post('/api/admin/grupos-pastorales')
    .set('Cookie', sesiones[quien])
    .send(cuerpo);
  if (res.status === 201) gruposCreados.push(res.body.datos.id);
  return res;
}

async function crearVideoApi(quien, cuerpo) {
  const res = await request(app)
    .post('/api/admin/videos')
    .set('Cookie', sesiones[quien])
    .send(cuerpo);
  if (res.status === 201) videosCreados.push(res.body.datos.id);
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
     VALUES ((SELECT id FROM tipo_sede ORDER BY id LIMIT 1), 'prueba-sede grupos-videos', $1)
     RETURNING id, slug, nombre`,
    [`prueba-${randomUUID()}`.slice(0, 40)],
  );
  sedeAjena = sedesRows[0];

  for (const [nombre, opts] of [
    ['admin', { rol: 'ADMINISTRADOR', sede: null }],
    ['parroco', { rol: 'PARROCO' }],
    ['secretaria', { rol: 'SECRETARIA' }],
    ['marketing', { rol: 'MARKETING' }],
    ['ajeno', { rol: 'SECRETARIA', sede: sedeAjena.slug }],
  ]) {
    usuarios[nombre] = await crearUsuarioDePrueba(opts);
    sesiones[nombre] = await iniciarSesion(usuarios[nombre]);
  }

  const { rows: mediaRows } = await consultar(
    `INSERT INTO archivo_multimedia
       (sede_id, subido_por, nombre_original, url, tipo_mime, tamano_bytes, ancho_px, alto_px, texto_alternativo)
     VALUES
       ($1, $2, 'grupo.webp', '/media/test/grupo.webp', 'image/webp', 1200, 800, 600, 'Foto grupo'),
       ($1, $2, 'doc.pdf', '/media/test/doc.pdf', 'application/pdf', 2000, NULL, NULL, NULL),
       ($3, $4, 'ajena.webp', '/media/test/ajena.webp', 'image/webp', 1200, 800, 600, 'Foto ajena')
     RETURNING id`,
    [sedePrincipalId, usuarios.secretaria.id, sedeAjena.id, usuarios.ajeno.id],
  );
  imagenPrincipalId = mediaRows[0].id;
  pdfPrincipalId = mediaRows[1].id;
  imagenAjenaId = mediaRows[2].id;
  archivosCreados.push(imagenPrincipalId, pdfPrincipalId, imagenAjenaId);
});

afterAll(async () => {
  if (gruposCreados.length > 0) {
    await consultar(
      "DELETE FROM bitacora_cambio WHERE entidad = 'grupo_pastoral' AND entidad_id = ANY($1::text[])",
      [gruposCreados],
    );
    await consultar('DELETE FROM grupo_pastoral WHERE id = ANY($1)', [gruposCreados]);
  }
  if (videosCreados.length > 0) {
    await consultar(
      "DELETE FROM bitacora_cambio WHERE entidad = 'video' AND entidad_id = ANY($1::text[])",
      [videosCreados],
    );
    await consultar('DELETE FROM video WHERE id = ANY($1)', [videosCreados]);
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

describe('Grupos pastorales (/api/admin/grupos-pastorales)', () => {
  it('sin sesión responde 401 y con sesión lista sin paginar con el formato del contrato', async () => {
    const sinSesion = await request(app).get('/api/admin/grupos-pastorales');
    expect(sinSesion.status).toBe(401);

    const res = await request(app)
      .get('/api/admin/grupos-pastorales')
      .set('Cookie', sesiones.marketing);
    expect(res.status).toBe(200);
    expect(res.body.paginacion).toBeUndefined();
    expect(res.body.datos.length).toBeGreaterThanOrEqual(6);
    expect(res.body.datos[0]).toEqual({
      id: expect.any(Number),
      sede: {
        id: sedePrincipalId,
        nombre: expect.any(String),
        slug: SEDE_PRINCIPAL,
      },
      nombre: 'Monaguillos',
      descripcion: null,
      horarioReunion: 'Sábados · 10:00',
      contacto: null,
      icono: 'star',
      imagen: null,
      orden: 1,
      visible: true,
    });
  });

  it('prohíbe crear a Marketing (403) y valida sedeId e imagenId de la misma sede', async () => {
    const marketing = await crearGrupoApi('marketing', { nombre: 'Bloqueado' });
    expect(marketing.status).toBe(403);

    const sinSede = await crearGrupoApi('admin', { nombre: 'Sin sede' });
    expect(sinSede.status).toBe(400);

    const imagenOtraSede = await crearGrupoApi('secretaria', {
      nombre: 'Imagen ajena',
      imagenId: imagenAjenaId,
    });
    expect(imagenOtraSede.status).toBe(400);
    expect(imagenOtraSede.body.error.detalles).toContainEqual(
      expect.objectContaining({ campo: 'imagenId' }),
    );

    const archivoNoImagen = await crearGrupoApi('secretaria', {
      nombre: 'Archivo PDF',
      imagenId: pdfPrincipalId,
    });
    expect(archivoNoImagen.status).toBe(400);
    expect(archivoNoImagen.body.error.detalles).toContainEqual(
      expect.objectContaining({ campo: 'imagenId' }),
    );
  });

  it('crea con imagen, consulta detalle, edita, reordena y elimina registrando en bitácora', async () => {
    const g1 = await crearGrupoApi('ajeno', {
      nombre: 'Coro Juvenil Capilla',
      descripcion: 'Ensayos semanales.',
      horarioReunion: 'Sábados · 16:00',
      contacto: 'Coordinación coro',
      icono: 'music-2',
      imagenId: imagenAjenaId,
      visible: true,
    });
    const g2 = await crearGrupoApi('ajeno', {
      nombre: 'Grupo Misionero Capilla',
      visible: false,
    });
    expect(g1.status).toBe(201);
    expect(g1.headers.location).toBe(`/api/admin/grupos-pastorales/${g1.body.datos.id}`);
    expect(g1.body.datos.imagen).toMatchObject({
      id: imagenAjenaId,
      url: '/media/test/ajena.webp',
      textoAlternativo: 'Foto ajena',
      ancho: 800,
      alto: 600,
      variantes: expect.any(Array),
    });

    const otroRolDetalle = await request(app)
      .get(`/api/admin/grupos-pastorales/${g1.body.datos.id}`)
      .set('Cookie', sesiones.secretaria);
    expect(otroRolDetalle.status).toBe(403);

    const editado = await request(app)
      .patch(`/api/admin/grupos-pastorales/${g1.body.datos.id}`)
      .set('Cookie', sesiones.ajeno)
      .send({ imagenId: null, descripcion: '' });
    expect(editado.status).toBe(200);
    expect(editado.body.datos.imagen).toBeNull();
    expect(editado.body.datos.descripcion).toBeNull();

    const reorden = await request(app)
      .post('/api/admin/grupos-pastorales/reordenar')
      .set('Cookie', sesiones.ajeno)
      .send({ ids: [g2.body.datos.id, g1.body.datos.id] });
    expect(reorden.status).toBe(200);
    expect(reorden.body.datos.map((g) => g.id)).toEqual([g2.body.datos.id, g1.body.datos.id]);
    expect(reorden.body.datos.map((g) => g.orden)).toEqual([1, 2]);

    const eliminado = await request(app)
      .delete(`/api/admin/grupos-pastorales/${g2.body.datos.id}`)
      .set('Cookie', sesiones.ajeno);
    expect(eliminado.status).toBe(204);

    const { rows: bitacora } = await consultar(
      "SELECT accion FROM bitacora_cambio WHERE entidad = 'grupo_pastoral' AND entidad_id = $1 ORDER BY id",
      [String(g2.body.datos.id)],
    );
    expect(bitacora.map((b) => b.accion)).toEqual(['INSERT', 'UPDATE', 'DELETE']);
  });
});

describe('Videos (/api/admin/videos)', () => {
  it('acepta formatos de YouTube, rechaza URLs inválidas y detecta duplicado global (409)', async () => {
    const invalido = await crearVideoApi('marketing', {
      youtube: 'https://vimeo.com/123456',
      titulo: 'No es YouTube',
    });
    expect(invalido.status).toBe(400);
    expect(invalido.body.error.detalles).toContainEqual(
      expect.objectContaining({ campo: 'youtube' }),
    );

    const v1 = await crearVideoApi('marketing', {
      youtube: 'https://www.youtube.com/watch?v=pX7aQm3kR2c',
      titulo: 'Recorrido parroquial',
      descripcion: 'Video institucional.',
      duracionSegundos: 45,
      destacado: true,
      fechaPublicacion: '2026-10-15',
    });
    expect(v1.status).toBe(201);
    expect(v1.headers.location).toBe(`/api/admin/videos/${v1.body.datos.id}`);
    expect(v1.body.datos).toMatchObject({
      sede: { id: sedePrincipalId, slug: SEDE_PRINCIPAL },
      youtubeVideoId: 'pX7aQm3kR2c',
      urlVideo: 'https://www.youtube.com/watch?v=pX7aQm3kR2c',
      urlInsercion: 'https://www.youtube-nocookie.com/embed/pX7aQm3kR2c',
      urlMiniatura: 'https://i.ytimg.com/vi/pX7aQm3kR2c/hqdefault.jpg',
      duracionSegundos: 45,
      destacado: true,
      fechaPublicacion: '2026-10-15',
    });

    const duplicadoEnOtraSede = await crearVideoApi('ajeno', {
      youtube: 'https://youtu.be/pX7aQm3kR2c',
      titulo: 'Repetido en otra sede',
    });
    expect(duplicadoEnOtraSede.status).toBe(409);
    expect(duplicadoEnOtraSede.body.error.codigo).toBe('CONFLICTO');
  });

  it('permite listar con filtro destacado, editar, reordenar y eliminar en su sede', async () => {
    const v1 = await crearVideoApi('ajeno', {
      youtube: 'https://www.youtube.com/shorts/dQw4w9WgXcQ',
      titulo: 'Video Short Capilla',
      destacado: false,
    });
    const v2 = await crearVideoApi('ajeno', {
      youtube: 'https://www.youtube-nocookie.com/embed/9bZkp7q19f0',
      titulo: 'Video Embed Capilla',
      destacado: true,
    });
    expect(v1.status).toBe(201);
    expect(v2.status).toBe(201);

    const soloDestacados = await request(app)
      .get('/api/admin/videos?destacado=true')
      .set('Cookie', sesiones.ajeno);
    expect(soloDestacados.status).toBe(200);
    expect(soloDestacados.body.datos.map((v) => v.id)).toEqual([v2.body.datos.id]);

    const editado = await request(app)
      .patch(`/api/admin/videos/${v1.body.datos.id}`)
      .set('Cookie', sesiones.ajeno)
      .send({ titulo: 'Video Short Actualizado', destacado: true });
    expect(editado.status).toBe(200);
    expect(editado.body.datos.destacado).toBe(true);

    const reorden = await request(app)
      .post('/api/admin/videos/reordenar')
      .set('Cookie', sesiones.ajeno)
      .send({ ids: [v2.body.datos.id, v1.body.datos.id] });
    expect(reorden.status).toBe(200);
    expect(reorden.body.datos.map((v) => v.id)).toEqual([v2.body.datos.id, v1.body.datos.id]);

    const otraSede = await request(app)
      .delete(`/api/admin/videos/${v1.body.datos.id}`)
      .set('Cookie', sesiones.marketing);
    expect(otraSede.status).toBe(403);

    const borrado = await request(app)
      .delete(`/api/admin/videos/${v1.body.datos.id}`)
      .set('Cookie', sesiones.ajeno);
    expect(borrado.status).toBe(204);
  });
});
