// Detalle enriquecido de eventos (PAR-163): migración 004, permiso eventos.detalle,
// PATCH /api/admin/eventos/:id/detalle, GET /api/sedes/:sede/eventos/:id y tieneDetalle en lista.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { archivoDelSeed, crearPanel, registrosDe, sedePrincipal } from '../apoyo/panel.js';

vi.stubEnv('CDN_PUBLIC_URL', 'https://cdn.ejemplo.test');
vi.stubEnv('CACHE_HABILITADA', 'true');

const { createApp } = await import('../../src/app.js');
const { consultar, cerrarPool } = await import('../../src/db/index.js');
const { cerrarRedis, obtenerRedis } = await import('../../src/db/redis.js');
const { reiniciarEstadoDeRedis } = await import('../../src/services/cache.service.js');

const app = createApp();
const panel = crearPanel(app);
const { como, usuarios } = panel;

const RUTA_ADMIN = '/api/admin/eventos';
const PREFIJO = `Prueba detalle ${Date.now()}`;
let contador = 0;
let sede;
let sedeAjena;
let imagenPropia;
let imagenAjena;
let pdfPropio;
let altar;

const bloqueParrafo = (texto = 'Texto de ejemplo del evento.') => ({
  id: `p-${randomUUID().slice(0, 8)}`,
  type: 'paragraph',
  props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
  content: [{ type: 'text', text: texto, styles: {} }],
  children: [],
});

const bloqueImagen = (url, caption = 'Foto del evento') => ({
  id: `img-${randomUUID().slice(0, 8)}`,
  type: 'image',
  props: {
    textAlignment: 'center',
    backgroundColor: 'default',
    name: 'foto.webp',
    url,
    caption,
    showPreview: true,
  },
  children: [],
});

const detalleCompleto = (urlImagen = '/media/seed/altar.webp') => ({
  contenido: {
    formato: 'blocknote',
    version: 1,
    bloques: [bloqueParrafo(), bloqueImagen(urlImagen)],
  },
  direccion: 'Av. Héctor Ormachea N.º 167, Obrajes',
  enlaceMapa: 'https://maps.app.goo.gl/ejemploMapa123',
  programa: [
    { hora: '19:30', actividad: 'Compartir fraterno' },
    { hora: '18:00', actividad: 'Recepción de participantes' },
  ],
  responsable: {
    nombre: 'Equipo Pastoral (ejemplo)',
    rol: 'Coordinación',
    telefono: '+591 71234567',
    correo: 'contacto@ejemplo.test',
  },
  enlaces: [{ texto: 'Inscripciones', url: 'https://ejemplo.test/inscripcion' }],
});

const crearEvento = async (extra = {}) => {
  const respuesta = await como('secretaria').post(RUTA_ADMIN, {
    titulo: `${PREFIJO} ${++contador}`,
    fechaInicio: '2031-12-10T18:00:00-04:00',
    categoriaEventoId: 1,
    ...extra,
  });
  expect(respuesta.status, JSON.stringify(respuesta.body)).toBe(201);
  return respuesta.body.datos;
};

async function borrarCacheEventos() {
  reiniciarEstadoDeRedis();
  const claves = await obtenerRedis().keys('cache:v1:*');
  if (claves.length > 0) await obtenerRedis().del(claves);
}

beforeAll(async () => {
  sede = await sedePrincipal();
  sedeAjena = await panel.crearSede();
  altar = await archivoDelSeed('/media/seed/altar.webp');

  await panel.conSesion('admin', { rol: 'ADMINISTRADOR', sede: null });
  await panel.conSesion('parroco', { rol: 'PARROCO' });
  await panel.conSesion('secretaria', { rol: 'SECRETARIA' });
  await panel.conSesion('marketing', { rol: 'MARKETING' });
  await panel.conSesion('secretariaAjena', { rol: 'SECRETARIA', sede: sedeAjena.slug });

  const uuidPropio = randomUUID();
  imagenPropia = await panel.crearArchivo({
    sedeId: sede.id,
    subidoPor: usuarios.marketing.id,
    tipoMime: 'image/webp',
    clave: `sedes/${sede.slug}/2026/11/${uuidPropio}.webp`,
    ancho: 1200,
  });
  imagenAjena = await panel.crearArchivo({
    sedeId: sedeAjena.id,
    subidoPor: usuarios.secretariaAjena.id,
    tipoMime: 'image/webp',
    clave: `sedes/${sedeAjena.slug}/2026/11/${randomUUID()}.webp`,
    ancho: 1200,
  });
  pdfPropio = await panel.crearArchivo({
    sedeId: sede.id,
    subidoPor: usuarios.marketing.id,
    tipoMime: 'application/pdf',
  });
});

