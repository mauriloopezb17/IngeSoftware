// Cliente de almacenamiento con S3 simulado (aws-sdk-client-mock): estas pruebas nunca llaman al OCI real.
import { Readable } from 'node:stream';
import {
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectsCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const OCI = {
  OCI_S3_ENDPOINT: 'https://espacio.compat.objectstorage.sa-santiago-1.oraclecloud.com',
  OCI_S3_REGION: 'sa-santiago-1',
  OCI_S3_BUCKET_NAME: 'bucket-de-prueba',
  OCI_S3_ACCESS_KEY_ID: 'clave-de-acceso-de-prueba',
  OCI_S3_SECRET_ACCESS_KEY: 'secreto-oci-de-prueba',
};
const CDN = 'https://cdn.ejemplo.test/';

const s3 = mockClient(S3Client);

// Carga el módulo con un entorno nuevo (el entorno y el cliente se guardan en memoria).
async function cargar(variables) {
  vi.resetModules();
  vi.unstubAllEnvs();
  for (const nombre of [...Object.keys(OCI), 'CDN_PUBLIC_URL']) vi.stubEnv(nombre, '');
  for (const [nombre, valor] of Object.entries(variables)) vi.stubEnv(nombre, valor);
  return import('../../src/storage/oci.js');
}

beforeEach(() => s3.reset());
afterEach(() => vi.unstubAllEnvs());

describe('almacenamientoConfigurado', () => {
  it('es true con credenciales de OCI y URL del CDN', async () => {
    const { almacenamientoConfigurado } = await cargar({ ...OCI, CDN_PUBLIC_URL: CDN });
    expect(almacenamientoConfigurado()).toBe(true);
  });

  it('es false sin credenciales', async () => {
    const { almacenamientoConfigurado } = await cargar({ CDN_PUBLIC_URL: CDN });
    expect(almacenamientoConfigurado()).toBe(false);
  });

  it('es false con credenciales pero sin URL del CDN', async () => {
    const { almacenamientoConfigurado } = await cargar(OCI);
    expect(almacenamientoConfigurado()).toBe(false);
  });
});

describe('sin configuración', () => {
  it('subir y eliminar responden 503 y no tocan S3', async () => {
    const { subirObjeto, eliminarObjetos } = await cargar({});

    await expect(
      subirObjeto({ clave: 'a.webp', cuerpo: Buffer.from('x'), tamano: 1 }),
    ).rejects.toMatchObject({ codigo: 'SERVICIO_NO_DISPONIBLE', estado: 503 });
    await expect(eliminarObjetos(['a.webp'])).rejects.toMatchObject({ estado: 503 });
    expect(s3.calls()).toHaveLength(0);
  });

  it('eliminar sin claves no hace nada, ni siquiera exige configuración', async () => {
    const { eliminarObjetos } = await cargar({});
    await expect(eliminarObjetos([])).resolves.toBeUndefined();
  });
});

describe('cliente S3', () => {
  it('se crea una sola vez, con path style y checksums solo cuando la operación los exige', async () => {
    const { obtenerClienteS3, cerrarClienteS3 } = await cargar({ ...OCI, CDN_PUBLIC_URL: CDN });
    const cliente = obtenerClienteS3();

    expect(obtenerClienteS3()).toBe(cliente);
    expect(cliente.config.forcePathStyle).toBe(true);
    expect(await cliente.config.requestChecksumCalculation()).toBe('WHEN_REQUIRED');
    expect(await cliente.config.responseChecksumValidation()).toBe('WHEN_REQUIRED');
    expect(await cliente.config.region()).toBe('sa-santiago-1');

    cerrarClienteS3();
    expect(obtenerClienteS3()).not.toBe(cliente);
  });
});

describe('subirObjeto', () => {
  it('un archivo chico va en un solo PutObject con su tipo, largo y caché', async () => {
    const { subirObjeto } = await cargar({ ...OCI, CDN_PUBLIC_URL: CDN });
    s3.on(PutObjectCommand).resolves({});

    await subirObjeto({
      clave: 'sedes/central/2026/11/foto.webp',
      cuerpo: Readable.from([Buffer.from('abc')]),
      tipoContenido: 'image/webp',
      tamano: 3,
    });

    const llamadas = s3.commandCalls(PutObjectCommand);
    expect(llamadas).toHaveLength(1);
    expect(llamadas[0].args[0].input).toMatchObject({
      Bucket: 'bucket-de-prueba',
      Key: 'sedes/central/2026/11/foto.webp',
      ContentType: 'image/webp',
      ContentLength: 3,
      CacheControl: 'public, max-age=31536000, immutable',
    });
  });

  it('un archivo grande se sube por partes', async () => {
    const { subirObjeto, UMBRAL_SUBIDA_POR_PARTES_BYTES } = await cargar({
      ...OCI,
      CDN_PUBLIC_URL: CDN,
    });
    s3.on(CreateMultipartUploadCommand).resolves({ UploadId: 'u1' });
    s3.on(UploadPartCommand).resolves({ ETag: '"e"' });
    s3.on(CompleteMultipartUploadCommand).resolves({});

    const tamano = UMBRAL_SUBIDA_POR_PARTES_BYTES + 1;
    await subirObjeto({
      clave: 'sedes/central/2026/11/video.mp4',
      cuerpo: Readable.from([Buffer.alloc(tamano)]),
      tipoContenido: 'video/mp4',
      tamano,
    });

    expect(s3.commandCalls(PutObjectCommand)).toHaveLength(0);
    expect(s3.commandCalls(CreateMultipartUploadCommand)[0].args[0].input).toMatchObject({
      Bucket: 'bucket-de-prueba',
      Key: 'sedes/central/2026/11/video.mp4',
      ContentType: 'video/mp4',
    });
    expect(s3.commandCalls(UploadPartCommand).length).toBeGreaterThan(1);
    expect(s3.commandCalls(CompleteMultipartUploadCommand)).toHaveLength(1);
  });

  it('un fallo del SDK sale como 503 sin filtrar el detalle ni las credenciales', async () => {
    const { subirObjeto } = await cargar({ ...OCI, CDN_PUBLIC_URL: CDN });
    s3.on(PutObjectCommand).rejects(
      Object.assign(new Error('AccessDenied con clave-de-acceso-de-prueba'), {
        name: 'AccessDenied',
      }),
    );

    const error = await subirObjeto({
      clave: 'a.webp',
      cuerpo: Buffer.from('x'),
      tipoContenido: 'image/webp',
      tamano: 1,
    }).catch((e) => e);

    expect(error).toMatchObject({ codigo: 'SERVICIO_NO_DISPONIBLE', estado: 503 });
    expect(JSON.stringify(error.aRespuesta())).not.toMatch(
      /AccessDenied|clave-de-acceso|secreto-oci/,
    );
  });
});

describe('eliminarObjetos', () => {
  it('agrupa las claves de a 1000', async () => {
    const { eliminarObjetos } = await cargar({ ...OCI, CDN_PUBLIC_URL: CDN });
    s3.on(DeleteObjectsCommand).resolves({});

    await eliminarObjetos(Array.from({ length: 2500 }, (_, i) => `k${i}.webp`));

    const lotes = s3.commandCalls(DeleteObjectsCommand).map((c) => c.args[0].input.Delete.Objects);
    expect(lotes.map((l) => l.length)).toEqual([1000, 1000, 500]);
    expect(lotes[0][0]).toEqual({ Key: 'k0.webp' });
  });

  it('si el bucket informa errores por clave, es un 503', async () => {
    const { eliminarObjetos } = await cargar({ ...OCI, CDN_PUBLIC_URL: CDN });
    s3.on(DeleteObjectsCommand).resolves({ Errors: [{ Key: 'a', Code: 'AccessDenied' }] });

    await expect(eliminarObjetos(['a'])).rejects.toMatchObject({ estado: 503 });
  });

  it('una caída de la red es un 503', async () => {
    const { eliminarObjetos } = await cargar({ ...OCI, CDN_PUBLIC_URL: CDN });
    s3.on(DeleteObjectsCommand).rejects(new Error('ECONNRESET'));

    await expect(eliminarObjetos(['a'])).rejects.toMatchObject({ estado: 503 });
  });
});

describe('urlPublica', () => {
  it('une el CDN y la clave sin duplicar barras', async () => {
    const { urlPublica } = await cargar({ ...OCI, CDN_PUBLIC_URL: CDN });
    expect(urlPublica('sedes/central/a.webp')).toBe(
      'https://cdn.ejemplo.test/sedes/central/a.webp',
    );
    expect(urlPublica('/sedes/central/a.webp')).toBe(
      'https://cdn.ejemplo.test/sedes/central/a.webp',
    );
  });

  it('sin CDN configurado es un 503', async () => {
    const { urlPublica } = await cargar({});
    expect(() => urlPublica('a.webp')).toThrow(expect.objectContaining({ estado: 503 }));
  });
});
