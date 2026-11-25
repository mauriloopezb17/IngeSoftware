// Pruebas de integración del detalle de proclamas (PAR-165): migración 005, permiso
// proclamas.detalle, PATCH .../detalle, validación de archivos/galería/lugar, uso en biblioteca y
// endpoint público GET /api/sedes/:sede/proclamas/:id.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { ejemploDelContrato } from '../apoyo/contrato.js';
import { crearPanel, registrosDe, sedePrincipal } from '../apoyo/panel.js';

vi.stubEnv('CDN_PUBLIC_URL', 'https://cdn.ejemplo.test');

const { createApp } = await import('../../src/app.js');
const { consultar, cerrarPool } = await import('../../src/db/index.js');
const { cerrarRedis } = await import('../../src/db/redis.js');

const app = createApp();
const panel = crearPanel(app);
const { como, usuarios } = panel;

const PREFIJO = `Prueba det ${Date.now()}`;
let contador = 0;
let sede;
let sedeAjena;
let imgSede;
let videoSede;
let imgAjena;
let pdfSede;

const uuid = () => randomUUID();

const bloqueParrafo = (texto) => ({
  id: uuid(),
  type: 'paragraph',
  props: {},
  content: [{ type: 'text', text: texto, styles: {} }],
  children: [],
});

const bloqueImagen = (url) => ({
  id: uuid(),
  type: 'image',
  props: { url, caption: 'Foto de prueba' },
  children: [],
});

beforeAll(async () => {
  sede = await sedePrincipal();
  sedeAjena = await panel.crearSede();
  await panel.conSesion('admin', { rol: 'ADMINISTRADOR', sede: null });
  await panel.conSesion('secretaria', { rol: 'SECRETARIA' });
  await panel.conSesion('marketing', { rol: 'MARKETING' });
  await panel.conSesion('secretariaAjena', { rol: 'SECRETARIA', sede: sedeAjena.slug });

  imgSede = await panel.crearArchivo({
    sedeId: sede.id,
    subidoPor: usuarios.secretaria.id,
    tipoMime: 'image/webp',
    clave: `sedes/${sede.slug}/2026/11/${uuid()}.webp`,
    textoAlternativo: 'Foto de los novios',
    ancho: 1200,
    alto: 800,
  });

  videoSede = await panel.crearArchivo({
    sedeId: sede.id,
    subidoPor: usuarios.marketing.id,
    tipoMime: 'video/mp4',
    clave: `sedes/${sede.slug}/2026/11/${uuid()}.mp4`,
    textoAlternativo: 'Video de invitación',
  });

  imgAjena = await panel.crearArchivo({
    sedeId: sedeAjena.id,
    subidoPor: usuarios.secretariaAjena.id,
    tipoMime: 'image/webp',
    clave: `sedes/${sedeAjena.slug}/2026/11/${uuid()}.webp`,
    textoAlternativo: 'Imagen ajena',
    ancho: 800,
    alto: 600,
  });

  pdfSede = await panel.crearArchivo({
    sedeId: sede.id,
    subidoPor: usuarios.secretaria.id,
    tipoMime: 'application/pdf',
    clave: `sedes/${sede.slug}/2026/11/${uuid()}.pdf`,
  });
});

afterAll(async () => {
  await panel.limpiar(async () => {
    await consultar(
      `DELETE FROM proclama_publicacion WHERE proclama_id IN
         (SELECT id FROM proclama WHERE nombre_contrayente_1 LIKE $1)`,
      [`${PREFIJO}%`],
    );
    await consultar('DELETE FROM proclama WHERE nombre_contrayente_1 LIKE $1', [`${PREFIJO}%`]);
  });
  await cerrarPool();
  await cerrarRedis();
});

const RUTA = '/api/admin/proclamas';
const proclama = (extra = {}) => ({
  contrayente1: `${PREFIJO} Novio ${++contador}`,
  contrayente2: 'Novia de Prueba',
  fechaMatrimonio: '2032-12-05T12:00:00-04:00',
  ...extra,
});

