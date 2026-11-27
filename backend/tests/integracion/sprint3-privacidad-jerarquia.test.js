// Pruebas de privacidad (RNF-02, RF-11) y reglas de jerarquía de sedes (PAR-171) del sprint 3.
import { Writable } from 'node:stream';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { crearLogger, establecerLogger, reiniciarLogger } from '../../src/config/logger.js';
import { cerrarPool, consultar } from '../../src/db/index.js';
import { cerrarRedis } from '../../src/db/redis.js';
import { emitirTokenObservacion } from '../../src/services/observacionesProclama.service.js';
import { crearPanel, registrosDe, sedePrincipal } from '../apoyo/panel.js';

const lineasLog = [];
const destinoLog = new Writable({
  write(chunk, _enc, cb) {
    lineasLog.push(chunk.toString());
    cb();
  },
});
establecerLogger(crearLogger(undefined, { destino: destinoLog, nivel: 'info' }));

const app = createApp();
app.set('trust proxy', 1);
const panel = crearPanel(app);
const { como } = panel;

const PREFIJO = `Spr3 ${Date.now()}`;
const SECRETO_NOMBRE = `NombreSecreto${Date.now()}`;
const SECRETO_CORREO = `secreto${Date.now()}@ejemplo.test`;
const SECRETO_TEL = '+591 79876543';
const SECRETO_MSG = `Impedimento confidencial ${Date.now()} para el párroco.`;

let sede;
let grupoId;
let proclamaId;
let observacionId;
let coordinadorId;
const sedesCreadas = [];

beforeAll(async () => {
  sede = await sedePrincipal();
  await panel.conSesion('admin', { rol: 'ADMINISTRADOR', sede: null });
  await panel.conSesion('parroco', { rol: 'PARROCO', sede: sede.slug });
  await panel.conSesion('secretaria', { rol: 'SECRETARIA', sede: sede.slug });
  await panel.conSesion('marketing', { rol: 'MARKETING', sede: sede.slug });

  const { rows: grp } = await consultar(
    'SELECT id FROM grupo_pastoral WHERE sede_id = $1 AND visible LIMIT 1',
    [sede.id],
  );
  grupoId = grp[0].id;

  // Crear coordinador asignado a un grupo
  const coordRes = await como('admin').post('/api/admin/usuarios', {
    nombreCompleto: `${PREFIJO} Coordinador`,
    correo: `coord.${Date.now()}@ejemplo.test`,
    contrasena: 'ClaveValida123!',
    rol: 'COORDINADOR',
    sedeId: sede.id,
    grupoIds: [grupoId],
  });
  expect(coordRes.status, JSON.stringify(coordRes.body)).toBe(201);
  coordinadorId = coordRes.body.datos.id;
  const loginCoord = await panel.como().post('/api/auth/login', {
    correo: coordRes.body.datos.correo,
    contrasena: 'ClaveValida123!',
  });
  panel.sesiones.coordinador = loginCoord.headers['set-cookie'];

  // Proclama vigente y observación confidencial
  const procRes = await como('secretaria').post('/api/admin/proclamas', {
    contrayente1: `${PREFIJO} Novio`,
    contrayente2: `${PREFIJO} Novia`,
    fechaMatrimonio: '2033-11-15T11:00:00-04:00',
    publicaciones: [{ fecha: '2020-10-25' }],
  });
  expect(procRes.status, JSON.stringify(procRes.body)).toBe(201);
  proclamaId = procRes.body.datos.id;

  const obsRes = await como()
    .post(`/api/sedes/${sede.slug}/proclamas/${proclamaId}/observaciones`, {
      nombreCompleto: SECRETO_NOMBRE,
      correo: SECRETO_CORREO,
      telefono: SECRETO_TEL,
      mensaje: SECRETO_MSG,
      verificacion: emitirTokenObservacion(proclamaId, { ahora: Date.now() - 5000 }),
    })
    .set('X-Forwarded-For', '10.30.40.1');
  expect(obsRes.status, JSON.stringify(obsRes.body)).toBe(201);

  const { rows: obsRows } = await consultar(
    'SELECT id FROM observacion_proclama WHERE proclama_id = $1',
    [proclamaId],
  );
  observacionId = obsRows[0].id;
});

