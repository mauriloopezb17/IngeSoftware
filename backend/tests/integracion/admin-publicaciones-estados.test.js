// Flujo de estados de las publicaciones (estados-publicacion.md): enviar a revisión, aprobar,
// rechazar, publicar, programar, archivar y restaurar, con la matriz completa rol × acción.
// Cada prueba crea sus propios datos y al final se borran.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { crearPanel, registrosDe, sedePrincipal } from '../apoyo/panel.js';

const { createApp } = await import('../../src/app.js');
const { consultar, cerrarPool } = await import('../../src/db/index.js');
const { cerrarRedis } = await import('../../src/db/redis.js');

const app = createApp();
const panel = crearPanel(app);
const { como, usuarios } = panel;

const RUTA = '/api/admin/publicaciones';
const PREFIJO = `Prueba estados ${Date.now()}`;
const parrafo = (texto) => ({
  id: 'p1',
  type: 'paragraph',
  props: {},
  content: [{ type: 'text', text: texto, styles: {} }],
  children: [],
});
const documento = (...bloques) => ({ formato: 'blocknote', version: 1, bloques });

let sede;
let sedeAjena;
let contador = 0;

// Crea una publicación por la API (en BORRADOR) y, si se pide, la deja en otro estado.
async function crear(quien, { tipo = 'NOTICIA', estado = 'Borrador', ...extra } = {}) {
  const respuesta = await como(quien).post(RUTA, {
    tipo,
    titulo: `${PREFIJO} ${++contador}`,
    contenido: documento(parrafo('Texto.')),
    ...extra,
  });
  expect(respuesta.status, JSON.stringify(respuesta.body)).toBe(201);
  const { id } = respuesta.body.datos;
  if (estado !== 'Borrador') await ponerEstado(id, estado);
  return respuesta.body.datos;
}

const ponerEstado = (id, nombre) =>
  consultar(
    `UPDATE publicacion SET estado_publicacion_id = (SELECT id FROM estado_publicacion WHERE nombre = $2)
      WHERE id = $1`,
    [id, nombre],
  );

const accionar = (quien, id, accion, cuerpo) => como(quien).post(`${RUTA}/${id}/${accion}`, cuerpo);
const mas = (dias) => new Date(Date.now() + dias * 86_400_000).toISOString();

beforeAll(async () => {
  sede = await sedePrincipal();
  sedeAjena = await panel.crearSede();
  await panel.conSesion('admin', { rol: 'ADMINISTRADOR', sede: null });
  await panel.conSesion('adminSede', { rol: 'ADMINISTRADOR' });
  await panel.conSesion('parroco', { rol: 'PARROCO' });
  await panel.conSesion('secretaria', { rol: 'SECRETARIA' });
  await panel.conSesion('marketing', { rol: 'MARKETING' });
  await panel.conSesion('marketing2', { rol: 'MARKETING' });
  await panel.conSesion('parrocoAjeno', { rol: 'PARROCO', sede: sedeAjena.slug });
});

afterAll(async () => {
  await panel.limpiar(() =>
    consultar('DELETE FROM publicacion WHERE titulo LIKE $1', [`${PREFIJO}%`]),
  );
  await cerrarPool();
  await cerrarRedis();
});

// Estado de origen de cada acción y estado al que lleva.
const ACCIONES = {
  'enviar-revision': { origen: 'Borrador', destino: 'EN_REVISION' },
  aprobar: { origen: 'En revisión', destino: 'PUBLICADO' },
  rechazar: {
    origen: 'En revisión',
    destino: 'BORRADOR',
    cuerpo: { observacion: 'Falta corregir.' },
  },
  publicar: { origen: 'Borrador', destino: 'PUBLICADO' },
  archivar: { origen: 'Publicado', destino: 'ARCHIVADO' },
  restaurar: { origen: 'Archivado', destino: 'BORRADOR' },
};

