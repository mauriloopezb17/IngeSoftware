// Pruebas de integración del rol Coordinador de grupo y su alcance por grupo (PAR-173.1 a 173.3).
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
const { cerrarPool, consultar } = await import('../../src/db/index.js');
const { cerrarRedis } = await import('../../src/db/redis.js');
const { cerrarClienteS3 } = await import('../../src/storage/oci.js');

const app = createApp();
const s3 = mockClient(S3Client);

let sedePrincipalId;
let sedeAjena;
let admin;
let secretaria;
let cookieAdmin;
let cookieSecretaria;
let grupoAsignado;
let grupoAjenoMismaSede;
let grupoOtraSede;
let archivoAjenoId;

const gruposCreados = [];
const usuariosApiCreados = [];
const archivosCreados = [];
const publicacionesCreadas = [];

async function iniciarSesion(correo, contrasena) {
  const res = await request(app).post('/api/auth/login').send({ correo, contrasena });
  expect(res.status).toBe(200);
  return { cookie: res.headers['set-cookie'][0].split(';')[0], cuerpo: res.body };
}

beforeAll(async () => {
  await limpiarContadoresDeIntentos();
  const { rows: principalRows } = await consultar('SELECT id FROM sede WHERE slug = $1', [
    SEDE_PRINCIPAL,
  ]);
  sedePrincipalId = principalRows[0].id;

  const { rows: sedesRows } = await consultar(
    `INSERT INTO sede (tipo_sede_id, nombre, slug)
     VALUES ((SELECT id FROM tipo_sede ORDER BY id LIMIT 1), 'prueba-sede coord', $1)
     RETURNING id, slug, nombre`,
    [`prueba-coord-${randomUUID()}`.slice(0, 40)],
  );
  sedeAjena = sedesRows[0];

  admin = await crearUsuarioDePrueba({ rol: 'ADMINISTRADOR', sede: null });
  secretaria = await crearUsuarioDePrueba({ rol: 'SECRETARIA' });
  const ajeno = await crearUsuarioDePrueba({ rol: 'SECRETARIA', sede: sedeAjena.slug });
  cookieAdmin = (await iniciarSesion(admin.correo, admin.contrasena)).cookie;
  cookieSecretaria = (await iniciarSesion(secretaria.correo, secretaria.contrasena)).cookie;
  const cookieAjeno = (await iniciarSesion(ajeno.correo, ajeno.contrasena)).cookie;

  const prefijo = randomUUID().slice(0, 6);
  const g1 = await request(app)
    .post('/api/admin/grupos-pastorales')
    .set('Cookie', cookieSecretaria)
    .send({ nombre: `Coord Asignado ${prefijo}`, visible: true });
  const g2 = await request(app)
    .post('/api/admin/grupos-pastorales')
    .set('Cookie', cookieSecretaria)
    .send({ nombre: `Coord Otro ${prefijo}`, visible: true });
  const g3 = await request(app)
    .post('/api/admin/grupos-pastorales')
    .set('Cookie', cookieAjeno)
    .send({ nombre: `Coord Ajeno ${prefijo}`, visible: true });

  grupoAsignado = g1.body.datos;
  grupoAjenoMismaSede = g2.body.datos;
  grupoOtraSede = g3.body.datos;
  gruposCreados.push(grupoAsignado.id, grupoAjenoMismaSede.id, grupoOtraSede.id);

  const { rows: mediaRows } = await consultar(
    `INSERT INTO archivo_multimedia
       (sede_id, subido_por, nombre_original, url, tipo_mime, tamano_bytes, ancho_px, alto_px, texto_alternativo)
     VALUES ($1, $2, 'ajeno-coord.webp', '/media/test/ajeno-coord.webp', 'image/webp', 1200, 100, 100, 'Foto ajena')
     RETURNING id`,
    [sedePrincipalId, secretaria.id],
  );
  archivoAjenoId = mediaRows[0].id;
  archivosCreados.push(archivoAjenoId);
});

beforeEach(() => {
  s3.reset();
  s3.on(PutObjectCommand).resolves({});
  s3.on(DeleteObjectsCommand).resolves({ Deleted: [] });
});