beforeEach(borrarCacheEventos);

afterAll(async () => {
  await borrarCacheEventos();
  await panel.limpiar(() => consultar('DELETE FROM evento WHERE titulo LIKE $1', [`${PREFIJO}%`]));
  await cerrarPool();
  await cerrarRedis();
});

describe('admin: crear y editar detalle de evento', () => {
  it('crea con detalle completo, ordena el programa por hora y permite limpiarlo con null', async () => {
    const urlCdn = `https://cdn.ejemplo.test/${imagenPropia.url}`;
    const creado = await crearEvento({
      imagenId: altar.id,
      detalle: detalleCompleto(urlCdn),
    });

    expect(creado.detalle).toMatchObject({
      direccion: 'Av. Héctor Ormachea N.º 167, Obrajes',
      enlaceMapa: 'https://maps.app.goo.gl/ejemploMapa123',
      programa: [
        { hora: '18:00', actividad: 'Recepción de participantes' },
        { hora: '19:30', actividad: 'Compartir fraterno' },
      ],
      responsable: {
        nombre: 'Equipo Pastoral (ejemplo)',
        rol: 'Coordinación',
        telefono: '+591 71234567',
        correo: 'contacto@ejemplo.test',
      },
      enlaces: [{ texto: 'Inscripciones', url: 'https://ejemplo.test/inscripcion' }],
    });
    expect(creado.detalle.contenido.bloques).toHaveLength(2);

    // La biblioteca detecta que imagenPropia está en uso dentro de detalle.contenido.
    const intentoBorrar = await como('marketing').delete(
      `/api/admin/multimedia/${imagenPropia.id}`,
    );
    expect(intentoBorrar.status).toBe(409);
    expect(intentoBorrar.body.error.detalles).toEqual([
      { campo: 'id', mensaje: `Usado dentro del detalle del evento «${creado.titulo}».` },
    ]);

    const limpio = await como('secretaria').patch(`${RUTA_ADMIN}/${creado.id}`, { detalle: null });
    expect(limpio.status).toBe(200);
    expect(limpio.body.datos.detalle).toBeNull();
  });

  it('rechaza detalle inválido con 400 en el campo exacto', async () => {
    const respuesta = await como('secretaria').post(RUTA_ADMIN, {
      titulo: `${PREFIJO} invalido`,
      fechaInicio: '2031-12-10T18:00:00-04:00',
      categoriaEventoId: 1,
      detalle: {
        direccion: 'x'.repeat(201),
        enlaceMapa: 'https://sitio-ajeno.test/maps',
        programa: [{ hora: '25:99', actividad: 'Misa' }],
        responsable: { nombre: 'Ana', correo: 'no-es-correo', telefono: 'abc' },
        enlaces: [{ texto: 'Ver', url: 'http://inseguro.test' }],
        contenido: {
          formato: 'blocknote',
          version: 1,
          bloques: [{ id: '1', type: 'table', props: {}, content: [], children: [] }],
        },
        extra: 'no-permitido',
      },
    });

    expect(respuesta.status).toBe(400);
    const campos = respuesta.body.error.detalles.map((d) => d.campo);
    expect(campos).toEqual(
      expect.arrayContaining([
        'detalle.direccion',
        'detalle.enlaceMapa',
        'detalle.programa.0.hora',
        'detalle.responsable.correo',
        'detalle.responsable.telefono',
        'detalle.enlaces.0.url',
        'detalle.contenido.bloques.0.type',
        'detalle.extra',
      ]),
    );
  });

  it('rechaza archivo inexistente, de otra sede o de otra clase en detalle.contenido', async () => {
    const evento = await crearEvento();

    const ajena = await como('secretaria').patch(`${RUTA_ADMIN}/${evento.id}`, {
      detalle: {
        contenido: {
          formato: 'blocknote',
          version: 1,
          bloques: [bloqueImagen(`https://cdn.ejemplo.test/${imagenAjena.url}`)],
        },
      },
    });
    expect(ajena.status).toBe(400);
    expect(ajena.body.error.detalles).toEqual([
      {
        campo: 'detalle.contenido.bloques.0.props.url',
        mensaje: 'Debe ser una imagen de la biblioteca multimedia de esta sede.',
      },
    ]);

    const inexistente = await como('secretaria').patch(`${RUTA_ADMIN}/${evento.id}/detalle`, {
      detalle: {
        contenido: {
          formato: 'blocknote',
          version: 1,
          bloques: [bloqueImagen('https://cdn.ejemplo.test/sedes/x/no-existe.webp')],
        },
      },
    });
    expect(inexistente.status).toBe(400);
    expect(inexistente.body.error.detalles[0].campo).toBe('detalle.contenido.bloques.0.props.url');

    const claseDistinta = await como('secretaria').patch(`${RUTA_ADMIN}/${evento.id}/detalle`, {
      detalle: {
        contenido: {
          formato: 'blocknote',
          version: 1,
          bloques: [bloqueImagen(pdfPropio.url)],
        },
      },
    });
    expect(claseDistinta.status).toBe(400);
    expect(claseDistinta.body.error.detalles).toEqual([
      {
        campo: 'detalle.contenido.bloques.0.props.url',
        mensaje: 'El archivo no es una imagen.',
      },
    ]);
  });
});