describe('matriz rol × acción sobre una noticia de Marketing', () => {
  // Esperado por rol. enviar-revision: solo el autor (Marketing); Administrador y Párroco tienen
  // noticias.redactar pero no son el autor (403). Las demás: solo noticias.publicar.
  const ESPERADO = {
    'enviar-revision': {
      admin: 403,
      parroco: 403,
      secretaria: 403,
      marketing: 200,
      marketing2: 403,
    },
    aprobar: { admin: 200, parroco: 200, secretaria: 403, marketing: 403, marketing2: 403 },
    rechazar: { admin: 200, parroco: 200, secretaria: 403, marketing: 403, marketing2: 403 },
    publicar: { admin: 200, parroco: 200, secretaria: 403, marketing: 403, marketing2: 403 },
    archivar: { admin: 200, parroco: 200, secretaria: 403, marketing: 403, marketing2: 403 },
    restaurar: { admin: 200, parroco: 200, secretaria: 403, marketing: 403, marketing2: 403 },
  };

  const casos = Object.entries(ESPERADO).flatMap(([accion, porRol]) =>
    Object.entries(porRol).map(([rol, estado]) => [accion, rol, estado]),
  );

  it.each(casos)('%s como %s responde %i', async (accion, rol, esperado) => {
    const { origen, destino, cuerpo } = ACCIONES[accion];
    const publicacion = await crear('marketing', { estado: origen });

    const respuesta = await accionar(rol, publicacion.id, accion, cuerpo);

    expect(respuesta.status, JSON.stringify(respuesta.body)).toBe(esperado);
    if (esperado === 200) expect(respuesta.body.datos.estado.codigo).toBe(destino);
    if (esperado === 403) {
      expect(respuesta.body.error.codigo).toBe('SIN_PERMISO');
      const { rows } = await consultar(
        'SELECT ep.nombre FROM publicacion p JOIN estado_publicacion ep ON ep.id = p.estado_publicacion_id WHERE p.id = $1',
        [publicacion.id],
      );
      expect(rows[0].nombre).toBe(origen);
    }
  });
});

describe('matriz rol × acción sobre un aviso (sin revisión)', () => {
  const ESPERADO = {
    // Marketing tiene noticias.redactar, así que ve el 409 del estado, no un 403.
    'enviar-revision': { admin: 409, parroco: 409, secretaria: 403, marketing: 409 },
    aprobar: { admin: 409, parroco: 409, secretaria: 409, marketing: 403 },
    rechazar: { admin: 409, parroco: 409, secretaria: 409, marketing: 403 },
    publicar: { admin: 200, parroco: 200, secretaria: 200, marketing: 403 },
    archivar: { admin: 200, parroco: 200, secretaria: 200, marketing: 403 },
    restaurar: { admin: 200, parroco: 200, secretaria: 200, marketing: 403 },
  };
  // Un aviso nunca está en revisión: aprobar y rechazar lo encuentran en borrador (409).
  const casos = Object.entries(ESPERADO).flatMap(([accion, porRol]) =>
    Object.entries(porRol).map(([rol, estado]) => [accion, rol, estado]),
  );

  it.each(casos)('%s como %s responde %i', async (accion, rol, esperado) => {
    const { origen, cuerpo } = ACCIONES[accion];
    const aviso = await crear('secretaria', {
      tipo: 'AVISO',
      estado: ['aprobar', 'rechazar'].includes(accion) ? 'Borrador' : origen,
      contenido: documento(),
    });

    const respuesta = await accionar(rol, aviso.id, accion, cuerpo);
    expect(respuesta.status, JSON.stringify(respuesta.body)).toBe(esperado);
  });

  it('los avisos no pasan por revisión: el mensaje lo explica', async () => {
    const aviso = await crear('secretaria', { tipo: 'AVISO', contenido: documento() });
    const respuesta = await accionar('parroco', aviso.id, 'enviar-revision');
    expect(respuesta.body.error.mensaje).toBe(
      'Los avisos no pasan por revisión: se publican directamente.',
    );
  });
});

