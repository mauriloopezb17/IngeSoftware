// Bitácora contra la aplicación real y PostgreSQL: qué se registra (y qué no) y la consulta
// GET /api/admin/bitacora. El almacenamiento es simulado (aws-sdk-client-mock): nunca se llama al OCI real.
import { randomUUID } from 'node:crypto';
import { DeleteObjectsCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ejemploDelContrato } from '../apoyo/contrato.js';
import { limpiarContadoresDeIntentos } from '../apoyo/limite.js';
import {
  CONTRASENA_DE_PRUEBA,
  borrarUsuariosDePrueba,
  crearUsuarioDePrueba,
} from '../apoyo/usuarios.js';

vi.stubEnv('OCI_S3_ENDPOINT', 'https://espacio.compat.objectstorage.sa-santiago-1.oraclecloud.com');
vi.stubEnv('OCI_S3_REGION', 'sa-santiago-1');
vi.stubEnv('OCI_S3_BUCKET_NAME', 'bucket-de-prueba');
vi.stubEnv('OCI_S3_ACCESS_KEY_ID', 'clave-de-acceso-de-prueba');
vi.stubEnv('OCI_S3_SECRET_ACCESS_KEY', 'secreto-oci-de-prueba');
vi.stubEnv('CDN_PUBLIC_URL', 'https://cdn.ejemplo.test');

const { createApp } = await import('../../src/app.js');
const { consultar, cerrarPool, transaccion } = await import('../../src/db/index.js');
const { cerrarRedis } = await import('../../src/db/redis.js');
const { cerrarClienteS3 } = await import('../../src/storage/oci.js');
const { crearAdministrador } = await import('../../src/services/usuarios.service.js');

const app = createApp();
const s3 = mockClient(S3Client);

const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
const sesiones = {};
const usuarios = {};
let sedeAjena;
const correosAdmin = [];

async function iniciarSesion(usuario) {
  const respuesta = await request(app)
    .post('/api/auth/login')
    .send({ correo: usuario.correo, contrasena: usuario.contrasena });
  return respuesta.headers['set-cookie'][0].split(';')[0];
}

async function usuarioConSesion(nombre, opciones) {
  usuarios[nombre] = await crearUsuarioDePrueba(opciones);
  sesiones[nombre] = await iniciarSesion(usuarios[nombre]);
}

async function subirPdf(quien, nombre = 'prueba-bitacora.pdf') {
  const respuesta = await request(app)
    .post('/api/admin/multimedia')
    .set('Cookie', sesiones[quien])
    .attach('archivo', PDF, { filename: nombre, contentType: 'application/pdf' });
  expect(respuesta.status).toBe(201);
  return respuesta.body.datos;
}

// Registros de bitácora de un recurso, del más antiguo al más nuevo.
async function registrosDe(entidad, entidadId) {
  const { rows } = await consultar(
    `SELECT usuario_id, accion, datos_anteriores, datos_nuevos, host(direccion_ip) AS ip
       FROM bitacora_cambio WHERE entidad = $1 AND entidad_id = $2 ORDER BY id`,
    [entidad, String(entidadId)],
  );
  return rows;
}

const consultarBitacora = (quien, consulta = '') =>
  request(app).get(`/api/admin/bitacora?${consulta}`).set('Cookie', sesiones[quien]);

beforeAll(async () => {
  await limpiarContadoresDeIntentos();
  const { rows } = await consultar(
    `INSERT INTO sede (tipo_sede_id, nombre, slug)
     VALUES ((SELECT id FROM tipo_sede ORDER BY id LIMIT 1), 'prueba-sede bitácora', $1)
     RETURNING id, slug`,
    [`prueba-${randomUUID()}`.slice(0, 40)],
  );
  sedeAjena = rows[0];

  await usuarioConSesion('admin', { rol: 'ADMINISTRADOR', sede: null });
  await usuarioConSesion('parroco', { rol: 'PARROCO' });
  await usuarioConSesion('marketing', { rol: 'MARKETING' });
  await usuarioConSesion('secretaria', { rol: 'SECRETARIA' });
  await usuarioConSesion('parrocoAjeno', { rol: 'PARROCO', sede: sedeAjena.slug });
  await usuarioConSesion('ajeno', { rol: 'SECRETARIA', sede: sedeAjena.slug });
});

beforeEach(() => {
  s3.reset();
  s3.on(PutObjectCommand).resolves({});
  s3.on(DeleteObjectsCommand).resolves({});
});

