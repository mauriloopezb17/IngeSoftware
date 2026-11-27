// Pruebas de integración de observaciones privadas sobre proclamas (migración 007).
import { Writable } from 'node:stream';
import pino from 'pino';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { cerrarPool, consultar } from '../../src/db/index.js';
import { cerrarRedis } from '../../src/db/redis.js';
import { emitirTokenObservacion } from '../../src/services/observacionesProclama.service.js';
import { crearPanel, registrosDe, sedePrincipal } from '../apoyo/panel.js';

const app = createApp();
app.set('trust proxy', 1);
const panel = crearPanel(app);
const { como } = panel;

const PREFIJO = `Prueba obs ${Date.now()}`;
let sede;
let sedeAjena;
let proclamaVigenteId;
let proclamaPasadaId;
let proclamaOcultaId;
let proclamaAjenaId;

beforeAll(async () => {
  sede = await sedePrincipal();
  sedeAjena = await panel.crearSede();
  await panel.conSesion('admin', { rol: 'ADMINISTRADOR', sede: null });
  await panel.conSesion('parroco', { rol: 'PARROCO' });
  await panel.conSesion('secretaria', { rol: 'SECRETARIA' });
  await panel.conSesion('marketing', { rol: 'MARKETING' });
  await panel.conSesion('parrocoAjeno', { rol: 'PARROCO', sede: sedeAjena.slug });

  const crear = async (sedeId, sufijo, bodaSql, pubSql) => {
    const { rows } = await consultar(
      `INSERT INTO proclama (sede_id, nombre_contrayente_1, nombre_contrayente_2, fecha_matrimonio)
       VALUES ($1, $2, 'Novia Obs', ${bodaSql}) RETURNING id`,
      [sedeId, `${PREFIJO} ${sufijo}`],
    );
    if (pubSql) {
      await consultar(
        `INSERT INTO proclama_publicacion (proclama_id, numero_proclama, fecha_publicacion)
         VALUES ($1, 1, ${pubSql})`,
        [rows[0].id],
      );
    }
    return rows[0].id;
  };

  proclamaVigenteId = await crear(
    sede.id,
    'vigente',
    "now() + interval '14 days'",
    "DATE '2020-10-25'",
  );
  proclamaPasadaId = await crear(
    sede.id,
    'pasada',
    "TIMESTAMPTZ '2025-06-14 11:00-04'",
    "DATE '2025-05-25'",
  );
  proclamaOcultaId = await crear(
    sede.id,
    'oculta',
    "now() + interval '30 days'",
    "DATE '2032-10-25'",
  );
  proclamaAjenaId = await crear(
    sedeAjena.id,
    'ajena',
    "now() + interval '14 days'",
    "DATE '2020-10-25'",
  );
});

