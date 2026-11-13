// Gestión de sedes y redes sociales en el panel CMS (/api/admin/sedes).
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
const sedesCreadas = [];
const archivosCreados = [];
let sedePrincipalId;
let sedePrueba;
let redSocialIds;
let imagenPruebaId;
let imagenPrincipalId;

async function iniciarSesion(usuario) {
  const respuesta = await request(app)
    .post('/api/auth/login')
    .send({ correo: usuario.correo, contrasena: usuario.contrasena });
  expect(respuesta.status).toBe(200);
  return respuesta.headers['set-cookie'][0].split(';')[0];
}

beforeAll(async () => {
  await limpiarContadoresDeIntentos();
  const { rows: principalRows } = await consultar('SELECT id FROM sede WHERE slug = $1', [
    SEDE_PRINCIPAL,
  ]);
  sedePrincipalId = principalRows[0].id;

  const { rows: redesRows } = await consultar('SELECT id FROM red_social ORDER BY id');
  redSocialIds = redesRows.map((r) => r.id);

  // Creamos una sede de prueba para no modificar nunca los registros del seed en los PATCH.
  const { rows: sedeRows } = await consultar(
    `INSERT INTO sede (tipo_sede_id, nombre, slug, configuracion)
     VALUES (
       (SELECT id FROM tipo_sede ORDER BY id LIMIT 1),
       'Sede Prueba Edicion',
       $1,
       '{"horarios_introduccion": "Texto inicial", "horarios_notas": {"secretaria": "Nota inicial", "confesiones_adoracion": "Previo a misa"}}'::jsonb
     )
     RETURNING id, slug, nombre`,
    [`prueba-sede-${randomUUID()}`.slice(0, 40)],
  );
  sedePrueba = sedeRows[0];
  sedesCreadas.push(sedePrueba.id);

  for (const [nombre, opts] of [
    ['admin', { rol: 'ADMINISTRADOR', sede: null }],
    ['parroco', { rol: 'PARROCO' }],
    ['secretaria', { rol: 'SECRETARIA', sede: sedePrueba.slug }],
    ['marketing', { rol: 'MARKETING' }],
  ]) {
    usuarios[nombre] = await crearUsuarioDePrueba(opts);
    sesiones[nombre] = await iniciarSesion(usuarios[nombre]);
  }

  const { rows: mediaRows } = await consultar(
    `INSERT INTO archivo_multimedia
       (sede_id, subido_por, nombre_original, url, tipo_mime, tamano_bytes, ancho_px, alto_px, texto_alternativo)
     VALUES
       ($1, $2, 'portada-prueba.webp', $3, 'image/webp', 1500, 1200, 630, 'Portada prueba'),
       ($4, $5, 'portada-principal.webp', $6, 'image/webp', 1500, 1200, 630, 'Portada principal')
     RETURNING id`,
    [
      sedePrueba.id,
      usuarios.secretaria.id,
      `/media/test/portada-${randomUUID()}.webp`,
      sedePrincipalId,
      usuarios.parroco.id,
      `/media/test/principal-${randomUUID()}.webp`,
    ],
  );
  imagenPruebaId = mediaRows[0].id;
  imagenPrincipalId = mediaRows[1].id;
  archivosCreados.push(imagenPruebaId, imagenPrincipalId);
});

afterAll(async () => {
  if (sedesCreadas.length > 0) {
    await consultar(
      "DELETE FROM bitacora_cambio WHERE entidad IN ('sede', 'sede_red_social') AND entidad_id = ANY($1::text[])",
      [sedesCreadas],
    );
    await consultar('DELETE FROM sede_red_social WHERE sede_id = ANY($1)', [sedesCreadas]);
  }
  if (archivosCreados.length > 0) {
    await consultar('DELETE FROM archivo_multimedia WHERE id = ANY($1)', [archivosCreados]);
  }
  await limpiarContadoresDeIntentos();
  await borrarUsuariosDePrueba();
  for (const id of [...sedesCreadas].reverse()) {
    await consultar('DELETE FROM sede WHERE id = $1', [id]);
  }
  await cerrarPool();
  await cerrarRedis();
});