afterAll(async () => {
  await consultar(
    `DELETE FROM bitacora_cambio
      WHERE entidad = 'usuario'
        AND entidad_id IN (SELECT id::text FROM usuario WHERE correo = ANY($1))`,
    [correosAdmin],
  );
  await consultar('DELETE FROM usuario WHERE correo = ANY($1)', [correosAdmin]);
  await consultar("DELETE FROM archivo_multimedia WHERE nombre_original LIKE 'prueba%'");
  await limpiarContadoresDeIntentos();
  await borrarUsuariosDePrueba();
  await consultar('DELETE FROM sede WHERE id = $1', [sedeAjena.id]);
  cerrarClienteS3();
  await cerrarPool();
  await cerrarRedis();
});

describe('qué se registra', () => {
  it('el inicio de sesión no se registra', async () => {
    const usuario = await crearUsuarioDePrueba();
    await iniciarSesion(usuario);

    const { rows } = await consultar(
      'SELECT count(*)::int AS n FROM bitacora_cambio WHERE usuario_id = $1',
      [usuario.id],
    );
    expect(rows[0].n).toBe(0);
  });

  it('el cambio de contraseña se registra con el valor oculto, el usuario y la IP', async () => {
    const usuario = await crearUsuarioDePrueba();
    const cookie = await iniciarSesion(usuario);

    const respuesta = await request(app)
      .post('/api/auth/cambiar-contrasena')
      .set('Cookie', cookie)
      .send({ contrasenaActual: CONTRASENA_DE_PRUEBA, contrasenaNueva: 'Otra-Clave-Segura-2026' });

    expect(respuesta.status).toBe(204);
    const registros = await registrosDe('usuario', usuario.id);
    expect(registros).toEqual([
      {
        usuario_id: usuario.id,
        accion: 'UPDATE',
        datos_anteriores: { hash_contrasena: '[oculto]' },
        datos_nuevos: { hash_contrasena: '[oculto]' },
        ip: expect.stringMatching(/^(127\.0\.0\.1|::1)$/),
      },
    ]);
    expect(JSON.stringify(registros)).not.toContain('$argon2');
  });

  it('un cambio de contraseña rechazado no se registra', async () => {
    const usuario = await crearUsuarioDePrueba();
    const cookie = await iniciarSesion(usuario);

    const respuesta = await request(app)
      .post('/api/auth/cambiar-contrasena')
      .set('Cookie', cookie)
      .send({
        contrasenaActual: 'No-Es-La-Actual-2026',
        contrasenaNueva: 'Otra-Clave-Segura-2026',
      });

    expect(respuesta.status).toBe(400);
    expect(await registrosDe('usuario', usuario.id)).toEqual([]);
  });

  it('crear un administrador (script crear-admin) se registra sin usuario ni IP', async () => {
    const correo = `prueba-${randomUUID()}@parroquia.test`;
    correosAdmin.push(correo);

    const creado = await transaccion((db) =>
      crearAdministrador(
        { correo, nombreCompleto: 'Admin de prueba', contrasena: 'Clave-Segura-Admin-2026' },
        db,
      ),
    );

    const [registro] = await registrosDe('usuario', creado.id);
    expect(registro).toMatchObject({ usuario_id: null, accion: 'INSERT', ip: null });
    expect(registro.datos_anteriores).toBeNull();
    expect(registro.datos_nuevos).toMatchObject({
      id: creado.id,
      correo,
      sede_id: null,
      hash_contrasena: '[oculto]',
    });
  });

  it('si la creación falla (correo repetido), no queda registro', async () => {
    const correo = `prueba-${randomUUID()}@parroquia.test`;
    correosAdmin.push(correo);
    const datos = { correo, nombreCompleto: 'Admin', contrasena: 'Clave-Segura-Admin-2026' };
    const creado = await transaccion((db) => crearAdministrador(datos, db));

    await expect(transaccion((db) => crearAdministrador(datos, db))).rejects.toMatchObject({
      codigo: 'CONFLICTO',
    });
    expect(await registrosDe('usuario', creado.id)).toHaveLength(1);
  });

  it('multimedia: subir (INSERT), editar (UPDATE, solo lo que cambió) y eliminar (DELETE)', async () => {
    const archivo = await subirPdf('marketing');

    const editar = (texto) =>
      request(app)
        .patch(`/api/admin/multimedia/${archivo.id}`)
        .set('Cookie', sesiones.marketing)
        .send({ textoAlternativo: texto });
    expect((await editar('Boletín de noviembre')).status).toBe(200);
    // Un PATCH que no cambia nada no se registra.
    expect((await editar('Boletín de noviembre')).status).toBe(200);
    expect(
      (
        await request(app)
          .delete(`/api/admin/multimedia/${archivo.id}`)
          .set('Cookie', sesiones.marketing)
      ).status,
    ).toBe(204);

    const [alta, cambio, baja, ...resto] = await registrosDe('archivo_multimedia', archivo.id);
    expect(resto).toEqual([]);

    expect(alta).toMatchObject({ usuario_id: usuarios.marketing.id, accion: 'INSERT' });
    expect(alta.datos_anteriores).toBeNull();
    expect(alta.datos_nuevos).toMatchObject({
      id: archivo.id,
      sede_id: 1,
      subido_por: usuarios.marketing.id,
      nombre_original: 'prueba-bitacora.pdf',
      tipo_mime: 'application/pdf',
      tamano_bytes: PDF.length,
      texto_alternativo: null,
    });
    expect(alta.datos_nuevos.url).toMatch(/^sedes\/.+\.pdf$/);
    expect(alta.datos_nuevos.fecha_subida).toMatch(/-04:00$/);

    expect(cambio).toMatchObject({
      accion: 'UPDATE',
      datos_anteriores: { texto_alternativo: null },
      datos_nuevos: { texto_alternativo: 'Boletín de noviembre' },
    });

    expect(baja).toMatchObject({ accion: 'DELETE', datos_nuevos: null });
    expect(baja.datos_anteriores).toMatchObject({
      id: archivo.id,
      texto_alternativo: 'Boletín de noviembre',
    });
  });

  it('si el bucket falla al eliminar, se deshacen el borrado y su registro', async () => {
    const archivo = await subirPdf('marketing');
    s3.reset();
    s3.on(DeleteObjectsCommand).rejects(new Error('bucket caído'));

    const respuesta = await request(app)
      .delete(`/api/admin/multimedia/${archivo.id}`)
      .set('Cookie', sesiones.marketing);

    expect(respuesta.status).toBe(503);
    expect((await registrosDe('archivo_multimedia', archivo.id)).map((r) => r.accion)).toEqual([
      'INSERT',
    ]);
  });

  it('si el bucket falla al subir, no se registra nada', async () => {
    s3.reset();
    s3.on(PutObjectCommand).rejects(new Error('bucket caído'));
    const { rows: antes } = await consultar('SELECT count(*)::int AS n FROM bitacora_cambio');

    const respuesta = await request(app)
      .post('/api/admin/multimedia')
      .set('Cookie', sesiones.marketing)
      .attach('archivo', PDF, { filename: 'prueba-falla.pdf', contentType: 'application/pdf' });

    expect(respuesta.status).toBe(503);
    const { rows: despues } = await consultar('SELECT count(*)::int AS n FROM bitacora_cambio');
    expect(despues[0].n).toBe(antes[0].n);
  });
});

