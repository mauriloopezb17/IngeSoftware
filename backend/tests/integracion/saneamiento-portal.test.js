// Saneamiento de parámetros en listados del portal (PAR-161.3):
// inyección SQL, tipos erróneos, arreglos, límites, parámetros desconocidos,
// cadenas largas, caracteres de control, comodines literales y estado intacto de la BD.
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { cerrarPool, consultar } from '../../src/db/index.js';
import { cerrarRedis } from '../../src/db/redis.js';
import { crearPanel, SEDE_PRINCIPAL, sedePrincipal } from '../apoyo/panel.js';

const app = createApp();
const panel = crearPanel(app);
let sede;

const INYECCIONES_SQL = ['1;DROP TABLE usuario', "' OR '1'='1", '%', '_', '\\', '1 UNION SELECT'];

const PAYLOADS_BUSCAR = ["' OR '1'='1", '1;DROP TABLE usuario', '1 UNION SELECT', '%', '_', '\\'];

function sinFugasInternas(respuesta) {
  const texto = JSON.stringify(respuesta.body ?? {});
  expect(texto).not.toMatch(/\bSELECT\b|pg_|node_modules|\bat\s+[^\s]+\.(?:js|mjs)|"stack"/i);
}

function esperarValidacion(respuesta, campo) {
  expect(respuesta.status).toBe(400);
  expect(respuesta.body?.error?.codigo).toBe('VALIDACION');
  expect(typeof respuesta.body?.error?.mensaje).toBe('string');
  const campos = (respuesta.body?.error?.detalles ?? []).map((d) => d.campo);
  const prefijo = `query.${campo}`;
  expect(campos.some((c) => c === prefijo || c.startsWith(`${prefijo}.`))).toBe(true);
  sinFugasInternas(respuesta);
}

async function contarTablasCriticas() {
  const [usuarios, publicaciones, bitacora] = await Promise.all([
    consultar('SELECT COUNT(*)::int AS n FROM usuario'),
    consultar('SELECT COUNT(*)::int AS n FROM publicacion'),
    consultar('SELECT COUNT(*)::int AS n FROM bitacora_cambio'),
  ]);
  return {
    usuario: usuarios.rows[0].n,
    publicacion: publicaciones.rows[0].n,
    bitacora_cambio: bitacora.rows[0].n,
  };
}

const BASE_PORTAL = `/api/sedes/${SEDE_PRINCIPAL}`;
const ENDPOINTS_PORTAL = [
  {
    nombre: 'publicaciones',
    ruta: `${BASE_PORTAL}/publicaciones`,
    filtros: ['tipo', 'categoria', 'destacada'],
    porPaginaMax: 50,
    tieneOrden: true,
    tieneBuscarEnModelo: true,
  },
  {
    nombre: 'eventos',
    ruta: `${BASE_PORTAL}/eventos`,
    filtros: ['desde', 'hasta', 'categoria'],
    porPaginaMax: 50,
    tieneOrden: true,
    tieneBuscarEnModelo: true,
  },
  {
    nombre: 'proclamas vigentes',
    ruta: `${BASE_PORTAL}/proclamas`,
    filtros: ['anio'],
    porPaginaMax: 100,
    tieneOrden: true,
    tieneBuscarEnModelo: true,
  },
  {
    nombre: 'proclamas historial',
    ruta: `${BASE_PORTAL}/proclamas/historial`,
    filtros: ['anio'],
    porPaginaMax: 100,
    tieneOrden: false,
    tieneBuscarEnModelo: false,
  },
  {
    nombre: 'boletines',
    ruta: `${BASE_PORTAL}/boletines`,
    filtros: ['anio'],
    porPaginaMax: 100,
    tieneOrden: false,
    tieneBuscarEnModelo: true,
  },
  {
    nombre: 'horarios',
    ruta: `${BASE_PORTAL}/horarios`,
    filtros: ['tipo'],
    porPaginaMax: 100,
    tieneOrden: true,
    tieneBuscarEnModelo: true,
  },
  {
    nombre: 'servicios',
    ruta: `${BASE_PORTAL}/servicios`,
    filtros: [],
    porPaginaMax: 100,
    tieneOrden: true,
    tieneBuscarEnModelo: true,
  },
  {
    nombre: 'grupos pastorales',
    ruta: `${BASE_PORTAL}/grupos-pastorales`,
    filtros: [],
    porPaginaMax: 100,
    tieneOrden: true,
    tieneBuscarEnModelo: true,
  },
  {
    nombre: 'videos',
    ruta: `${BASE_PORTAL}/videos`,
    filtros: ['destacado'],
    porPaginaMax: 100,
    tieneOrden: true,
    tieneBuscarEnModelo: true,
  },
];

let conteoInicial;

beforeAll(async () => {
  sede = await sedePrincipal();
  await panel.conSesion('admin', { rol: 'ADMINISTRADOR', sede: null });
  conteoInicial = await contarTablasCriticas();
});