describe('detalle de proclamas (admin)', () => {
  it('crea y edita proclama con imagenId y detalle (contenido, galería y lugar)', async () => {
    const detalleInicial = {
      contenido: {
        formato: 'blocknote',
        version: 1,
        bloques: [
          bloqueParrafo('Nos alegra invitarlos a nuestra boda.'),
          bloqueImagen(`https://cdn.ejemplo.test/${imgSede.url}`),
        ],
      },
      galeria: [imgSede.id, videoSede.id],
      lugar: {
        templo: 'Capilla San Pablo de la Cruz',
        direccion: 'Av. Costanera 123',
        enlaceMapa: 'https://maps.app.goo.gl/ejemplo',
      },
    };

    const creada = await como('secretaria').post(
      RUTA,
      proclama({
        imagenId: imgSede.id,
        detalle: detalleInicial,
      }),
    );
    expect(creada.status, JSON.stringify(creada.body)).toBe(201);
    expect(creada.body.datos.imagenId).toBe(imgSede.id);
    expect(creada.body.datos.detalle).toEqual(detalleInicial);

    // La biblioteca cuenta los usos (imagen principal, galería y contenido).
    const usoRes = await como('secretaria').get(`/api/admin/multimedia/${imgSede.id}`);
    expect(usoRes.status).toBe(200);
    expect(usoRes.body.datos.enUso).toBe(true);

    const usoVideoRes = await como('marketing').get(`/api/admin/multimedia/${videoSede.id}`);
    expect(usoVideoRes.status).toBe(200);
    expect(usoVideoRes.body.datos.enUso).toBe(true);

    // Limpiar detalle e imagenId con null.
    const limpiada = await como('secretaria').patch(`${RUTA}/${creada.body.datos.id}`, {
      imagenId: null,
      detalle: null,
    });
    expect(limpiada.status).toBe(200);
    expect(limpiada.body.datos.imagenId).toBeNull();
    expect(limpiada.body.datos.detalle).toBeNull();

    const libreRes = await como('secretaria').get(`/api/admin/multimedia/${imgSede.id}`);
    expect(libreRes.status).toBe(200);
    expect(libreRes.body.datos.enUso).toBe(false);
  });

  it('rechaza archivos inexistentes, de otra sede, tipo incorrecto o galería > 12', async () => {
    const base = await como('secretaria').post(RUTA, proclama());
    const id = base.body.datos.id;

    // Archivo de otra sede en imagenId
    const ajena = await como('secretaria').patch(`${RUTA}/${id}/detalle`, {
      imagenId: imgAjena.id,
    });
    expect(ajena.status).toBe(400);
    expect(ajena.body.error.detalles[0].campo).toBe('imagenId');

    // PDF en imagenId
    const pdfEnImg = await como('secretaria').patch(`${RUTA}/${id}/detalle`, {
      imagenId: pdfSede.id,
    });
    expect(pdfEnImg.status).toBe(400);
    expect(pdfEnImg.body.error.detalles[0].campo).toBe('imagenId');

    // PDF en galería (solo imagen o video)
    const pdfEnGaleria = await como('secretaria').patch(`${RUTA}/${id}/detalle`, {
      detalle: { galeria: [pdfSede.id] },
    });
    expect(pdfEnGaleria.status).toBe(400);
    expect(pdfEnGaleria.body.error.detalles[0].campo).toBe('detalle.galeria.0');

    // Más de 12 en galería
    const trece = await como('secretaria').patch(`${RUTA}/${id}/detalle`, {
      detalle: { galeria: Array.from({ length: 13 }, () => imgSede.id) },
    });
    expect(trece.status).toBe(400);
    expect(trece.body.error.detalles[0].campo).toBe('detalle.galeria');

    // URL de mapa inválida (no es Google Maps)
    const mapaMalo = await como('secretaria').patch(`${RUTA}/${id}/detalle`, {
      detalle: {
        lugar: {
          templo: 'Parroquia',
          direccion: null,
          enlaceMapa: 'https://ejemplo.com/mapa',
        },
      },
    });
    expect(mapaMalo.status).toBe(400);
    expect(mapaMalo.body.error.detalles[0].campo).toBe('detalle.lugar.enlaceMapa');

    // Campo extra en strictObject
    const extra = await como('secretaria').patch(`${RUTA}/${id}/detalle`, {
      contrayente1: 'No permitido',
    });
    expect(extra.status).toBe(400);
  });

  it('permisos de PATCH .../detalle: Marketing 200, sin sesión 401, otra sede 403', async () => {
    const creada = await como('secretaria').post(RUTA, proclama());
    const id = creada.body.datos.id;

    expect((await como().patch(`${RUTA}/${id}/detalle`, { imagenId: imgSede.id })).status).toBe(
      401,
    );
    expect(
      (await como('secretariaAjena').patch(`${RUTA}/${id}/detalle`, { imagenId: imgSede.id }))
        .status,
    ).toBe(403);
    expect((await como('marketing').patch(`${RUTA}/${id}`, { contrayente1: 'Otro' })).status).toBe(
      403,
    );

    const resMkt = await como('marketing').patch(`${RUTA}/${id}/detalle`, {
      imagenId: imgSede.id,
      detalle: {
        contenido: {
          formato: 'blocknote',
          version: 1,
          bloques: [bloqueParrafo('Editado por MKT')],
        },
        galeria: [imgSede.id],
        lugar: null,
      },
    });
    expect(resMkt.status, JSON.stringify(resMkt.body)).toBe(200);
    expect(resMkt.body.datos.imagenId).toBe(imgSede.id);
    expect(resMkt.body.datos.detalle.lugar).toBeNull();

    const registros = await registrosDe('proclama', id);
    expect(registros.length).toBeGreaterThanOrEqual(2);
  });
});