describe('estado que no corresponde (409) y otras sedes', () => {
  it.each([
    [
      'aprobar',
      'Borrador',
      'Solo se pueden aprobar publicaciones en revisión. Esta está en «Borrador».',
    ],
    [
      'rechazar',
      'Publicado',
      'Solo se pueden rechazar publicaciones en revisión. Esta está en «Publicado».',
    ],
    [
      'publicar',
      'En revisión',
      'Solo se pueden publicar publicaciones en borrador. Esta está en «En revisión».',
    ],
    [
      'archivar',
      'Borrador',
      'Solo se pueden archivar publicaciones publicadas. Esta está en «Borrador».',
    ],
    [
      'restaurar',
      'Publicado',
      'Solo se pueden restaurar publicaciones archivadas. Esta está en «Publicado».',
    ],
    [
      'enviar-revision',
      'En revisión',
      'Solo se pueden enviar a revisión publicaciones en borrador. Esta está en «En revisión».',
    ],
  ])('%s desde «%s» responde 409 y no cambia nada', async (accion, estado, mensaje) => {
    const publicacion = await crear('marketing', { estado });
    const cuerpo = accion === 'rechazar' ? { observacion: 'Observación válida' } : undefined;

    const respuesta = await accionar('admin', publicacion.id, accion, cuerpo);

    expect(respuesta.status).toBe(409);
    expect(respuesta.body.error).toEqual({ codigo: 'CONFLICTO', mensaje, detalles: [] });
    expect(await registrosDe('publicacion', publicacion.id)).toHaveLength(1);
  });

  it('el Administrador sin sede actúa en cualquier sede; 404 y 403 por sede', async () => {
    const ajena = await crear('parrocoAjeno', { tipo: 'AVISO', contenido: documento() });

    expect((await accionar('parroco', ajena.id, 'publicar')).status).toBe(403);
    expect((await accionar('parroco', 999999999, 'publicar')).status).toBe(404);
    expect((await accionar('parroco', 'abc', 'publicar')).status).toBe(400);
    expect((await accionar('admin', ajena.id, 'publicar')).status).toBe(200);
  });

  it('sin sesión responde 401', async () => {
    expect((await accionar(undefined, 1, 'publicar')).status).toBe(401);
  });
});