afterAll(async () => {
  await Promise.all([panel.limpiar(), cerrarPool(), cerrarRedis()]);
});

describe('saneamiento de parámetros en listados del portal (PAR-161.3)', () => {
  it.each(ENDPOINTS_PORTAL)(
    '$nombre: valida inyección, tipos erróneos, arreglos, límites, control y desconocidos',
    async ({ ruta, filtros, porPaginaMax, tieneOrden, tieneBuscarEnModelo }) => {
      for (const valorPagina of ['abc', '1.5', '0', '-1', '2147483648']) {
        esperarValidacion(
          await request(app).get(`${ruta}?pagina=${encodeURIComponent(valorPagina)}`),
          'pagina',
        );
      }
      esperarValidacion(await request(app).get(`${ruta}?pagina=1&pagina=2`), 'pagina');

      for (const valorPorPagina of [
        'abc',
        '1.5',
        '0',
        '-1',
        String(porPaginaMax + 1),
        '2147483648',
      ]) {
        esperarValidacion(
          await request(app).get(`${ruta}?porPagina=${encodeURIComponent(valorPorPagina)}`),
          'porPagina',
        );
      }
      esperarValidacion(await request(app).get(`${ruta}?porPagina=1&porPagina=2`), 'porPagina');

      esperarValidacion(await request(app).get(`${ruta}?desconocido=1`), 'desconocido');

      if (tieneOrden) {
        for (const payload of INYECCIONES_SQL) {
          esperarValidacion(
            await request(app).get(`${ruta}?orden=${encodeURIComponent(payload)}`),
            'orden',
          );
        }
      }

      for (const filtro of filtros) {
        for (const payload of INYECCIONES_SQL) {
          esperarValidacion(
            await request(app).get(`${ruta}?${filtro}=${encodeURIComponent(payload)}`),
            filtro,
          );
        }
      }

      esperarValidacion(await request(app).get(`${ruta}?buscar=a&buscar=b`), 'buscar');
      esperarValidacion(await request(app).get(`${ruta}?buscar=${'x'.repeat(10000)}`), 'buscar');
      for (const control of ['a%00b', 'a%0Ab', 'a%1Bb']) {
        esperarValidacion(await request(app).get(`${ruta}?buscar=${control}`), 'buscar');
      }

      for (const payload of PAYLOADS_BUSCAR) {
        const resp = await request(app).get(`${ruta}?buscar=${encodeURIComponent(payload)}`);
        // En /sedes/:sede/publicaciones buscar exige mín. 2 caracteres ('%' y '_' tienen 1 -> 400).
        if (ruta.endsWith('/publicaciones') && payload.length < 2) {
          esperarValidacion(resp, 'buscar');
          continue;
        }
        expect(resp.status).toBe(200);
        sinFugasInternas(resp);
        if (tieneBuscarEnModelo && payload === "' OR '1'='1") {
          expect(resp.body.paginacion.total).toBe(0);
          expect(resp.body.datos).toEqual([]);
        }
      }
    },
  );

  it('trata % y _ en buscar del portal como texto literal', async () => {
    const prefijo = `SanPortal-${Date.now()}`;
    const titulos = [`${prefijo} Bono 100% directo`, `${prefijo} Bono 1000 distinto`];
    const contenido = {
      formato: 'blocknote',
      version: 1,
      bloques: [
        {
          id: 'p1',
          type: 'paragraph',
          props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
          content: [{ type: 'text', text: 'Contenido de prueba de saneamiento.', styles: {} }],
          children: [],
        },
      ],
    };
    const creados = [];

    try {
      for (const titulo of titulos) {
        const res = await panel.como('admin').post('/api/admin/publicaciones', {
          sedeId: sede.id,
          tipo: 'AVISO',
          titulo,
          contenido,
        });
        expect(res.status).toBe(201);
        const pubId = res.body.datos.id;
        creados.push(pubId);
        const pub = await panel.como('admin').post(`/api/admin/publicaciones/${pubId}/publicar`, {
          fechaPublicacion: '2026-01-10T10:00:00-04:00',
        });
        expect(pub.status).toBe(200);
      }

      const respuesta = await request(app).get(
        `/api/sedes/${sede.slug}/publicaciones?buscar=${encodeURIComponent(`${prefijo} Bono 100%`)}`,
      );
      expect(respuesta.status).toBe(200);
      expect(respuesta.body.datos.map((p) => p.titulo)).toEqual([`${prefijo} Bono 100% directo`]);
    } finally {
      if (creados.length > 0) {
        await consultar(
          `DELETE FROM bitacora_cambio WHERE entidad = 'publicacion' AND entidad_id = ANY($1::text[])`,
          [creados.map(String)],
        );
        await consultar(`DELETE FROM publicacion WHERE id = ANY($1::int[])`, [creados]);
      }
    }
  });

  it('mantiene intactas las tablas usuario, publicacion y bitacora_cambio tras la batería del portal', async () => {
    const conteoFinal = await contarTablasCriticas();
    expect(conteoFinal).toEqual(conteoInicial);
  });
});