describe('PATCH /api/admin/eventos/:id/detalle (permisos y bitácora)', () => {
  it('Marketing lista, ve y edita solo el detalle (200), pero no edita el evento (403); sin sesión 401', async () => {
    const creado = await crearEvento();
    const ajeno = await (async () => {
      const r = await como('secretariaAjena').post(RUTA_ADMIN, {
        titulo: `${PREFIJO} ajeno`,
        fechaInicio: '2031-12-10T18:00:00-04:00',
        categoriaEventoId: 1,
      });
      return r.body.datos;
    })();

    expect(
      (await como().patch(`${RUTA_ADMIN}/${creado.id}/detalle`, { detalle: null })).status,
    ).toBe(401);

    expect((await como('marketing').get(RUTA_ADMIN)).status).toBe(200);
    expect((await como('marketing').get(`${RUTA_ADMIN}/${creado.id}`)).status).toBe(200);

    const intentoEvento = await como('marketing').patch(`${RUTA_ADMIN}/${creado.id}`, {
      titulo: 'Intento cambio',
    });
    expect(intentoEvento.status).toBe(403);

    const edicion = await como('marketing').patch(`${RUTA_ADMIN}/${creado.id}/detalle`, {
      detalle: detalleCompleto('/media/seed/altar.webp'),
    });
    expect(edicion.status).toBe(200);
    expect(edicion.body.datos.detalle.direccion).toBe('Av. Héctor Ormachea N.º 167, Obrajes');
    expect(edicion.body.datos.titulo).toBe(creado.titulo);

    const otroRol = await como('parroco').patch(`${RUTA_ADMIN}/${creado.id}/detalle`, {
      detalle: { direccion: 'Solo dirección' },
    });
    expect(otroRol.status).toBe(200);
    expect(otroRol.body.datos.detalle.direccion).toBe('Solo dirección');

    expect(
      (await como('marketing').patch(`${RUTA_ADMIN}/${ajeno.id}/detalle`, { detalle: null }))
        .status,
    ).toBe(403);
    expect(
      (await como('marketing').patch(`${RUTA_ADMIN}/999999999/detalle`, { detalle: null })).status,
    ).toBe(404);

    const historial = await registrosDe('evento', creado.id);
    expect(historial.at(-1)).toMatchObject({
      usuario_id: usuarios.parroco.id,
      accion: 'UPDATE',
    });
  });
});