afterAll(async () => {
  await panel.limpiar(async () => {
    await consultar(
      `DELETE FROM observacion_proclama WHERE proclama_id IN
         (SELECT id FROM proclama WHERE nombre_contrayente_1 LIKE $1)`,
      [`${PREFIJO}%`],
    );
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

const RUTA_PUB = (id, sedeSlug = sede.slug) =>
  `/api/sedes/${sedeSlug}/proclamas/${id}/observaciones`;
const RUTA_ADM = '/api/admin/proclamas/observaciones';
const tokenValido = (id = proclamaVigenteId) =>
  emitirTokenObservacion(id, { ahora: Date.now() - 5000 });

describe('observaciones de proclamas (público)', () => {
  it('acepta solo correo o solo teléfono, anónima sin nombre, no devuelve los datos y detalle informa aceptaObservaciones', async () => {
    const detVigente = await como().get(`/api/sedes/${sede.slug}/proclamas/${proclamaVigenteId}`);
    expect(detVigente.status).toBe(200);
    expect(detVigente.body.datos.aceptaObservaciones).toBe(true);

    const detPasada = await como().get(`/api/sedes/${sede.slug}/proclamas/${proclamaPasadaId}`);
    expect(detPasada.status).toBe(200);
    expect(detPasada.body.datos.aceptaObservaciones).toBe(false);

    const verifRes = await como().get(`${RUTA_PUB(proclamaVigenteId)}/verificacion`);
    expect(verifRes.status).toBe(200);
    expect(verifRes.headers['cache-control']).toContain('no-store');
    expect(typeof verifRes.body.datos.token).toBe('string');

    const soloCorreo = await como()
      .post(RUTA_PUB(proclamaVigenteId), {
        nombreCompleto: '  Juan   Pérez  ',
        correo: 'juan.obs@ejemplo.com',
        telefono: '',
        mensaje: 'Observación confidencial enviada solo con correo.',
        sitioWeb: '',
        verificacion: tokenValido(),
      })
      .set('X-Forwarded-For', '10.10.10.1');
    expect(soloCorreo.status, JSON.stringify(soloCorreo.body)).toBe(201);
    expect(soloCorreo.body).toEqual({ datos: { recibido: true } });

    const soloTel = await como()
      .post(RUTA_PUB(proclamaVigenteId), {
        nombreCompleto: 'Ana Gómez',
        telefono: '+591 7123-4567',
        mensaje: 'Observación confidencial enviada solo con teléfono.',
        verificacion: tokenValido(),
      })
      .set('X-Forwarded-For', '10.10.10.2');
    expect(soloTel.status, JSON.stringify(soloTel.body)).toBe(201);
    expect(soloTel.body).toEqual({ datos: { recibido: true } });

    const anonima = await como()
      .post(RUTA_PUB(proclamaVigenteId), {
        correo: 'anonima.obs@ejemplo.com',
        mensaje: 'Observación anónima sin nombre completo.',
        verificacion: tokenValido(),
      })
      .set('X-Forwarded-For', '10.10.10.11');
    expect(anonima.status, JSON.stringify(anonima.body)).toBe(201);

    const { rows: filasAnonimas } = await consultar(
      'SELECT nombre_completo FROM observacion_proclama WHERE correo = $1',
      ['anonima.obs@ejemplo.com'],
    );
    expect(filasAnonimas).toHaveLength(1);
    expect(filasAnonimas[0].nombre_completo).toBeNull();
  });

  it('valida token ausente, inválido, de otra proclama, demasiado rápido y vencido', async () => {
    const base = {
      correo: 'verif@ejemplo.com',
      mensaje: 'Observación válida para probar verificación.',
    };

    const sinToken = await como()
      .post(RUTA_PUB(proclamaVigenteId), base)
      .set('X-Forwarded-For', '10.10.10.21');
    expect(sinToken.status).toBe(400);
    expect(sinToken.body.error.detalles[0].campo).toBe('verificacion');

    const invalido = await como()
      .post(RUTA_PUB(proclamaVigenteId), { ...base, verificacion: 'token.falso.123' })
      .set('X-Forwarded-For', '10.10.10.22');
    expect(invalido.status).toBe(400);
    expect(invalido.body.error.detalles[0].campo).toBe('verificacion');

    const otraProclama = await como()
      .post(RUTA_PUB(proclamaVigenteId), {
        ...base,
        verificacion: tokenValido(proclamaPasadaId),
      })
      .set('X-Forwarded-For', '10.10.10.23');
    expect(otraProclama.status).toBe(400);
    expect(otraProclama.body.error.detalles[0].campo).toBe('verificacion');

    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      const inicio = new Date('2026-11-27T10:00:00-04:00');
      vi.setSystemTime(inicio);
      const tokenFresco = (await como().get(`${RUTA_PUB(proclamaVigenteId)}/verificacion`)).body
        .datos.token;

      // Antes de 3 segundos -> 400
      vi.setSystemTime(new Date(inicio.getTime() + 2500));
      const muyRapido = await como()
        .post(RUTA_PUB(proclamaVigenteId), { ...base, verificacion: tokenFresco })
        .set('X-Forwarded-For', '10.10.10.24');
      expect(muyRapido.status).toBe(400);
      expect(muyRapido.body.error.detalles[0].campo).toBe('verificacion');

      // Más de 2 horas -> 400
      vi.setSystemTime(new Date(inicio.getTime() + 2 * 60 * 60 * 1000 + 1000));
      const vencido = await como()
        .post(RUTA_PUB(proclamaVigenteId), { ...base, verificacion: tokenFresco })
        .set('X-Forwarded-For', '10.10.10.25');
      expect(vencido.status).toBe(400);
      expect(vencido.body.error.detalles[0].campo).toBe('verificacion');
    } finally {
      vi.useRealTimers();
    }
  });

  it('valida contacto obligatorio, mensaje corto/largo, campos extra, 404 no visible y 409 boda pasada', async () => {
    const sinContacto = await como()
      .post(RUTA_PUB(proclamaVigenteId), {
        nombreCompleto: 'Luis Rojas',
        correo: '',
        telefono: '',
        mensaje: 'Mensaje válido de más de diez caracteres.',
        verificacion: tokenValido(),
      })
      .set('X-Forwarded-For', '10.10.10.3');
    expect(sinContacto.status).toBe(400);
    expect(sinContacto.body.error.detalles[0].campo).toBe('contacto');

    const corto = await como()
      .post(RUTA_PUB(proclamaVigenteId), {
        nombreCompleto: 'Luis Rojas',
        correo: 'luis@ejemplo.com',
        mensaje: 'Corto',
        verificacion: tokenValido(),
      })
      .set('X-Forwarded-For', '10.10.10.4');
    expect(corto.status).toBe(400);
    expect(corto.body.error.detalles[0].campo).toBe('mensaje');

    const largo = await como()
      .post(RUTA_PUB(proclamaVigenteId), {
        nombreCompleto: 'Luis Rojas',
        correo: 'luis@ejemplo.com',
        mensaje: 'a'.repeat(2001),
        verificacion: tokenValido(),
      })
      .set('X-Forwarded-For', '10.10.10.5');
    expect(largo.status).toBe(400);
    expect(largo.body.error.detalles[0].campo).toBe('mensaje');

    const extra = await como()
      .post(RUTA_PUB(proclamaVigenteId), {
        nombreCompleto: 'Luis Rojas',
        correo: 'luis@ejemplo.com',
        mensaje: 'Mensaje válido de más de diez caracteres.',
        verificacion: tokenValido(),
        campoExtra: 'no',
      })
      .set('X-Forwarded-For', '10.10.10.6');
    expect(extra.status).toBe(400);

    const oculta = await como()
      .post(RUTA_PUB(proclamaOcultaId), {
        nombreCompleto: 'Luis Rojas',
        correo: 'luis@ejemplo.com',
        mensaje: 'Mensaje válido de más de diez caracteres.',
        verificacion: tokenValido(proclamaOcultaId),
      })
      .set('X-Forwarded-For', '10.10.10.7');
    expect(oculta.status).toBe(404);

    const pasada = await como()
      .post(RUTA_PUB(proclamaPasadaId), {
        nombreCompleto: 'Luis Rojas',
        correo: 'luis@ejemplo.com',
        mensaje: 'Mensaje válido de más de diez caracteres.',
        verificacion: tokenValido(proclamaPasadaId),
      })
      .set('X-Forwarded-For', '10.10.10.8');
    expect(pasada.status).toBe(409);
  });

  it('honeypot con texto responde 201 sin guardar fila en base de datos', async () => {
    const antes = await consultar(
      'SELECT count(*)::int AS n FROM observacion_proclama WHERE proclama_id = $1',
      [proclamaVigenteId],
    );
    const res = await como()
      .post(RUTA_PUB(proclamaVigenteId), {
        nombreCompleto: 'Bot Spam',
        correo: 'bot@ejemplo.com',
        mensaje: 'Mensaje automático enviado por un bot.',
        sitioWeb: 'https://spam.ejemplo.com',
        verificacion: tokenValido(),
      })
      .set('X-Forwarded-For', '10.10.10.9');
    expect(res.status).toBe(201);
    const despues = await consultar(
      'SELECT count(*)::int AS n FROM observacion_proclama WHERE proclama_id = $1',
      [proclamaVigenteId],
    );
    expect(despues.rows[0].n).toBe(antes.rows[0].n);
  });

  it('limita a 5 peticiones por hora por IP y responde 429 con formato del contrato', async () => {
    const ip = '10.10.10.99';
    for (let i = 0; i < 5; i++) {
      const ok = await como()
        .post(RUTA_PUB(proclamaVigenteId), {
          nombreCompleto: `Persona ${i}`,
          correo: `p${i}@ejemplo.com`,
          mensaje: 'Observación válida para probar límite de tasa.',
          verificacion: tokenValido(),
        })
        .set('X-Forwarded-For', ip);
      expect(ok.status).toBe(201);
    }
    const bloqueado = await como()
      .post(RUTA_PUB(proclamaVigenteId), {
        nombreCompleto: 'Persona 6',
        correo: 'p6@ejemplo.com',
        mensaje: 'Observación que excede el límite por hora.',
        verificacion: tokenValido(),
      })
      .set('X-Forwarded-For', ip);
    expect(bloqueado.status).toBe(429);
    expect(bloqueado.body.error.codigo).toBe('DEMASIADAS_SOLICITUDES');
    expect(bloqueado.headers['retry-after']).toBeDefined();
  });

  it('redact de pino oculta nombreCompleto, correo, telefono y mensaje', () => {
    let salida = '';
    const destino = new Writable({
      write(chunk, _enc, cb) {
        salida += chunk.toString();
        cb();
      },
    });
    const log = pino(
      {
        level: 'info',
        redact: {
          paths: [
            'req.body.nombreCompleto',
            'req.body.correo',
            'req.body.telefono',
            'req.body.mensaje',
            '*.nombreCompleto',
            '*.correo',
            '*.telefono',
            '*.mensaje',
          ],
          censor: '[oculto]',
        },
      },
      destino,
    );
    log.info({
      req: {
        body: {
          nombreCompleto: 'SECRETO_NOMBRE',
          correo: 'secreto@correo.test',
          telefono: '77788899',
          mensaje: 'SECRETO_MENSAJE_CONFIDENCIAL',
        },
      },
    });
    expect(salida).not.toContain('SECRETO_NOMBRE');
    expect(salida).not.toContain('secreto@correo.test');
    expect(salida).not.toContain('77788899');
    expect(salida).not.toContain('SECRETO_MENSAJE_CONFIDENCIAL');
    expect(salida).toContain('[oculto]');
  });
});

describe('observaciones de proclamas (admin)', () => {
  it('solo Párroco tiene acceso; sin sesión 401; Admin, Secretaría y Marketing 403', async () => {
    expect((await como().get(RUTA_ADM)).status).toBe(401);
    expect((await como('admin').get(RUTA_ADM)).status).toBe(403);
    expect((await como('secretaria').get(RUTA_ADM)).status).toBe(403);
    expect((await como('marketing').get(RUTA_ADM)).status).toBe(403);
    expect((await como('parroco').get(RUTA_ADM)).status).toBe(200);
  });

  it('buscar filtra por nombre o mensaje, sin distinguir mayúsculas ni acentos', async () => {
    await consultar(
      `INSERT INTO observacion_proclama (proclama_id, nombre_completo, correo, mensaje)
       VALUES ($1, 'Mónica Quispe Búsqueda', 'monica@ejemplo.com', 'Conozco a los novios desde siempre.'),
              ($1, 'Otra Persona', 'otra@ejemplo.com', 'Tengo un impedimento canónico que informar.')`,
      [proclamaVigenteId],
    );
    const filtrar = (texto) =>
      como('parroco').get(
        `${RUTA_ADM}?estado=todas&proclamaId=${proclamaVigenteId}&buscar=${encodeURIComponent(texto)}`,
      );

    const porNombre = await filtrar('monica quispe');
    expect(porNombre.status).toBe(200);
    expect(porNombre.body.datos.map((o) => o.nombreCompleto)).toEqual(['Mónica Quispe Búsqueda']);
    expect(porNombre.body.paginacion.total).toBe(1);

    const porMensaje = await filtrar('IMPEDIMENTO CANONICO');
    expect(porMensaje.body.datos.map((o) => o.nombreCompleto)).toEqual(['Otra Persona']);

    const sinCoincidencias = await filtrar('zzqq-nada');
    expect(sinCoincidencias.body.datos).toEqual([]);
    expect(sinCoincidencias.body.paginacion.total).toBe(0);

    // El comodín % se busca como texto, no como "cualquier cosa".
    expect((await filtrar('%')).body.paginacion.total).toBe(0);
  });

  it('resumen, marcar leída/no leída, otra sede 404 y eliminar sin datos personales en bitácora', async () => {
    await como()
      .post(RUTA_PUB(proclamaAjenaId, sedeAjena.slug), {
        nombreCompleto: 'Persona Ajena',
        correo: 'ajena@ejemplo.com',
        mensaje: 'Observación en otra sede para verificar aislamiento.',
        verificacion: tokenValido(proclamaAjenaId),
      })
      .set('X-Forwarded-For', '10.10.10.50');

    const { rows: ajenas } = await consultar(
      'SELECT id FROM observacion_proclama WHERE proclama_id = $1',
      [proclamaAjenaId],
    );
    const ajenaId = ajenas[0].id;

    // Párroco de sede principal recibe 404 al intentar acceder o borrar observación de otra sede.
    expect((await como('parroco').patch(`${RUTA_ADM}/${ajenaId}`, { leida: true })).status).toBe(
      404,
    );
    expect((await como('parroco').delete(`${RUTA_ADM}/${ajenaId}`)).status).toBe(404);

    // Lista y resumen de sede principal.
    const resumenAntes = await como('parroco').get(`${RUTA_ADM}/resumen`);
    expect(resumenAntes.status).toBe(200);
    expect(resumenAntes.body.datos.noLeidas).toBeGreaterThanOrEqual(1);

    const lista = await como('parroco').get(
      `${RUTA_ADM}?estado=no-leidas&proclamaId=${proclamaVigenteId}`,
    );
    expect(lista.status).toBe(200);
    expect(lista.body.datos.length).toBeGreaterThanOrEqual(1);
    const obsId = lista.body.datos[0].id;

    // Marcar leída y luego no leída.
    const leida = await como('parroco').patch(`${RUTA_ADM}/${obsId}`, { leida: true });
    expect(leida.status).toBe(200);
    expect(leida.body.datos.leida).toBe(true);
    expect(leida.body.datos.leidoEn).toBeTruthy();

    const noLeida = await como('parroco').patch(`${RUTA_ADM}/${obsId}`, { leida: false });
    expect(noLeida.status).toBe(200);
    expect(noLeida.body.datos.leida).toBe(false);
    expect(noLeida.body.datos.leidoEn).toBeNull();

    // Eliminar y verificar bitácora sin datos personales.
    const borrada = await como('parroco').delete(`${RUTA_ADM}/${obsId}`);
    expect(borrada.status).toBe(204);

    const [registro] = await registrosDe('observacion_proclama', obsId);
    expect(registro).toBeDefined();
    expect(JSON.stringify(registro)).not.toContain('correo');
    expect(JSON.stringify(registro)).not.toContain('telefono');
    expect(JSON.stringify(registro)).not.toContain('mensaje');
    expect(JSON.stringify(registro)).not.toContain('nombre_completo');
  });

  it('ordena observaciones por fechaEnvio y -fechaEnvio', async () => {
    const asc = await como('parroco').get(`${RUTA_ADM}?estado=todas&porPagina=50&orden=fechaEnvio`);
    const desc = await como('parroco').get(
      `${RUTA_ADM}?estado=todas&porPagina=50&orden=-fechaEnvio`,
    );

    expect(asc.status).toBe(200);
    expect(desc.status).toBe(200);
    expect(asc.body.datos.length).toBeGreaterThanOrEqual(2);

    const idsAsc = asc.body.datos.map((o) => o.id);
    const idsDesc = desc.body.datos.map((o) => o.id);
    expect(idsDesc).toEqual([...idsAsc].reverse());
  });

  it('registra VIEW en la bitácora al listar y al abrir una observación sin datos personales, y exporta Anónima en CSV', async () => {
    const lista = await como('parroco').get(
      `${RUTA_ADM}?estado=todas&proclamaId=${proclamaVigenteId}&buscar=${encodeURIComponent('Observación anónima sin nombre')}`,
    );
    expect(lista.status).toBe(200);
    const obsAnonima = lista.body.datos.find((o) => o.correo === 'anonima.obs@ejemplo.com');
    expect(obsAnonima).toBeDefined();
    expect(obsAnonima.nombreCompleto).toBeNull();

    const detalle = await como('parroco').get(`${RUTA_ADM}/${obsAnonima.id}`);
    expect(detalle.status).toBe(200);
    expect(detalle.body.datos.id).toBe(obsAnonima.id);

    // Permisos en GET /:id
    expect((await como().get(`${RUTA_ADM}/${obsAnonima.id}`)).status).toBe(401);
    expect((await como('admin').get(`${RUTA_ADM}/${obsAnonima.id}`)).status).toBe(403);
    expect((await como('secretaria').get(`${RUTA_ADM}/${obsAnonima.id}`)).status).toBe(403);
    expect((await como('marketing').get(`${RUTA_ADM}/${obsAnonima.id}`)).status).toBe(403);

    const regLista = await registrosDe('observacion_proclama', '*');
    const viewsLista = regLista.filter((r) => r.accion === 'VIEW');
    expect(viewsLista.length).toBeGreaterThanOrEqual(1);
    const ultimoViewLista = viewsLista[0];
    expect(JSON.stringify(ultimoViewLista.datos_nuevos)).not.toContain('anonima.obs');
    expect(JSON.stringify(ultimoViewLista.datos_nuevos)).not.toContain('Observación anónima');

    const regDetalle = await registrosDe('observacion_proclama', obsAnonima.id);
    const viewDetalle = regDetalle.find((r) => r.accion === 'VIEW');
    expect(viewDetalle).toBeDefined();
    expect(JSON.stringify(viewDetalle.datos_nuevos)).not.toContain('anonima.obs');
    expect(JSON.stringify(viewDetalle.datos_nuevos)).not.toContain('Observación anónima');

    // CSV con "Anónima"
    const csvRes = await como('parroco').get(
      `${RUTA_ADM}/exportar?estado=todas&proclamaId=${proclamaVigenteId}`,
    );
    expect(csvRes.status).toBe(200);
    expect(csvRes.text).toContain('Anónima');
  });
});