afterAll(async () => {
  await panel.limpiar(async () => {
    if (sedesCreadas.length) {
      await consultar('DELETE FROM sede WHERE id = ANY($1::int[])', [sedesCreadas]);
    }
    if (proclamaId) {
      await consultar('DELETE FROM observacion_proclama WHERE proclama_id = $1', [proclamaId]);
      await consultar('DELETE FROM proclama_publicacion WHERE proclama_id = $1', [proclamaId]);
      await consultar('DELETE FROM proclama WHERE id = $1', [proclamaId]);
    }
    if (coordinadorId) {
      await consultar('DELETE FROM usuario_grupo_pastoral WHERE usuario_id = $1', [coordinadorId]);
      await consultar('DELETE FROM usuario WHERE id = $1', [coordinadorId]);
    }
  });
  reiniciarLogger();
  await cerrarPool();
  await cerrarRedis();
});

describe('privacidad de observaciones y alcance del coordinador (RNF-02, RF-11)', () => {
  it('los datos personales de observaciones nunca aparecen para otros roles, público, búsqueda, bitácora ni logs', async () => {
    const rutasSinAcceso = [
      '/api/admin/proclamas/observaciones',
      `/api/admin/proclamas/observaciones/${observacionId}`,
      '/api/admin/proclamas/observaciones/exportar',
    ];
    for (const rol of ['admin', 'secretaria', 'marketing', 'coordinador']) {
      for (const ruta of rutasSinAcceso) {
        const res = await como(rol).get(ruta);
        expect(res.status).toBe(403);
        const texto = `${JSON.stringify(res.body)}${res.text ?? ''}`;
        expect(texto).not.toContain(SECRETO_NOMBRE);
        expect(texto).not.toContain(SECRETO_CORREO);
        expect(texto).not.toContain('79876543');
        expect(texto).not.toContain(SECRETO_MSG);
      }
    }

    // Público, proclamas, bitácora y buscador nunca exponen la observación
    const rutasPublicasYOtras = [
      { rol: null, ruta: `/api/sedes/${sede.slug}/proclamas` },
      { rol: null, ruta: `/api/sedes/${sede.slug}/proclamas/${proclamaId}` },
      { rol: null, ruta: `/api/sedes/${sede.slug}/buscar?q=${encodeURIComponent(SECRETO_NOMBRE)}` },
      { rol: 'admin', ruta: '/api/admin/proclamas' },
      { rol: 'admin', ruta: '/api/admin/proclamas/exportar' },
      { rol: 'admin', ruta: '/api/admin/bitacora' },
      { rol: 'admin', ruta: '/api/admin/bitacora/exportar' },
    ];
    for (const { rol, ruta } of rutasPublicasYOtras) {
      const res = await (rol ? como(rol) : como()).get(ruta);
      expect(res.status).toBe(200);
      const texto = `${JSON.stringify(res.body)}${res.text ?? ''}`;
      expect(texto).not.toContain(SECRETO_NOMBRE);
      expect(texto).not.toContain(SECRETO_CORREO);
      expect(texto).not.toContain('79876543');
      expect(texto).not.toContain(SECRETO_MSG);
    }

    // El Párroco sí ve los datos y cada acceso deja VIEW en bitácora sin datos personales
    const bandeja = await como('parroco').get(
      `/api/admin/proclamas/observaciones?estado=todas&proclamaId=${proclamaId}`,
    );
    expect(bandeja.status).toBe(200);
    expect(bandeja.body.datos[0].correo).toBe(SECRETO_CORREO);

    const detalle = await como('parroco').get(
      `/api/admin/proclamas/observaciones/${observacionId}`,
    );
    expect(detalle.status).toBe(200);
    expect(detalle.body.datos.mensaje).toBe(SECRETO_MSG);

    const regLista = await registrosDe('observacion_proclama', '*');
    const regDetalle = await registrosDe('observacion_proclama', observacionId);
    expect(regLista.some((r) => r.accion === 'VIEW')).toBe(true);
    expect(regDetalle.some((r) => r.accion === 'VIEW')).toBe(true);
    for (const reg of [...regLista, ...regDetalle]) {
      const txt = JSON.stringify(reg);
      expect(txt).not.toContain(SECRETO_NOMBRE);
      expect(txt).not.toContain(SECRETO_CORREO);
      expect(txt).not.toContain('79876543');
      expect(txt).not.toContain(SECRETO_MSG);
    }

    // Logs de pino sin datos personales
    const todoLog = lineasLog.join('\n');
    expect(todoLog).not.toContain(SECRETO_NOMBRE);
    expect(todoLog).not.toContain(SECRETO_CORREO);
    expect(todoLog).not.toContain('79876543');
    expect(todoLog).not.toContain(SECRETO_MSG);
  });

  const RUTAS_PROHIBIDAS_COORDINADOR = [
    '/api/admin/proclamas/observaciones',
    '/api/admin/usuarios',
    `/api/admin/usuarios/${1}`,
    '/api/admin/bitacora',
    '/api/admin/eventos',
    '/api/admin/eventos/1',
    '/api/admin/proclamas',
    '/api/admin/horarios',
    '/api/admin/servicios',
    '/api/admin/paginas',
    '/api/admin/sedes',
    '/api/admin/sedes/arbol',
    '/api/admin/boletines',
    '/api/admin/videos',
    '/api/admin/publicaciones/exportar',
  ];

  it.each(RUTAS_PROHIBIDAS_COORDINADOR)(
    'coordinador recibe 403 en GET %s fuera de su lista permitida',
    async (ruta) => {
      const res = await como('coordinador').get(ruta);
      expect(res.status).toBe(403);
    },
  );
});