describe('GET /api/admin/sedes y GET /api/admin/sedes/:id', () => {
  it('sin sesión responde 401; Administrador ve todas y los demás roles solo su propia sede', async () => {
    const sinSesion = await request(app).get('/api/admin/sedes');
    expect(sinSesion.status).toBe(401);

    const listaAdmin = await request(app).get('/api/admin/sedes').set('Cookie', sesiones.admin);
    expect(listaAdmin.status).toBe(200);
    expect(listaAdmin.body.paginacion).toBeUndefined();
    expect(listaAdmin.body.datos.length).toBeGreaterThanOrEqual(4);

    const principal = listaAdmin.body.datos.find((s) => s.id === sedePrincipalId);
    expect(principal).toMatchObject({
      id: sedePrincipalId,
      slug: SEDE_PRINCIPAL,
      activo: true,
      configuracion: {
        horariosIntroduccion: expect.any(String),
        horariosNotas: expect.any(Object),
      },
    });
    expect(principal.redesSociales[0]).toEqual({
      id: expect.any(Number),
      nombre: expect.any(String),
      icono: expect.any(String),
      url: expect.any(String),
    });

    const listaSec = await request(app).get('/api/admin/sedes').set('Cookie', sesiones.secretaria);
    expect(listaSec.status).toBe(200);
    expect(listaSec.body.datos).toHaveLength(1);
    expect(listaSec.body.datos[0].id).toBe(sedePrueba.id);

    const detalleAjeno = await request(app)
      .get(`/api/admin/sedes/${sedePrincipalId}`)
      .set('Cookie', sesiones.secretaria);
    expect(detalleAjeno.status).toBe(403);

    const noExiste = await request(app)
      .get('/api/admin/sedes/99999999')
      .set('Cookie', sesiones.admin);
    expect(noExiste.status).toBe(404);
  });
});

describe('POST /api/admin/sedes', () => {
  it('solo permite crear al Administrador (403 a otros roles) y valida slug único y coordenadas', async () => {
    const forbidden = await request(app)
      .post('/api/admin/sedes')
      .set('Cookie', sesiones.parroco)
      .send({ nombre: 'No permitida', tipo: 'CAPILLA' });
    expect(forbidden.status).toBe(403);

    const coordIncompleta = await request(app)
      .post('/api/admin/sedes')
      .set('Cookie', sesiones.admin)
      .send({ nombre: 'Coord mala', tipo: 'CAPILLA', latitud: -16.5 });
    expect(coordIncompleta.status).toBe(400);

    const slugCapilla = `capilla-${randomUUID()}`.slice(0, 40);
    const creada = await request(app)
      .post('/api/admin/sedes')
      .set('Cookie', sesiones.admin)
      .send({
        nombre: 'Capilla Santa Gema Prueba',
        slug: slugCapilla,
        tipo: 'CAPILLA',
        sedePadreId: sedePrincipalId,
        direccion: 'Calle 15 de Obrajes, La Paz',
        configuracion: { textoBarraSuperior: 'Aviso capilla' },
        redesSociales: [{ redSocialId: redSocialIds[0], url: 'https://www.facebook.com/capilla' }],
        activo: false,
      });

    expect(creada.status).toBe(201);
    sedesCreadas.push(creada.body.datos.id);
    expect(creada.headers.location).toBe(`/api/admin/sedes/${creada.body.datos.id}`);
    expect(creada.body.datos).toMatchObject({
      nombre: 'Capilla Santa Gema Prueba',
      slug: slugCapilla,
      tipo: { codigo: 'CAPILLA', nombre: 'Capilla' },
      sedePadre: { id: sedePrincipalId, slug: SEDE_PRINCIPAL },
      activo: false,
      configuracion: { textoBarraSuperior: 'Aviso capilla' },
      redesSociales: [
        {
          id: redSocialIds[0],
          nombre: expect.any(String),
          icono: expect.any(String),
          url: 'https://www.facebook.com/capilla',
        },
      ],
    });

    const duplicado = await request(app)
      .post('/api/admin/sedes')
      .set('Cookie', sesiones.admin)
      .send({ nombre: 'Repetida', slug: slugCapilla, tipo: 'CAPILLA' });
    expect(duplicado.status).toBe(409);

    // El Administrador ve también las sedes inactivas.
    const listaAdmin = await request(app).get('/api/admin/sedes').set('Cookie', sesiones.admin);
    expect(listaAdmin.body.datos.some((s) => s.id === creada.body.datos.id && !s.activo)).toBe(
      true,
    );
  });
});

