// La portada de un boletín marca su imagen como "en uso": borrarla de la biblioteca responde 409
// con la descripción del uso (antes faltaba la descripción y respondía 500).
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { crearPanel, sedePrincipal } from '../apoyo/panel.js';

// Credenciales ficticias: sin ellas el borrado responde 503 antes de revisar los usos.
vi.stubEnv('OCI_S3_ENDPOINT', 'https://espacio.compat.objectstorage.sa-santiago-1.oraclecloud.com');
vi.stubEnv('OCI_S3_REGION', 'sa-santiago-1');
vi.stubEnv('OCI_S3_BUCKET_NAME', 'bucket-de-prueba');
vi.stubEnv('OCI_S3_ACCESS_KEY_ID', 'clave-de-acceso-de-prueba');
vi.stubEnv('OCI_S3_SECRET_ACCESS_KEY', 'secreto-oci-de-prueba');
vi.stubEnv('CDN_PUBLIC_URL', 'https://cdn.ejemplo.test');

const { createApp } = await import('../../src/app.js');
const { consultar, cerrarPool } = await import('../../src/db/index.js');
const { cerrarRedis } = await import('../../src/db/redis.js');

const app = createApp();
const panel = crearPanel(app);
const { como, usuarios } = panel;

const PREFIJO = `Prueba portada ${Date.now()}`;
let sede;
let pdf;
let imagen;

beforeAll(async () => {
  sede = await sedePrincipal();
  await panel.conSesion('secretaria', { rol: 'SECRETARIA' });
  pdf = await panel.crearArchivo({
    sedeId: sede.id,
    subidoPor: usuarios.secretaria.id,
    tipoMime: 'application/pdf',
    clave: `sedes/${sede.slug}/2026/11/7a2b3c4d-5e6f-4a1b-8c2d-${String(Date.now()).slice(-12)}.pdf`,
  });
  imagen = await panel.crearArchivo({
    sedeId: sede.id,
    subidoPor: usuarios.secretaria.id,
    tipoMime: 'image/webp',
  });
});

afterAll(async () => {
  await panel.limpiar(async () => {
    await consultar('DELETE FROM boletin WHERE titulo LIKE $1', [`${PREFIJO}%`]);
  });
  await cerrarPool();
  await cerrarRedis();
});

describe('portada del boletín en la biblioteca', () => {
  it('no deja borrar la imagen usada como portada y explica dónde se usa', async () => {
    const titulo = `${PREFIJO} boletín`;
    const creado = await como('secretaria').post('/api/admin/boletines', {
      titulo,
      periodo: '2091-03',
      archivoId: pdf.id,
      portadaId: imagen.id,
    });
    expect(creado.status, JSON.stringify(creado.body)).toBe(201);

    const intento = await como('secretaria').delete(`/api/admin/multimedia/${imagen.id}`);
    expect(intento.status).toBe(409);
    expect(intento.body.error.detalles).toEqual([
      { campo: 'id', mensaje: `Usado como portada del boletín «${titulo}».` },
    ]);
  });
});