afterAll(async () => {
  if (publicacionesCreadas.length > 0) {
    await consultar(
      "DELETE FROM bitacora_cambio WHERE entidad = 'publicacion' AND entidad_id = ANY($1::text[])",
      [publicacionesCreadas],
    );
    await consultar('DELETE FROM publicacion WHERE id = ANY($1)', [publicacionesCreadas]);
  }
  if (gruposCreados.length > 0) {
    await consultar(
      "DELETE FROM bitacora_cambio WHERE entidad = 'grupo_pastoral' AND entidad_id = ANY($1::text[])",
      [gruposCreados],
    );
    await consultar('DELETE FROM grupo_pastoral WHERE id = ANY($1)', [gruposCreados]);
  }
  if (archivosCreados.length > 0) {
    await consultar(
      "DELETE FROM bitacora_cambio WHERE entidad = 'archivo_multimedia' AND entidad_id = ANY($1::text[])",
      [archivosCreados],
    );
    await consultar('DELETE FROM archivo_multimedia WHERE id = ANY($1)', [archivosCreados]);
  }
  if (usuariosApiCreados.length > 0) {
    await consultar(
      "DELETE FROM bitacora_cambio WHERE entidad = 'usuario' AND entidad_id = ANY($1::text[])",
      [usuariosApiCreados],
    );
    await consultar('DELETE FROM bitacora_cambio WHERE usuario_id = ANY($1)', [usuariosApiCreados]);
    await consultar('DELETE FROM usuario WHERE id = ANY($1)', [usuariosApiCreados]);
  }
  await limpiarContadoresDeIntentos();
  await borrarUsuariosDePrueba();
  await consultar('DELETE FROM sede WHERE id = $1', [sedeAjena.id]);
  cerrarClienteS3();
  await cerrarPool();
  await cerrarRedis();
});