describe('GET /api/admin/bitacora', () => {
  let dePrincipal;
  let deAjena;

  beforeAll(async () => {
    // beforeAll corre antes del beforeEach: se deja el almacenamiento simulado funcionando.
    s3.reset();
    s3.on(PutObjectCommand).resolves({});
    dePrincipal = await subirPdf('marketing', 'prueba-principal.pdf');
    deAjena = await subirPdf('ajeno', 'prueba-ajena.pdf');
  });

  it('devuelve los cambios con la forma del contrato, los más recientes primero', async () => {
    const [ejemplo] = ejemploDelContrato('## 13. Bitácora', 0, 'admin.md').datos;

    const respuesta = await consultarBitacora('admin', 'porPagina=50');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.paginacion).toMatchObject({ pagina: 1, porPagina: 50 });
    for (const cambio of respuesta.body.datos) {
      expect(Object.keys(cambio)).toEqual(Object.keys(ejemplo));
    }
    const fechas = respuesta.body.datos.map((cambio) => cambio.fecha);
    expect(fechas).toEqual([...fechas].sort().reverse());

    const alta = respuesta.body.datos.find(
      (c) => c.entidad === 'archivo_multimedia' && c.entidadId === String(dePrincipal.id),
    );
    expect(alta).toMatchObject({
      usuario: { id: usuarios.marketing.id, nombreCompleto: 'Usuario de prueba (MARKETING)' },
      accion: 'INSERT',
      datosAnteriores: null,
      direccionIp: expect.stringMatching(/^(127\.0\.0\.1|::1)$/),
      fecha: expect.stringMatching(/-04:00$/),
    });
  });

  it('filtra por entidad, entidadId, usuario y acción', async () => {
    const porRecurso = await consultarBitacora(
      'admin',
      `entidad=archivo_multimedia&entidadId=${dePrincipal.id}`,
    );
    expect(porRecurso.body.datos.map((c) => c.accion)).toEqual(['INSERT']);

    const porUsuario = await consultarBitacora(
      'admin',
      `usuario=${usuarios.ajeno.id}&porPagina=50`,
    );
    expect(porUsuario.body.datos.length).toBeGreaterThan(0);
    expect(porUsuario.body.datos.every((c) => c.usuario.id === usuarios.ajeno.id)).toBe(true);

    const borrados = await consultarBitacora('admin', 'accion=DELETE&porPagina=50');
    expect(borrados.body.datos.every((c) => c.accion === 'DELETE')).toBe(true);
  });

  it('filtra por fechas (días completos, ambos incluidos)', async () => {
    const hoy = new Date(Date.now() - 4 * 3600 * 1000).toISOString().slice(0, 10);
    const filtro = `entidad=archivo_multimedia&entidadId=${dePrincipal.id}`;

    const deHoy = await consultarBitacora('admin', `${filtro}&desde=${hoy}&hasta=${hoy}`);
    expect(deHoy.body.datos).toHaveLength(1);

    const futuro = await consultarBitacora('admin', `${filtro}&desde=2099-01-01`);
    expect(futuro.body.datos).toEqual([]);
    expect(futuro.body.paginacion.total).toBe(0);
  });

  it('el Párroco solo ve los cambios de su sede', async () => {
    const propios = await consultarBitacora('parroco', 'entidad=archivo_multimedia&porPagina=50');
    const ids = propios.body.datos.map((c) => c.entidadId);
    expect(propios.status).toBe(200);
    expect(ids).toContain(String(dePrincipal.id));
    expect(ids).not.toContain(String(deAjena.id));

    const ajenos = await consultarBitacora(
      'parrocoAjeno',
      'entidad=archivo_multimedia&porPagina=50',
    );
    expect(ajenos.body.datos.map((c) => c.entidadId)).toEqual([String(deAjena.id)]);
  });

  it('el Párroco ve el cambio de un registro cuya creación no está en la bitácora', async () => {
    // Un archivo "del seed": se inserta sin pasar por la API, así que no tiene INSERT registrado.
    const { rows } = await consultar(
      `INSERT INTO archivo_multimedia (sede_id, subido_por, nombre_original, url, tipo_mime, tamano_bytes)
       VALUES ($1, $2, 'prueba-sin-alta', $3, 'application/pdf', 10) RETURNING id`,
      [sedeAjena.id, usuarios.ajeno.id, `sedes/prueba/${randomUUID()}.pdf`],
    );
    const id = rows[0].id;
    await request(app)
      .patch(`/api/admin/multimedia/${id}`)
      .set('Cookie', sesiones.admin)
      .send({ textoAlternativo: 'Ahora con texto' });

    const filtro = `entidad=archivo_multimedia&entidadId=${id}`;
    expect((await consultarBitacora('parrocoAjeno', filtro)).body.datos).toHaveLength(1);
    expect((await consultarBitacora('parroco', filtro)).body.datos).toEqual([]);
  });

  it('Secretaría y Marketing no tienen acceso; sin sesión, 401', async () => {
    for (const quien of ['secretaria', 'marketing']) {
      const respuesta = await consultarBitacora(quien);
      expect(respuesta.status).toBe(403);
      expect(respuesta.body.error.codigo).toBe('SIN_PERMISO');
    }
    expect((await request(app).get('/api/admin/bitacora')).status).toBe(401);
  });

  it('valida los filtros', async () => {
    const accion = await consultarBitacora('admin', 'accion=BORRAR');
    expect(accion.status).toBe(400);
    expect(accion.body.error.detalles[0].campo).toBe('query.accion');

    const rango = await consultarBitacora('admin', 'desde=2026-11-10&hasta=2026-11-01');
    expect(rango.status).toBe(400);
    expect(rango.body.error.detalles).toEqual([
      { campo: 'query.hasta', mensaje: 'Debe ser igual o posterior a desde.' },
    ]);

    expect((await consultarBitacora('admin', 'entidad=Robert%27);DROP')).status).toBe(400);
    expect((await consultarBitacora('admin', 'usuario=abc')).status).toBe(400);
  });

  it('pagina', async () => {
    const primera = await consultarBitacora('admin', 'porPagina=1');
    const segunda = await consultarBitacora('admin', 'porPagina=1&pagina=2');

    expect(primera.body.datos).toHaveLength(1);
    expect(segunda.body.datos).toHaveLength(1);
    expect(segunda.body.datos[0].id).not.toBe(primera.body.datos[0].id);
    expect(primera.body.paginacion.total).toBeGreaterThanOrEqual(2);
  });
});
