// Pruebas de integración de página enriquecida y galería de servicios/sacramentos (PAR-166.1).
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
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
const { reiniciarEstadoDeRedis } = await import('../../src/services/cache.service.js');

const app = createApp();
const prefijo = `sv-${randomUUID().slice(0, 6)}`;
const sesiones = {};
const serviciosCreados = [];
const archivosCreados = [];
let sedePrincipalId;
let otraSedeId;
let usuarioAdminId;
let imagenId;
let videoId;
let imagenAjenaId;

async function iniciarSesion(usuario) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ correo: usuario.correo, contrasena: usuario.contrasena });
  expect(res.status).toBe(200);
  return res.headers['set-cookie'][0].split(';')[0];
}

beforeAll(async () => {
  await limpiarContadoresDeIntentos();
  reiniciarEstadoDeRedis();

  const { rows: sedes } = await consultar('SELECT id, slug FROM sede ORDER BY id');
  sedePrincipalId = sedes.find((s) => s.slug === SEDE_PRINCIPAL).id;
  otraSedeId = sedes.find((s) => s.slug !== SEDE_PRINCIPAL).id;

  const admin = await crearUsuarioDePrueba({ rol: 'ADMINISTRADOR', sede: null });
  const marketing = await crearUsuarioDePrueba({ rol: 'MARKETING' });
  const secretaria = await crearUsuarioDePrueba({ rol: 'SECRETARIA' });
  usuarioAdminId = admin.id;
  sesiones.admin = await iniciarSesion(admin);
  sesiones.marketing = await iniciarSesion(marketing);
  sesiones.secretaria = await iniciarSesion(secretaria);

  const { rows: media } = await consultar(
    `INSERT INTO archivo_multimedia
       (sede_id, subido_por, nombre_original, url, tipo_mime, tamano_bytes, ancho_px, alto_px, texto_alternativo)
     VALUES
       ($1, $2, 'bautismo.webp', $3, 'image/webp', 1200, 1200, 800, 'Foto bautismo'),
       ($1, $2, 'video-sacramento.mp4', $4, 'video/mp4', 4500, null, null, 'Video sacramento'),
       ($5, $2, 'ajena.webp', $6, 'image/webp', 1000, 800, 600, 'Foto ajena')
     RETURNING id`,
    [
      sedePrincipalId,
      usuarioAdminId,
      `/media/test/${prefijo}-bautismo.webp`,
      `/media/test/${prefijo}-video.mp4`,
      otraSedeId,
      `/media/test/${prefijo}-ajena.webp`,
    ],
  );
  imagenId = media[0].id;
  videoId = media[1].id;
  imagenAjenaId = media[2].id;
  archivosCreados.push(imagenId, videoId, imagenAjenaId);
});

afterAll(async () => {
  for (const id of serviciosCreados) {
    await consultar("DELETE FROM bitacora_cambio WHERE entidad = 'servicio' AND entidad_id = $1", [
      String(id),
    ]);
    await consultar('DELETE FROM servicio WHERE id = $1', [id]);
  }
  if (archivosCreados.length > 0) {
    await consultar('DELETE FROM archivo_multimedia WHERE id = ANY($1::int[])', [archivosCreados]);
  }
  await limpiarContadoresDeIntentos();
  await borrarUsuariosDePrueba();
  await cerrarPool();
  await cerrarRedis();
});