describe('detalle de proclamas (público)', () => {
  it('GET /proclamas/:id devuelve detalle si es visible, 404 si no es visible o de otra sede, y la lista omite detalle', async () => {
    const visibleRes = await como('secretaria').post(
      RUTA,
      proclama({
        publicaciones: [{ fecha: '2020-10-25' }],
        imagenId: imgSede.id,
        detalle: {
          contenido: {
            formato: 'blocknote',
            version: 1,
            bloques: [bloqueParrafo('Detalle público')],
          },
          galeria: [imgSede.id, videoSede.id],
          lugar: {
            templo: 'Capilla Externa',
            direccion: 'Calle 1',
            enlaceMapa: 'https://maps.app.goo.gl/abc',
          },
        },
      }),
    );
    expect(visibleRes.status).toBe(201);
    const visibleId = visibleRes.body.datos.id;

    const ocultaRes = await como('secretaria').post(
      RUTA,
      proclama({
        publicaciones: [{ fecha: '2032-10-25' }],
        imagenId: imgSede.id,
      }),
    );
    expect(ocultaRes.status).toBe(201);
    const ocultaId = ocultaRes.body.datos.id;

    // Lista pública incluye tieneDetalle e imagen, sin detalle ni galeria.
    const listaRes = await como().get(`/api/sedes/${sede.slug}/proclamas`);
    expect(listaRes.status).toBe(200);
    const item = listaRes.body.datos.find((p) => p.id === visibleId);
    expect(item).toBeDefined();
    expect(item.tieneDetalle).toBe(true);
    expect(item.imagen).toMatchObject({
      id: imgSede.id,
      url: `https://cdn.ejemplo.test/${imgSede.url}`,
      textoAlternativo: 'Foto de los novios',
    });
    expect(item).not.toHaveProperty('detalle');
    expect(item).not.toHaveProperty('galeria');

    // Detalle público 200 y coincide con el contrato.
    const ejemplo = ejemploDelContrato('## `GET /api/sedes/:sede/proclamas/:id`').datos;
    const detRes = await como().get(`/api/sedes/${sede.slug}/proclamas/${visibleId}`);
    expect(detRes.status).toBe(200);
    expect(Object.keys(detRes.body.datos)).toEqual(Object.keys(ejemplo));
    expect(detRes.body.datos.galeria).toHaveLength(2);
    expect(detRes.body.datos.galeria[0]).toMatchObject({
      id: imgSede.id,
      url: `https://cdn.ejemplo.test/${imgSede.url}`,
      tipoMime: 'image/webp',
      textoAlternativo: 'Foto de los novios',
    });
    expect(detRes.body.datos.galeria[0].variantes.length).toBeGreaterThan(0);
    expect(detRes.body.datos.galeria[1]).toMatchObject({
      id: videoSede.id,
      tipoMime: 'video/mp4',
      variantes: [],
    });

    // No visible -> 404
    expect((await como().get(`/api/sedes/${sede.slug}/proclamas/${ocultaId}`)).status).toBe(404);
    // Otra sede -> 404
    expect((await como().get(`/api/sedes/${sedeAjena.slug}/proclamas/${visibleId}`)).status).toBe(
      404,
    );
  });
});