describe('flujo completo de una noticia de Marketing', () => {
  it('envía, el Párroco rechaza con observación, Marketing corrige y reenvía, el Párroco aprueba', async () => {
    const creada = await crear('marketing');
    expect(creada.acciones).toEqual(['EDITAR', 'ELIMINAR', 'ENVIAR_REVISION']);

    const enviada = await accionar('marketing', creada.id, 'enviar-revision');
    expect(enviada.body.datos).toMatchObject({
      estado: { codigo: 'EN_REVISION', nombre: 'En revisión' },
      revision: null,
      visibleEnPortal: false,
      acciones: [],
    });
    // Mientras espera, Marketing no puede editarla ni eliminarla.
    expect(
      (await como('marketing').patch(`${RUTA}/${creada.id}`, { destacada: true })).status,
    ).toBe(403);
    expect((await como('marketing').delete(`${RUTA}/${creada.id}`)).status).toBe(409);

    const rechazada = await accionar('parroco', creada.id, 'rechazar', {
      observacion: 'Corregir la hora de la procesión.',
    });
    expect(rechazada.status).toBe(200);
    expect(rechazada.body.datos).toMatchObject({
      estado: { codigo: 'BORRADOR' },
      revision: {
        revisadoPor: { id: usuarios.parroco.id },
        fecha: expect.stringMatching(/-04:00$/),
        observacion: 'Corregir la hora de la procesión.',
      },
      acciones: ['EDITAR', 'ELIMINAR', 'PUBLICAR'],
    });
    const vistaMarketing = await como('marketing').get(`${RUTA}/${creada.id}`);
    expect(vistaMarketing.body.datos.acciones).toEqual(['EDITAR', 'ELIMINAR', 'ENVIAR_REVISION']);

    // La revisión anterior se conserva al reenviar.
    const reenviada = await accionar('marketing', creada.id, 'enviar-revision');
    expect(reenviada.body.datos.revision.observacion).toBe('Corregir la hora de la procesión.');

    const aprobada = await accionar('parroco', creada.id, 'aprobar');
    expect(aprobada.body.datos).toMatchObject({
      estado: { codigo: 'PUBLICADO' },
      revision: { revisadoPor: { id: usuarios.parroco.id }, observacion: null },
      visibleEnPortal: true,
      acciones: ['EDITAR', 'ARCHIVAR'],
    });

    const archivada = await accionar('parroco', creada.id, 'archivar');
    expect(archivada.body.datos).toMatchObject({
      estado: { codigo: 'ARCHIVADO' },
      visibleEnPortal: false,
      acciones: ['ELIMINAR', 'RESTAURAR'],
    });
    const restaurada = await accionar('parroco', creada.id, 'restaurar');
    expect(restaurada.body.datos.estado.codigo).toBe('BORRADOR');
  });

  it('cada transición queda en la bitácora con el estado anterior y el nuevo', async () => {
    const creada = await crear('marketing');
    await accionar('marketing', creada.id, 'enviar-revision');
    await accionar('parroco', creada.id, 'aprobar');

    const [, enviar, aprobar] = await registrosDe('publicacion', creada.id);
    expect(enviar).toMatchObject({
      usuario_id: usuarios.marketing.id,
      accion: 'UPDATE',
      datos_anteriores: { estado_publicacion_id: expect.any(Number) },
      datos_nuevos: { estado_publicacion_id: expect.any(Number) },
    });
    expect(enviar.datos_anteriores.estado_publicacion_id).not.toBe(
      enviar.datos_nuevos.estado_publicacion_id,
    );
    expect(aprobar).toMatchObject({
      usuario_id: usuarios.parroco.id,
      datos_anteriores: { revisado_por: null, fecha_revision: null },
      datos_nuevos: { revisado_por: usuarios.parroco.id },
    });
    expect(aprobar.datos_nuevos.fecha_publicacion).toMatch(/-04:00$/);
  });

  it('el Párroco y el Administrador publican directamente; Secretaría un aviso', async () => {
    const noticia = await crear('parroco');
    const publicada = await accionar('parroco', noticia.id, 'publicar');
    expect(publicada.body.datos).toMatchObject({
      estado: { codigo: 'PUBLICADO' },
      visibleEnPortal: true,
    });
    expect(publicada.body.datos.revision).toBeNull();

    const aviso = await crear('secretaria', { tipo: 'AVISO', contenido: documento() });
    expect((await accionar('secretaria', aviso.id, 'publicar')).body.datos.visibleEnPortal).toBe(
      true,
    );
  });

  it('el administrador de la sede enviando su propio borrador a revisión', async () => {
    const propia = await crear('adminSede');
    expect((await accionar('adminSede', propia.id, 'enviar-revision')).status).toBe(200);
  });
});