describe('Página enriquecida y galería de servicios (PAR-166.1)', () => {
  it('crea un servicio con foto, galería y contenido, marca archivos en uso e invalida caché', async () => {
    const slug = `${prefijo}-bautismo`;
    const crear = await request(app)
      .post('/api/admin/servicios')
      .set('Cookie', sesiones.admin)
      .send({
        sedeId: sedePrincipalId,
        nombre: `Sacramento ${prefijo}`,
        slug,
        descripcionCorta: 'Descripción breve del sacramento.',
        icono: 'droplet',
        imagenId,
        contenido: { datos: [{ etiqueta: 'Charla', valor: 'Primer sábado' }] },
        detalle: {
          contenido: {
            formato: 'blocknote',
            version: 1,
            bloques: [
              {
                id: 'b1',
                type: 'paragraph',
                props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
                content: [{ type: 'text', text: 'Texto inicial', styles: {} }],
                children: [],
              },
            ],
          },
          galeria: [imagenId, videoId],
          videoYoutubeId: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        },
        visible: true,
      });

    expect(crear.status, JSON.stringify(crear.body)).toBe(201);
    const id = crear.body.datos.id;
    serviciosCreados.push(id);
    expect(crear.body.datos.imagen.id).toBe(imagenId);
    expect(crear.body.datos.detalle.videoYoutubeId).toBe('dQw4w9WgXcQ');

    // Biblioteca marca imagenId y videoId como en uso (409 al intentar eliminar)
    const borrarEnUso = await request(app)
      .delete(`/api/admin/multimedia/${videoId}`)
      .set('Cookie', sesiones.admin);
    expect(borrarEnUso.status).toBe(409);

    // Detalle público devuelve imagen, galeria y detalle
    const pub1 = await request(app).get(`/api/sedes/${SEDE_PRINCIPAL}/servicios/${slug}`);
    expect(pub1.status).toBe(200);
    expect(pub1.body.datos.imagen.id).toBe(imagenId);
    expect(pub1.body.datos.galeria).toHaveLength(2);
    expect(pub1.body.datos.galeria[1].tipoMime).toBe('video/mp4');
    expect(pub1.body.datos.detalle.videoYoutubeId).toBe('dQw4w9WgXcQ');

    // Marketing edita el detalle mediante PATCH /:id/detalle e invalida la caché
    const patchMarketing = await request(app)
      .patch(`/api/admin/servicios/${id}/detalle`)
      .set('Cookie', sesiones.marketing)
      .send({
        imagenId: null,
        detalle: {
          contenido: null,
          galeria: [imagenId],
          videoYoutubeId: null,
        },
      });
    expect(patchMarketing.status).toBe(200);
    expect(patchMarketing.body.datos.imagen).toBeNull();
    expect(patchMarketing.body.datos.detalle.galeria).toEqual([imagenId]);

    const pub3 = await request(app).get(`/api/sedes/${SEDE_PRINCIPAL}/servicios/${slug}`);
    expect(pub3.status).toBe(200);
    expect(pub3.body.datos.imagen).toBeNull();
    expect(pub3.body.datos.galeria).toHaveLength(1);
  });

  it('restringe permisos por rol en PATCH /:id/detalle y rechaza archivos ajenos o >24 en galería', async () => {
    const slug = `${prefijo}-perm`;
    const crear = await request(app)
      .post('/api/admin/servicios')
      .set('Cookie', sesiones.secretaria)
      .send({
        nombre: `Permisos ${prefijo}`,
        slug,
        descripcionCorta: 'Descripción breve.',
      });
    expect(crear.status, JSON.stringify(crear.body)).toBe(201);
    const id = crear.body.datos.id;
    serviciosCreados.push(id);

    const sinSesion = await request(app)
      .patch(`/api/admin/servicios/${id}/detalle`)
      .send({ imagenId: null });
    expect(sinSesion.status).toBe(401);

    // Marketing NO puede usar PATCH /:id, POST ni DELETE
    const patchGeneral = await request(app)
      .patch(`/api/admin/servicios/${id}`)
      .set('Cookie', sesiones.marketing)
      .send({ nombre: 'Otro' });
    expect(patchGeneral.status).toBe(403);

    const postMarketing = await request(app)
      .post('/api/admin/servicios')
      .set('Cookie', sesiones.marketing)
      .send({ nombre: 'No', descripcionCorta: 'No' });
    expect(postMarketing.status).toBe(403);

    const delMarketing = await request(app)
      .delete(`/api/admin/servicios/${id}`)
      .set('Cookie', sesiones.marketing);
    expect(delMarketing.status).toBe(403);

    // Archivo de otra sede -> 400
    const ajena = await request(app)
      .patch(`/api/admin/servicios/${id}/detalle`)
      .set('Cookie', sesiones.marketing)
      .send({ imagenId: imagenAjenaId });
    expect(ajena.status).toBe(400);

    // Más de 24 en galería -> 400
    const demasiados = await request(app)
      .patch(`/api/admin/servicios/${id}/detalle`)
      .set('Cookie', sesiones.marketing)
      .send({ detalle: { galeria: Array.from({ length: 25 }, () => imagenId) } });
    expect(demasiados.status).toBe(400);
  });
});