describe('Coordinador de grupo (PAR-173)', () => {
  let cookieCoord;
  let coordId;

  it('valida grupoIds al crear usuarios y asigna los grupos al coordinador', async () => {
    const sinGrupos = await request(app)
      .post('/api/admin/usuarios')
      .set('Cookie', cookieAdmin)
      .send({
        nombreCompleto: 'Coord Sin Grupos',
        correo: `coord-sin-${randomUUID().slice(0, 6)}@parroquia.test`,
        rol: 'COORDINADOR',
        sedeId: sedePrincipalId,
        contrasena: 'Clave-Segura-2026',
      });
    expect(sinGrupos.status).toBe(400);
    expect(sinGrupos.body.error.detalles).toContainEqual(
      expect.objectContaining({ campo: 'grupoIds' }),
    );

    const grupoOtraSedeRes = await request(app)
      .post('/api/admin/usuarios')
      .set('Cookie', cookieAdmin)
      .send({
        nombreCompleto: 'Coord Sede Cruzada',
        correo: `coord-cruz-${randomUUID().slice(0, 6)}@parroquia.test`,
        rol: 'COORDINADOR',
        sedeId: sedePrincipalId,
        contrasena: 'Clave-Segura-2026',
        grupoIds: [grupoOtraSede.id],
      });
    expect(grupoOtraSedeRes.status).toBe(400);

    const rolNoCoord = await request(app)
      .post('/api/admin/usuarios')
      .set('Cookie', cookieAdmin)
      .send({
        nombreCompleto: 'Sec Con Grupos',
        correo: `sec-g-${randomUUID().slice(0, 6)}@parroquia.test`,
        rol: 'SECRETARIA',
        sedeId: sedePrincipalId,
        contrasena: 'Clave-Segura-2026',
        grupoIds: [grupoAsignado.id],
      });
    expect(rolNoCoord.status).toBe(400);

    const correo = `coord-${randomUUID().slice(0, 6)}@parroquia.test`;
    const creado = await request(app)
      .post('/api/admin/usuarios')
      .set('Cookie', cookieAdmin)
      .send({
        nombreCompleto: 'Coordinador Prueba',
        correo,
        rol: 'COORDINADOR',
        sedeId: sedePrincipalId,
        contrasena: 'Clave-Segura-2026',
        grupoIds: [grupoAsignado.id],
      });
    expect(creado.status).toBe(201);
    coordId = creado.body.datos.id;
    usuariosApiCreados.push(coordId);
    expect(creado.body.datos.gruposAsignados).toEqual([
      { id: grupoAsignado.id, nombre: grupoAsignado.nombre, slug: grupoAsignado.slug },
    ]);

    const sesion = await iniciarSesion(correo, 'Clave-Segura-2026');
    cookieCoord = sesion.cookie;
    expect(sesion.cuerpo.datos.gruposAsignados).toEqual([
      { id: grupoAsignado.id, nombre: grupoAsignado.nombre, slug: grupoAsignado.slug },
    ]);

    const yo = await request(app).get('/api/auth/yo').set('Cookie', cookieCoord);
    expect(yo.status).toBe(200);
    expect(yo.body.datos.gruposAsignados).toEqual([
      { id: grupoAsignado.id, nombre: grupoAsignado.nombre, slug: grupoAsignado.slug },
    ]);
  });

  it('lista y edita solo su grupo asignado, y bloquea otros grupos o CRUD completo (403)', async () => {
    const lista = await request(app).get('/api/admin/grupos-pastorales').set('Cookie', cookieCoord);
    expect(lista.status).toBe(200);
    expect(lista.body.datos.map((g) => g.id)).toEqual([grupoAsignado.id]);

    const editarSuyo = await request(app)
      .patch(`/api/admin/grupos-pastorales/${grupoAsignado.id}/detalle`)
      .set('Cookie', cookieCoord)
      .send({ responsable: 'Responsable Coord', whatsapp: '71234567' });
    expect(editarSuyo.status).toBe(200);
    expect(editarSuyo.body.datos.responsable).toBe('Responsable Coord');

    const verOtroMismaSede = await request(app)
      .get(`/api/admin/grupos-pastorales/${grupoAjenoMismaSede.id}`)
      .set('Cookie', cookieCoord);
    expect(verOtroMismaSede.status).toBe(403);
    expect(verOtroMismaSede.body.error.mensaje).toBe(
      'Solo puedes ver y editar los grupos pastorales que tienes asignados.',
    );

    const editarOtroMismaSede = await request(app)
      .patch(`/api/admin/grupos-pastorales/${grupoAjenoMismaSede.id}/detalle`)
      .set('Cookie', cookieCoord)
      .send({ responsable: 'No debería' });
    expect(editarOtroMismaSede.status).toBe(403);

    const editarOtraSede = await request(app)
      .patch(`/api/admin/grupos-pastorales/${grupoOtraSede.id}/detalle`)
      .set('Cookie', cookieCoord)
      .send({ responsable: 'No debería' });
    expect(editarOtraSede.status).toBe(403);

    const crearGrupo = await request(app)
      .post('/api/admin/grupos-pastorales')
      .set('Cookie', cookieCoord)
      .send({ nombre: 'No debería' });
    expect(crearGrupo.status).toBe(403);

    const editarGeneral = await request(app)
      .patch(`/api/admin/grupos-pastorales/${grupoAsignado.id}`)
      .set('Cookie', cookieCoord)
      .send({ nombre: 'No debería' });
    expect(editarGeneral.status).toBe(403);

    const borrarGrupo = await request(app)
      .delete(`/api/admin/grupos-pastorales/${grupoAsignado.id}`)
      .set('Cookie', cookieCoord);
    expect(borrarGrupo.status).toBe(403);
  });

  it.each([
    ['eventos (listar)', 'get', '/api/admin/eventos', undefined],
    ['eventos (detalle)', 'get', '/api/admin/eventos/1', undefined],
    ['proclamas (listar)', 'get', '/api/admin/proclamas', undefined],
    ['proclamas (detalle)', 'get', '/api/admin/proclamas/1', undefined],
    ['horarios (listar)', 'get', '/api/admin/horarios', undefined],
    ['horarios (detalle)', 'get', '/api/admin/horarios/1', undefined],
    ['servicios (listar)', 'get', '/api/admin/servicios', undefined],
    ['servicios (detalle)', 'get', '/api/admin/servicios/1', undefined],
    ['páginas (listar)', 'get', '/api/admin/paginas', undefined],
    ['páginas (detalle)', 'get', '/api/admin/paginas/1', undefined],
    ['sedes (listar)', 'get', '/api/admin/sedes', undefined],
    ['sedes (detalle)', 'get', '/api/admin/sedes/1', undefined],
    ['boletines (listar)', 'get', '/api/admin/boletines', undefined],
    ['boletines (detalle)', 'get', '/api/admin/boletines/1', undefined],
    ['videos (listar)', 'get', '/api/admin/videos', undefined],
    ['videos (detalle)', 'get', '/api/admin/videos/1', undefined],
    ['noticias', 'post', '/api/admin/publicaciones/1/aprobar', undefined],
    ['eventos', 'post', '/api/admin/eventos', {}],
    ['horarios', 'post', '/api/admin/horarios', {}],
    ['servicios', 'post', '/api/admin/servicios', {}],
    ['proclamas', 'post', '/api/admin/proclamas', {}],
    ['observaciones', 'get', '/api/admin/proclamas/observaciones', undefined],
    ['boletines', 'post', '/api/admin/boletines', {}],
    ['páginas', 'post', '/api/admin/paginas', {}],
    ['sedes', 'post', '/api/admin/sedes', {}],
    ['usuarios (listar)', 'get', '/api/admin/usuarios', undefined],
    ['usuarios (crear)', 'post', '/api/admin/usuarios', {}],
    ['bitácora', 'get', '/api/admin/bitacora', undefined],
    ['exportar publicaciones', 'get', '/api/admin/publicaciones/exportar', undefined],
    ['exportar grupos', 'get', '/api/admin/grupos-pastorales/exportar', undefined],
    ['exportar eventos', 'get', '/api/admin/eventos/exportar', undefined],
  ])('responde 403 en %s', async (_nombre, metodo, ruta, cuerpo) => {
    let req = request(app)[metodo](ruta).set('Cookie', cookieCoord);
    if (cuerpo !== undefined) req = req.send(cuerpo);
    const res = await req;
    expect(res.status).toBe(403);
  });

  it('sube a la biblioteca (201) y solo puede borrar lo que subió', async () => {
    const borraAjeno = await request(app)
      .delete(`/api/admin/multimedia/${archivoAjenoId}`)
      .set('Cookie', cookieCoord);
    expect(borraAjeno.status).toBe(403);

    const png = await sharp({
      create: { width: 10, height: 10, channels: 3, background: '#a33' },
    })
      .png()
      .toBuffer();

    const subida = await request(app)
      .post('/api/admin/multimedia')
      .set('Cookie', cookieCoord)
      .field('textoAlternativo', 'Foto de ejemplo subida por coordinador')
      .attach('archivo', png, { filename: 'coord.png', contentType: 'image/png' });
    expect(subida.status).toBe(201);
    const idSubido = subida.body.datos.id;
    archivosCreados.push(idSubido);

    const borraPropio = await request(app)
      .delete(`/api/admin/multimedia/${idSubido}`)
      .set('Cookie', cookieCoord);
    expect(borraPropio.status).toBe(204);
  });

  it('redacta noticias solo de sus grupos, las envía a revisión y no ve avisos ni noticias ajenas', async () => {
    const contenido = {
      formato: 'blocknote',
      version: 1,
      bloques: [
        {
          id: 'p1',
          type: 'paragraph',
          props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
          content: [{ type: 'text', text: 'Texto de ejemplo de noticia', styles: {} }],
          children: [],
        },
      ],
    };

    const avisoAdmin = await request(app)
      .post('/api/admin/publicaciones')
      .set('Cookie', cookieSecretaria)
      .send({ tipo: 'AVISO', titulo: 'Aviso ajeno para probar alcance', contenido });
    expect(avisoAdmin.status).toBe(201);
    publicacionesCreadas.push(avisoAdmin.body.datos.id);

    const noticiaSinGrupo = await request(app)
      .post('/api/admin/publicaciones')
      .set('Cookie', cookieAdmin)
      .send({
        sedeId: sedePrincipalId,
        tipo: 'NOTICIA',
        titulo: 'Noticia general sin grupo',
        contenido,
      });
    expect(noticiaSinGrupo.status).toBe(201);
    publicacionesCreadas.push(noticiaSinGrupo.body.datos.id);

    const noticiaOtroGrupo = await request(app)
      .post('/api/admin/publicaciones')
      .set('Cookie', cookieAdmin)
      .send({
        sedeId: sedePrincipalId,
        tipo: 'NOTICIA',
        titulo: 'Noticia de otro grupo',
        contenido,
        grupoIds: [grupoAjenoMismaSede.id],
      });
    expect(noticiaOtroGrupo.status).toBe(201);
    publicacionesCreadas.push(noticiaOtroGrupo.body.datos.id);

    const creada = await request(app)
      .post('/api/admin/publicaciones')
      .set('Cookie', cookieCoord)
      .send({
        tipo: 'NOTICIA',
        titulo: 'Noticia del grupo asignado',
        contenido,
        grupoIds: [grupoAsignado.id],
      });
    expect(creada.status).toBe(201);
    const noticiaPropiaId = creada.body.datos.id;
    publicacionesCreadas.push(noticiaPropiaId);
    expect(creada.body.datos.estado.codigo).toBe('BORRADOR');

    const editada = await request(app)
      .patch(`/api/admin/publicaciones/${noticiaPropiaId}`)
      .set('Cookie', cookieCoord)
      .send({ titulo: 'Noticia del grupo editada' });
    expect(editada.status).toBe(200);

    const enviada = await request(app)
      .post(`/api/admin/publicaciones/${noticiaPropiaId}/enviar-revision`)
      .set('Cookie', cookieCoord);
    expect(enviada.status).toBe(200);
    expect(enviada.body.datos.estado.codigo).toBe('EN_REVISION');

    const listado = await request(app).get('/api/admin/publicaciones').set('Cookie', cookieCoord);
    expect(listado.status).toBe(200);
    expect(listado.body.datos.map((p) => p.id)).toEqual([noticiaPropiaId]);

    for (const [nombre, metodo, ruta, cuerpo] of [
      [
        'crear aviso',
        'post',
        '/api/admin/publicaciones',
        { tipo: 'AVISO', titulo: 'Aviso no permitido', contenido },
      ],
      [
        'crear nota de prensa',
        'post',
        '/api/admin/publicaciones',
        {
          tipo: 'NOTA_DE_PRENSA',
          titulo: 'Nota de prensa no permitida',
          contenido,
          grupoIds: [grupoAsignado.id],
        },
      ],
      ['publicar directo', 'post', `/api/admin/publicaciones/${noticiaPropiaId}/publicar`, {}],
      ['archivar', 'post', `/api/admin/publicaciones/${noticiaPropiaId}/archivar`, {}],
      ['ver aviso ajeno (GET)', 'get', `/api/admin/publicaciones/${avisoAdmin.body.datos.id}`],
      [
        'ver noticia sin grupo (GET)',
        'get',
        `/api/admin/publicaciones/${noticiaSinGrupo.body.datos.id}`,
      ],
      [
        'ver noticia de otro grupo (GET)',
        'get',
        `/api/admin/publicaciones/${noticiaOtroGrupo.body.datos.id}`,
      ],
      [
        'editar noticia de otro grupo',
        'patch',
        `/api/admin/publicaciones/${noticiaOtroGrupo.body.datos.id}`,
        { titulo: 'Intruso' },
      ],
    ]) {
      let req = request(app)[metodo](ruta).set('Cookie', cookieCoord);
      if (cuerpo !== undefined) req = req.send(cuerpo);
      const res = await req;
      expect(res.status, nombre).toBe(403);
    }

    for (const [nombre, cuerpo] of [
      ['sin grupoIds', { tipo: 'NOTICIA', titulo: 'Sin grupo', contenido }],
      [
        'con grupo ajeno',
        { tipo: 'NOTICIA', titulo: 'Ajeno', contenido, grupoIds: [grupoAjenoMismaSede.id] },
      ],
      [
        'con grupo mixto (suyo + ajeno)',
        {
          tipo: 'NOTICIA',
          titulo: 'Mixto',
          contenido,
          grupoIds: [grupoAsignado.id, grupoAjenoMismaSede.id],
        },
      ],
      [
        'con servicioIds',
        {
          tipo: 'NOTICIA',
          titulo: 'Con sacramento',
          contenido,
          grupoIds: [grupoAsignado.id],
          servicioIds: [1],
        },
      ],
    ]) {
      const res = await request(app)
        .post('/api/admin/publicaciones')
        .set('Cookie', cookieCoord)
        .send(cuerpo);
      expect(res.status, nombre).toBe(400);
    }
  });

  it('quitarle el grupo lo deja sin acceso al instante y cambiar de rol borra sus asignaciones', async () => {
    const quitar = await request(app)
      .patch(`/api/admin/usuarios/${coordId}`)
      .set('Cookie', cookieAdmin)
      .send({ grupoIds: [grupoAjenoMismaSede.id] });
    expect(quitar.status).toBe(200);

    const sinAcceso = await request(app)
      .patch(`/api/admin/grupos-pastorales/${grupoAsignado.id}/detalle`)
      .set('Cookie', cookieCoord)
      .send({ responsable: 'Ya no puede' });
    expect(sinAcceso.status).toBe(403);

    const cambioRol = await request(app)
      .patch(`/api/admin/usuarios/${coordId}`)
      .set('Cookie', cookieAdmin)
      .send({ rol: 'MARKETING' });
    expect(cambioRol.status).toBe(200);
    expect(cambioRol.body.datos.gruposAsignados).toEqual([]);

    const { rows: asignaciones } = await consultar(
      'SELECT 1 FROM usuario_grupo_pastoral WHERE usuario_id = $1',
      [coordId],
    );
    expect(asignaciones).toHaveLength(0);
  });
});