describe('fechas: programación y vigencia', () => {
  it('publicar con fecha futura queda programada (PUBLICADO pero no visible)', async () => {
    const futura = mas(10);
    const creada = await crear('parroco');

    const respuesta = await accionar('parroco', creada.id, 'publicar', {
      fechaPublicacion: futura,
      fechaExpiracion: mas(20),
    });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos).toMatchObject({
      estado: { codigo: 'PUBLICADO' },
      visibleEnPortal: false,
    });
    expect(new Date(respuesta.body.datos.fechaPublicacion).getTime()).toBe(
      Math.floor(new Date(futura).getTime() / 1000) * 1000,
    );
  });

  it('una fecha pasada se reemplaza por ahora', async () => {
    const creada = await crear('parroco');
    const antes = Date.now();
    const respuesta = await accionar('parroco', creada.id, 'publicar', {
      fechaPublicacion: '2020-01-01T08:00:00-04:00',
    });

    const fecha = new Date(respuesta.body.datos.fechaPublicacion).getTime();
    expect(fecha).toBeGreaterThanOrEqual(Math.floor(antes / 1000) * 1000);
    expect(respuesta.body.datos.visibleEnPortal).toBe(true);
  });

  it('sin fecha en la acción usa la fecha deseada guardada; si tampoco hay, ahora', async () => {
    const futura = mas(5);
    const deseada = await crear('marketing', { fechaPublicacion: futura });
    await accionar('marketing', deseada.id, 'enviar-revision');
    const aprobada = await accionar('parroco', deseada.id, 'aprobar');
    expect(aprobada.body.datos.visibleEnPortal).toBe(false);
    expect(aprobada.body.datos.fechaPublicacion).toBe(deseada.fechaPublicacion);

    const sinFecha = await crear('parroco');
    expect(sinFecha.fechaPublicacion).toBeNull();
    const publicada = await accionar('parroco', sinFecha.id, 'publicar');
    expect(publicada.body.datos.fechaPublicacion).toMatch(/-04:00$/);
  });

  it('aprobar acepta una fecha del Párroco que reemplaza la deseada', async () => {
    const creada = await crear('marketing', { fechaPublicacion: mas(5) });
    await accionar('marketing', creada.id, 'enviar-revision');
    const aprobada = await accionar('parroco', creada.id, 'aprobar', { fechaPublicacion: mas(30) });
    expect(aprobada.body.datos.fechaPublicacion).not.toBe(creada.fechaPublicacion);
  });

  it('una expiración que ya pasó, o anterior a la publicación, es 400', async () => {
    const creada = await crear('parroco');

    const pasada = await accionar('parroco', creada.id, 'publicar', {
      fechaExpiracion: '2020-01-01T08:00:00-04:00',
    });
    expect(pasada.status).toBe(400);
    expect(pasada.body.error.detalles.map((d) => d.campo)).toEqual(['fechaExpiracion']);

    const invertida = await accionar('parroco', creada.id, 'publicar', {
      fechaPublicacion: mas(10),
      fechaExpiracion: mas(5),
    });
    expect(invertida.status).toBe(400);
    expect(invertida.body.error.detalles).toEqual([
      { campo: 'fechaExpiracion', mensaje: 'Debe ser posterior a la fecha de publicación.' },
    ]);
  });

  it('una fecha sin zona horaria es 400', async () => {
    const creada = await crear('parroco');
    const respuesta = await accionar('parroco', creada.id, 'publicar', {
      fechaPublicacion: '2026-12-01T08:00:00',
    });
    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.detalles[0].campo).toBe('fechaPublicacion');
  });

  it('archivar conserva las fechas', async () => {
    const creada = await crear('parroco');
    const publicada = await accionar('parroco', creada.id, 'publicar', {
      fechaPublicacion: mas(3),
      fechaExpiracion: mas(9),
    });
    const archivada = await accionar('parroco', creada.id, 'archivar');
    expect(archivada.body.datos.fechaPublicacion).toBe(publicada.body.datos.fechaPublicacion);
    expect(archivada.body.datos.fechaExpiracion).toBe(publicada.body.datos.fechaExpiracion);
  });
});