describe('jerarquía de sedes: combinaciones de reglas y prevención de ciclos', () => {
  it('impide ciclos directos/indirectos y combinaciones inválidas de tipo y sede superior', async () => {
    const p1 = await como('admin').post('/api/admin/sedes', {
      nombre: `${PREFIJO} Parroquia 1`,
      tipo: 'PARROQUIA',
    });
    expect(p1.status, JSON.stringify(p1.body)).toBe(201);
    const p1Id = p1.body.datos.id;
    sedesCreadas.push(p1Id);

    const cap = await como('admin').post('/api/admin/sedes', {
      nombre: `${PREFIJO} Capilla 1`,
      tipo: 'CAPILLA',
      sedePadreId: p1Id,
    });
    expect(cap.status).toBe(201);
    const capId = cap.body.datos.id;
    sedesCreadas.push(capId);

    const com = await como('admin').post('/api/admin/sedes', {
      nombre: `${PREFIJO} Comunidad 1`,
      tipo: 'COMUNIDAD',
      sedePadreId: capId,
    });
    expect(com.status).toBe(201);
    const comId = com.body.datos.id;
    sedesCreadas.push(comId);

    const pas = await como('admin').post('/api/admin/sedes', {
      nombre: `${PREFIJO} Pasionista 1`,
      tipo: 'COMUNIDAD_PASIONISTA',
    });
    expect(pas.status).toBe(201);
    const pasId = pas.body.datos.id;
    sedesCreadas.push(pasId);

    // Ciclo directo e indirecto
    expect(
      (await como('admin').post(`/api/admin/sedes/${capId}/mover`, { sedePadreId: capId })).status,
    ).toBe(400);
    expect(
      (await como('admin').post(`/api/admin/sedes/${p1Id}/mover`, { sedePadreId: comId })).status,
    ).toBe(400);

    // Combinaciones inválidas de jerarquía
    const invalidos = [
      { id: p1Id, sedePadreId: pasId }, // Parroquia bajo Pasionista
      { id: pasId, sedePadreId: p1Id }, // Pasionista bajo Parroquia
      { id: capId, sedePadreId: comId }, // Capilla bajo Comunidad
      { id: capId, sedePadreId: null }, // Capilla sin superior
      { id: comId, sedePadreId: null }, // Comunidad sin superior
      { id: comId, sedePadreId: pasId }, // Comunidad bajo Pasionista
    ];
    for (const { id, sedePadreId } of invalidos) {
      const res = await como('admin').post(`/api/admin/sedes/${id}/mover`, { sedePadreId });
      expect(res.status).toBe(400);
    }

    // Cambiar tipo de sede con hijas incompatibles -> 409; desactivar con hijas activas -> 409
    expect(
      (await como('admin').patch(`/api/admin/sedes/${p1Id}`, { tipo: 'COMUNIDAD_PASIONISTA' }))
        .status,
    ).toBe(409);
    expect((await como('admin').patch(`/api/admin/sedes/${p1Id}`, { activo: false })).status).toBe(
      409,
    );

    // Limpiar en orden hoja -> raíz
    sedesCreadas.reverse();
  });
});
