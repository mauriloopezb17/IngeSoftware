// Registro estructurado de consultas (PAR-160.1): listados autenticados, anónimos, 400,
// no-listados, marcarConsulta('exportacion') y persistencia opcional en LOG_ARCHIVO.
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import express from 'express';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { validarEntorno } from '../../src/config/entorno.js';
import { crearLogger, establecerLogger, reiniciarLogger } from '../../src/config/logger.js';
import { cerrarPool, consultar } from '../../src/db/index.js';
import { cerrarRedis } from '../../src/db/redis.js';
import { marcarConsulta, registrarConsulta } from '../../src/middlewares/registrarConsulta.js';
import { crearPanel, sedePrincipal } from '../apoyo/panel.js';

function crearCaptura() {
  const lineas = [];
  const flujo = new PassThrough();
  let resto = '';
  flujo.on('data', (trozo) => {
    resto += trozo.toString('utf8');
    const partes = resto.split('\n');
    resto = partes.pop() ?? '';
    for (const linea of partes) {
      if (linea.trim()) lineas.push(JSON.parse(linea));
    }
  });
  const logger = crearLogger(
    validarEntorno({
      NODE_ENV: 'production',
      DATABASE_URL: process.env.DATABASE_URL,
      REDIS_URL: process.env.REDIS_URL,
      JWT_SECRET: process.env.JWT_SECRET,
      LOG_LEVEL: 'info',
    }),
    { destino: flujo, nivel: 'info' },
  );
  return { logger, lineas };
}

const captura = crearCaptura();
establecerLogger(captura.logger);

const app = createApp();
const panel = crearPanel(app);
let sede;

beforeAll(async () => {
  sede = await sedePrincipal();
});

afterEach(() => {
  captura.lineas.length = 0;
});

afterAll(async () => {
  reiniciarLogger();
  await Promise.all([panel.limpiar(), cerrarPool(), cerrarRedis()]);
});

const eventosConsulta = () => captura.lineas.filter((l) => l.evento === 'consulta');

describe('registro estructurado de consultas (PAR-160.1)', () => {
  it('registra un listado autenticado con patrón de ruta, usuario, filtros enviados y duración numérica', async () => {
    await panel.conSesion('secretaria', { rol: 'SECRETARIA', sede: sede.slug });
    captura.lineas.length = 0;

    const respuesta = await panel.como('secretaria').get('/api/admin/eventos?estado=PUBLICADO');
    expect(respuesta.status).toBe(200);

    const consultas = eventosConsulta();
    expect(consultas).toHaveLength(1);
    const [linea] = consultas;
    expect(linea).toMatchObject({
      evento: 'consulta',
      tipo: 'listado',
      ruta: '/api/admin/eventos',
      filtros: { estado: ['PUBLICADO'] },
      usuario: { id: panel.usuarios.secretaria.id, rol: 'SECRETARIA' },
      estado: 200,
    });
    expect(typeof linea.duracionMs).toBe('number');
    expect(linea.duracionMs).toBeGreaterThanOrEqual(0);
    expect(linea.reqId).toBe(respuesta.headers['x-request-id']);
    // No se incluyen valores por defecto que el cliente no mandó.
    expect(linea.filtros).not.toHaveProperty('pagina');
    expect(linea.filtros).not.toHaveProperty('porPagina');
  });

  it('registra un listado anónimo del portal con usuario "anonimo" y la sede', async () => {
    const respuesta = await request(app).get(`/api/sedes/${sede.slug}/eventos?porPagina=5`);
    expect(respuesta.status).toBe(200);

    const consultas = eventosConsulta();
    expect(consultas).toHaveLength(1);
    expect(consultas[0]).toMatchObject({
      evento: 'consulta',
      tipo: 'listado',
      ruta: '/api/sedes/:sede/eventos',
      filtros: { porPagina: 5 },
      usuario: 'anonimo',
      estado: 200,
      sede: sede.slug,
    });
  });

  it('registra un 400 de listado con nivel warn (40) y duración numérica', async () => {
    const respuesta = await request(app).get(`/api/sedes/${sede.slug}/eventos?pagina=abc`);
    expect(respuesta.status).toBe(400);

    const consultas = eventosConsulta();
    expect(consultas).toHaveLength(1);
    expect(consultas[0]).toMatchObject({
      evento: 'consulta',
      tipo: 'listado',
      estado: 400,
      level: 40,
      filtros: { pagina: 'abc' },
    });
    expect(typeof consultas[0].duracionMs).toBe('number');
  });

  it('no emite evento consulta para peticiones que no son listados ni exportaciones', async () => {
    const salud = await request(app).get('/api/salud');
    expect(salud.status).toBe(200);

    const { rows } = await consultar('SELECT id FROM evento WHERE sede_id = $1 LIMIT 1', [sede.id]);
    const detalle = await request(app).get(`/api/sedes/${sede.slug}/eventos/${rows[0].id}`);
    expect(detalle.status).toBe(200);

    expect(eventosConsulta()).toHaveLength(0);
  });

  it('soporta marcarConsulta("exportacion") para rutas de exportación', async () => {
    const miniApp = express();
    miniApp.use(registrarConsulta);
    miniApp.get('/exportar', marcarConsulta('exportacion'), (_req, res) =>
      res.status(200).send('ok'),
    );

    const respuesta = await request(miniApp).get('/exportar?formato=csv');
    expect(respuesta.status).toBe(200);

    const consultas = eventosConsulta();
    expect(consultas).toHaveLength(1);
    expect(consultas[0]).toMatchObject({
      evento: 'consulta',
      tipo: 'exportacion',
      ruta: '/exportar',
      filtros: { formato: 'csv' },
      usuario: 'anonimo',
      estado: 200,
    });
  });

  it('escribe logs JSON en el archivo indicado por LOG_ARCHIVO', async () => {
    const carpeta = mkdtempSync(join(tmpdir(), 'parroquia-log-'));
    const archivo = join(carpeta, 'anidada', 'api.log');

    try {
      const entorno = validarEntorno({
        NODE_ENV: 'production',
        DATABASE_URL: process.env.DATABASE_URL,
        REDIS_URL: process.env.REDIS_URL,
        JWT_SECRET: process.env.JWT_SECRET,
        LOG_ARCHIVO: archivo,
      });
      const logArchivo = crearLogger(entorno);
      logArchivo.info({ evento: 'consulta', ruta: '/api/admin/eventos' }, 'consulta');

      const linea = await vi.waitFor(() => {
        expect(existsSync(archivo)).toBe(true);
        const contenido = readFileSync(archivo, 'utf8').trim();
        expect(contenido).not.toBe('');
        return JSON.parse(contenido.split('\n')[0]);
      });
      expect(linea).toMatchObject({ evento: 'consulta', ruta: '/api/admin/eventos' });
    } finally {
      rmSync(carpeta, { recursive: true, force: true });
    }
  });
});