describe('API pública: detalle del evento, tieneDetalle, filtro por día y caché', () => {
  const PUBLICO = '/api/sedes/senor-de-la-exaltacion/eventos';

  it('el seed incluye un evento con detalle marcado como ejemplo y tieneDetalle en la lista', async () => {
    const lista = await request(app).get(`${PUBLICO}?porPagina=50`);
    expect(lista.status).toBe(200);
    for (const item of lista.body.datos) {
      expect(item).not.toHaveProperty('detalle');
      expect(typeof item.tieneDetalle).toBe('boolean');
    }

    const misaSanacion = lista.body.datos.find((e) => e.titulo === 'Misa de sanación');
    expect(misaSanacion.tieneDetalle).toBe(true);

    const detalle = await request(app).get(`${PUBLICO}/${misaSanacion.id}`);
    expect(detalle.status).toBe(200);
    expect(detalle.body.datos.detalle.programa.length).toBeGreaterThan(0);
  });

  it('GET /eventos/:id devuelve 200 (también pasados), resuelve URLs y oculta borradores/archivados/otra sede', async () => {
    const publicado = await crearEvento({
      fechaInicio: '2031-12-20T18:00:00-04:00',
      detalle: {
        contenido: {
          formato: 'blocknote',
          version: 1,
          bloques: [bloqueImagen(`https://cdn.ejemplo.test/${imagenPropia.url}`)],
        },
        direccion: 'Salón parroquial',
      },
    });
    const borrador = await crearEvento({ estado: 'BORRADOR' });
    const archivado = await crearEvento({ estado: 'ARCHIVADO' });
    const pasado = await crearEvento({ fechaInicio: '2020-05-01T10:00:00-04:00' });
    const ajeno = await (async () => {
      const r = await como('secretariaAjena').post(RUTA_ADMIN, {
        titulo: `${PREFIJO} publico ajeno`,
        fechaInicio: '2031-12-20T18:00:00-04:00',
        categoriaEventoId: 1,
      });
      return r.body.datos;
    })();

    // Si en DB quedó una clave relativa de bucket en contenido.bloques, también se resuelve al CDN.
    await consultar(
      `UPDATE evento SET detalle = jsonb_set(detalle, '{contenido,bloques,0,props,url}', to_jsonb($2::text)) WHERE id = $1`,
      [publicado.id, imagenPropia.url],
    );

    const r1 = await request(app).get(`${PUBLICO}/${publicado.id}`);
    expect(r1.status).toBe(200);
    expect(r1.headers['x-cache']).toBe('MISS');
    expect(r1.body.datos.tieneDetalle).toBe(true);
    expect(r1.body.datos.detalle.contenido.bloques[0].props.url).toBe(
      `https://cdn.ejemplo.test/${imagenPropia.url}`,
    );

    const r2 = await request(app).get(`${PUBLICO}/${publicado.id}`);
    expect(r2.headers['x-cache']).toBe('HIT');

    // Al editar el detalle con PATCH .../detalle, la caché se invalida de inmediato.
    await como('marketing').patch(`${RUTA_ADMIN}/${publicado.id}/detalle`, {
      detalle: { direccion: 'Dirección actualizada' },
    });
    const r3 = await request(app).get(`${PUBLICO}/${publicado.id}`);
    expect(r3.headers['x-cache']).toBe('MISS');
    expect(r3.body.datos.detalle.direccion).toBe('Dirección actualizada');

    expect((await request(app).get(`${PUBLICO}/${pasado.id}`)).status).toBe(200);
    expect((await request(app).get(`${PUBLICO}/${borrador.id}`)).status).toBe(404);
    expect((await request(app).get(`${PUBLICO}/${archivado.id}`)).status).toBe(404);
    expect((await request(app).get(`${PUBLICO}/${ajeno.id}`)).status).toBe(404);
    expect((await request(app).get(`${PUBLICO}/999999999`)).status).toBe(404);
    const invalido = await request(app).get(`${PUBLICO}/no-numerico`);
    expect(invalido.status).toBe(404);
    expect(invalido.body.error.codigo).toBe('NO_ENCONTRADO');
  });

  it('filtra por un solo día con desde = hasta sin incluir detalle en la lista', async () => {
    const eseDia = await crearEvento({
      titulo: `${PREFIJO} un dia`,
      fechaInicio: '2032-04-15T19:00:00-04:00',
      detalle: { direccion: 'Templo' },
    });
    await crearEvento({
      titulo: `${PREFIJO} otro dia`,
      fechaInicio: '2032-04-16T19:00:00-04:00',
    });

    const respuesta = await request(app).get(`${PUBLICO}?desde=2032-04-15&hasta=2032-04-15`);
    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos.map((e) => e.id)).toEqual([eseDia.id]);
    expect(respuesta.body.datos[0]).not.toHaveProperty('detalle');
    expect(respuesta.body.datos[0].tieneDetalle).toBe(true);
  });
});