describe('PATCH /api/admin/sedes/:id', () => {
  it('restringe permisos por rol y campos exclusivos de Administrador', async () => {
    const marketing = await request(app)
      .patch(`/api/admin/sedes/${sedePrincipalId}`)
      .set('Cookie', sesiones.marketing)
      .send({ telefono: '+591 22780000' });
    expect(marketing.status).toBe(403);

    const otraSede = await request(app)
      .patch(`/api/admin/sedes/${sedePrincipalId}`)
      .set('Cookie', sesiones.secretaria)
      .send({ whatsapp: '+591 70000000' });
    expect(otraSede.status).toBe(403);

    for (const campoProhibido of [
      { slug: 'otro-slug' },
      { tipo: 'CAPILLA' },
      { sedePadreId: sedePrincipalId },
      { activo: false },
    ]) {
      const res = await request(app)
        .patch(`/api/admin/sedes/${sedePrueba.id}`)
        .set('Cookie', sesiones.secretaria)
        .send(campoProhibido);
      expect(res.status).toBe(403);
    }
  });

  it('fusiona configuracion, reemplaza redes con https://, valida imagenPortadaId y permite al Admin activar/desactivar', async () => {
    const redInvalida = await request(app)
      .patch(`/api/admin/sedes/${sedePrueba.id}`)
      .set('Cookie', sesiones.secretaria)
      .send({
        redesSociales: [{ redSocialId: redSocialIds[0], url: 'http://facebook.com/inseguro' }],
      });
    expect(redInvalida.status).toBe(400);

    const imagenAjena = await request(app)
      .patch(`/api/admin/sedes/${sedePrueba.id}`)
      .set('Cookie', sesiones.secretaria)
      .send({ imagenPortadaId: imagenPrincipalId });
    expect(imagenAjena.status).toBe(400);

    const editadoSec = await request(app)
      .patch(`/api/admin/sedes/${sedePrueba.id}`)
      .set('Cookie', sesiones.secretaria)
      .send({
        whatsapp: '+591 71234567',
        latitud: -16.523456,
        longitud: -68.112233,
        imagenPortadaId: imagenPruebaId,
        configuracion: {
          textoBarraSuperior: 'Hoy: Misa 19:00',
          horariosIntroduccion: null,
          horariosNotas: { secretaria: 'Actualizada' },
        },
        redesSociales: [
          { redSocialId: redSocialIds[0], url: 'https://www.facebook.com/prueba' },
          { redSocialId: redSocialIds[1], url: 'https://www.instagram.com/prueba' },
        ],
      });

    expect(editadoSec.status).toBe(200);
    expect(editadoSec.body.datos).toMatchObject({
      whatsapp: '+591 71234567',
      ubicacion: { latitud: -16.523456, longitud: -68.112233 },
      imagenPortada: {
        id: imagenPruebaId,
        textoAlternativo: 'Portada prueba',
      },
      configuracion: {
        textoBarraSuperior: 'Hoy: Misa 19:00',
        horariosNotas: {
          secretaria: 'Actualizada',
          confesionesAdoracion: 'Previo a misa',
        },
      },
    });
    expect(editadoSec.body.datos.configuracion.horariosIntroduccion).toBeUndefined();
    expect(editadoSec.body.datos.redesSociales).toHaveLength(2);

    // Quitar solo latitud dejando longitud responde 400 VALIDACION.
    const quitarUnaCoord = await request(app)
      .patch(`/api/admin/sedes/${sedePrueba.id}`)
      .set('Cookie', sesiones.secretaria)
      .send({ latitud: null });
    expect(quitarUnaCoord.status).toBe(400);

    const editadoAdmin = await request(app)
      .patch(`/api/admin/sedes/${sedePrueba.id}`)
      .set('Cookie', sesiones.admin)
      .send({
        tipo: 'CAPILLA',
        sedePadreId: sedePrincipalId,
        activo: false,
        imagenPortadaId: null,
      });
    expect(editadoAdmin.status).toBe(200);
    expect(editadoAdmin.body.datos).toMatchObject({
      tipo: { codigo: 'CAPILLA', nombre: 'Capilla' },
      sedePadre: { id: sedePrincipalId, slug: SEDE_PRINCIPAL },
      activo: false,
      imagenPortada: null,
    });

    const { rows: bitacora } = await consultar(
      "SELECT entidad, accion FROM bitacora_cambio WHERE entidad IN ('sede', 'sede_red_social') AND entidad_id = $1",
      [String(sedePrueba.id)],
    );
    expect(bitacora.length).toBeGreaterThanOrEqual(3);
  });
});