describe('requisitos para salir de BORRADOR', () => {
  it('una noticia sin contenido ni enlace externo no se envía, aprueba ni publica (400)', async () => {
    const vacia = await crear('marketing', { contenido: documento() });

    for (const [quien, accion] of [
      ['marketing', 'enviar-revision'],
      ['parroco', 'publicar'],
    ]) {
      const respuesta = await accionar(quien, vacia.id, accion);
      expect(respuesta.status).toBe(400);
      expect(respuesta.body.error).toEqual({
        codigo: 'VALIDACION',
        mensaje: 'La publicación no está lista para publicarse.',
        detalles: [
          { campo: 'contenido.bloques', mensaje: 'Agrega contenido o un enlace externo.' },
        ],
      });
    }

    await ponerEstado(vacia.id, 'En revisión');
    expect((await accionar('parroco', vacia.id, 'aprobar')).status).toBe(400);
  });

  it('con un enlace externo basta; un aviso solo necesita el título', async () => {
    const conEnlace = await crear('marketing', {
      contenido: documento(),
      urlExterna: 'https://ejemplo.test/nota',
    });
    expect((await accionar('marketing', conEnlace.id, 'enviar-revision')).status).toBe(200);

    const aviso = await crear('secretaria', { tipo: 'AVISO', contenido: documento() });
    expect((await accionar('secretaria', aviso.id, 'publicar')).status).toBe(200);
  });

  it('solo párrafos vacíos cuenta como sin contenido', async () => {
    const vacio = {
      ...parrafo(''),
      content: [{ type: 'text', text: '   ', styles: {} }],
    };
    const creada = await crear('marketing', { contenido: documento(vacio) });
    expect((await accionar('marketing', creada.id, 'enviar-revision')).status).toBe(400);
  });

  it('la imagen de portada necesita texto alternativo; se informan todos los faltantes juntos', async () => {
    const sinTexto = await panel.crearArchivo({
      sedeId: sede.id,
      subidoPor: usuarios.marketing.id,
      tipoMime: 'image/webp',
    });
    const creada = await crear('marketing', {
      contenido: documento(),
      imagenPortadaId: sinTexto.id,
    });

    const respuesta = await accionar('marketing', creada.id, 'enviar-revision');
    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.detalles).toEqual([
      { campo: 'contenido.bloques', mensaje: 'Agrega contenido o un enlace externo.' },
      { campo: 'imagenPortadaId', mensaje: 'La imagen de portada necesita un texto alternativo.' },
    ]);

    await consultar("UPDATE archivo_multimedia SET texto_alternativo = 'Altar' WHERE id = $1", [
      sinTexto.id,
    ]);
    await como('marketing').patch(`${RUTA}/${creada.id}`, { urlExterna: 'https://ejemplo.test/x' });
    expect((await accionar('marketing', creada.id, 'enviar-revision')).status).toBe(200);
  });

  it('una expiración guardada que ya pasó impide enviar a revisión', async () => {
    const creada = await crear('marketing', {
      fechaPublicacion: '2020-01-01T08:00:00-04:00',
      fechaExpiracion: '2020-02-01T08:00:00-04:00',
    });
    const respuesta = await accionar('marketing', creada.id, 'enviar-revision');
    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.detalles.map((d) => d.campo)).toEqual(['fechaExpiracion']);
  });
});

describe('rechazar', () => {
  it('exige una observación de 5 a 500 caracteres', async () => {
    const creada = await crear('marketing', { estado: 'En revisión' });

    for (const cuerpo of [
      undefined,
      {},
      { observacion: 'abc' },
      { observacion: 'x'.repeat(501) },
    ]) {
      const respuesta = await accionar('parroco', creada.id, 'rechazar', cuerpo);
      expect(respuesta.status).toBe(400);
      expect(respuesta.body.error.detalles[0].campo).toBe('observacion');
    }
    expect(
      (await accionar('parroco', creada.id, 'rechazar', { observacion: 'x'.repeat(500) })).status,
    ).toBe(200);
  });
});

describe('transiciones simultáneas', () => {
  it('si dos personas aprueban y rechazan a la vez, gana la primera y la segunda recibe 409', async () => {
    const creada = await crear('marketing', { estado: 'En revisión' });

    const [aprobar, rechazar] = await Promise.all([
      accionar('parroco', creada.id, 'aprobar'),
      accionar('admin', creada.id, 'rechazar', { observacion: 'Observación válida' }),
    ]);

    expect([aprobar.status, rechazar.status].sort()).toEqual([200, 409]);
    const registros = await registrosDe('publicacion', creada.id);
    expect(registros).toHaveLength(2);
  });
});
