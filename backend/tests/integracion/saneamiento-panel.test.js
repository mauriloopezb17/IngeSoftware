// Saneamiento de parámetros en listados del panel (PAR-161.3):
// inyección SQL, tipos erróneos, arreglos, límites, parámetros desconocidos,
// cadenas largas, caracteres de control, comodines literales y estado intacto de la BD.
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { cerrarPool, consultar } from '../../src/db/index.js';
import { cerrarRedis } from '../../src/db/redis.js';
import { crearPanel, sedePrincipal } from '../apoyo/panel.js';

const app = createApp();
const panel = crearPanel(app);
let sede;

const INYECCIONES_SQL = ['1;DROP TABLE usuario', "' OR '1'='1", '%', '_', '\\', '1 UNION SELECT'];

const PAYLOADS_BUSCAR = ["' OR '1'='1", '1;DROP TABLE usuario', '1 UNION SELECT', '%', '_', '\\'];

const ENDPOINTS_PANEL = [
  {
    nombre: 'publicaciones',
    ruta: '/api/admin/publicaciones',
    rol: 'admin',
    filtros: ['sede', 'tipo', 'estado', 'categoria', 'autor'],
    porPaginaMax: 50,
    tieneBuscarEnModelo: true,
  },
  {
    nombre: 'eventos',
    ruta: '/api/admin/eventos',
    rol: 'admin',
    filtros: ['sede', 'desde', 'hasta', 'categoria', 'estado', 'finalizados'],
    porPaginaMax: 50,
    tieneBuscarEnModelo: true,
  },
  {
    nombre: 'proclamas',
    ruta: '/api/admin/proclamas',
    rol: 'admin',
    filtros: ['sede', 'vigentes', 'anio'],
    porPaginaMax: 50,
    tieneBuscarEnModelo: true,
  },
  {
    nombre: 'observaciones',
    ruta: '/api/admin/proclamas/observaciones',
    rol: 'parroco',
    filtros: ['estado', 'proclamaId'],
    porPaginaMax: 50,
    tieneBuscarEnModelo: false,
  },
  {
    nombre: 'boletines',
    ruta: '/api/admin/boletines',
    rol: 'admin',
    filtros: ['sede', 'anio'],
    porPaginaMax: 50,
    tieneBuscarEnModelo: true,
  },
  {
    nombre: 'multimedia',
    ruta: '/api/admin/multimedia',
    rol: 'admin',
    filtros: ['sede', 'clase', 'enUso'],
    porPaginaMax: 50,
    tieneBuscarEnModelo: true,
  },
  {
    nombre: 'usuarios',
    ruta: '/api/admin/usuarios',
    rol: 'admin',
    filtros: ['rol', 'sede', 'activo'],
    porPaginaMax: 50,
    tieneBuscarEnModelo: true,
  },
  {
    nombre: 'bitacora',
    ruta: '/api/admin/bitacora',
    rol: 'admin',
    filtros: ['entidad', 'entidadId', 'usuario', 'accion', 'desde', 'hasta'],
    porPaginaMax: 50,
    tieneBuscarEnModelo: false,
  },
  {
    nombre: 'horarios',
    ruta: '/api/admin/horarios',
    rol: 'admin',
    filtros: ['sede', 'tipo', 'activo'],
    porPaginaMax: 100,
    tieneBuscarEnModelo: true,
  },
  {
    nombre: 'servicios',
    ruta: '/api/admin/servicios',
    rol: 'admin',
    filtros: ['sede', 'visible'],
    porPaginaMax: 100,
    tieneBuscarEnModelo: true,
  },
  {
    nombre: 'grupos pastorales',
    ruta: '/api/admin/grupos-pastorales',
    rol: 'admin',
    filtros: ['sede', 'visible'],
    porPaginaMax: 100,
    tieneBuscarEnModelo: true,
  },
  {
    nombre: 'videos',
    ruta: '/api/admin/videos',
    rol: 'admin',
    filtros: ['sede', 'destacado'],
    porPaginaMax: 100,
    tieneBuscarEnModelo: true,
  },
  {
    nombre: 'paginas',
    ruta: '/api/admin/paginas',
    rol: 'admin',
    filtros: ['sede', 'estado', 'mostrarEnMenu'],
    porPaginaMax: 100,
    tieneBuscarEnModelo: true,
  },
  {
    nombre: 'sedes',
    ruta: '/api/admin/sedes',
    rol: 'admin',
    filtros: ['tipo', 'activo'],
    porPaginaMax: 100,
    tieneBuscarEnModelo: true,
  },
];

function esperarValidacion(respuesta, campo) {
  expect(respuesta.status).toBe(400);
  expect(respuesta.body?.error?.codigo).toBe('VALIDACION');
  expect(typeof respuesta.body?.error?.mensaje).toBe('string');
  const campos = (respuesta.body?.error?.detalles ?? []).map((d) => d.campo);
  const prefijo = `query.${campo}`;
  expect(campos.some((c) => c === prefijo || c.startsWith(`${prefijo}.`))).toBe(true);
  sinFugasInternas(respuesta);
}

function sinFugasInternas(respuesta) {
  const texto = JSON.stringify(respuesta.body ?? {});
  expect(texto).not.toMatch(/\bSELECT\b|pg_|node_modules|\bat\s+[^\s]+\.(?:js|mjs)|"stack"/i);
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

const getConRol = (rol, url) => request(app).get(url).set('Cookie', panel.sesiones[rol]);

let conteoInicial;

beforeAll(async () => {
  sede = await sedePrincipal();
  await panel.conSesion('admin', { rol: 'ADMINISTRADOR', sede: null });
  await panel.conSesion('parroco', { rol: 'PARROCO', sede: sede.slug });
  conteoInicial = await contarTablasCriticas();
});

afterAll(async () => {
  await Promise.all([panel.limpiar(), cerrarPool(), cerrarRedis()]);
});

describe('saneamiento de parámetros en listados del panel (PAR-161.3)', () => {
  it.each(ENDPOINTS_PANEL)(
    '$nombre: rechaza tipos erróneos, límites, arreglos, desconocidos, control y texto largo en paginación y filtros',
    async ({ ruta, rol, filtros, porPaginaMax, tieneBuscarEnModelo }) => {
      // 1. Tipos erróneos, límites y arreglos en pagina y porPagina
      for (const valorPagina of ['abc', '1.5', '0', '-1', '2147483648']) {
        esperarValidacion(
          await getConRol(rol, `${ruta}?pagina=${encodeURIComponent(valorPagina)}`),
          'pagina',
        );
      }
      esperarValidacion(await getConRol(rol, `${ruta}?pagina=1&pagina=2`), 'pagina');

      for (const valorPorPagina of [
        'abc',
        '1.5',
        '0',
        '-1',
        String(porPaginaMax + 1),
        '2147483648',
      ]) {
        esperarValidacion(
          await getConRol(rol, `${ruta}?porPagina=${encodeURIComponent(valorPorPagina)}`),
          'porPagina',
        );
      }
      esperarValidacion(await getConRol(rol, `${ruta}?porPagina=1&porPagina=2`), 'porPagina');

      // 2. Parámetro desconocido
      esperarValidacion(await getConRol(rol, `${ruta}?desconocido=1`), 'desconocido');

      // 3. Inyección SQL en orden y en cada filtro propio
      for (const payload of INYECCIONES_SQL) {
        esperarValidacion(
          await getConRol(rol, `${ruta}?orden=${encodeURIComponent(payload)}`),
          'orden',
        );
        for (const filtro of filtros) {
          // entidadId (1..40 chars) y entidad ('_' cumple ^[a-z_]{1,60}$) son sintácticamente válidos para ciertos payloads.
          if (filtro === 'entidadId' || (filtro === 'entidad' && payload === '_')) {
            const resp = await getConRol(rol, `${ruta}?${filtro}=${encodeURIComponent(payload)}`);
            expect([200, 400]).toContain(resp.status);
            sinFugasInternas(resp);
            continue;
          }
          esperarValidacion(
            await getConRol(rol, `${ruta}?${filtro}=${encodeURIComponent(payload)}`),
            filtro,
          );
        }
      }

      // 4. buscar: arreglo, cadena de 10 000 caracteres y caracteres de control (%00, %0A, %1B)
      esperarValidacion(await getConRol(rol, `${ruta}?buscar=a&buscar=b`), 'buscar');
      esperarValidacion(await getConRol(rol, `${ruta}?buscar=${'x'.repeat(10000)}`), 'buscar');
      for (const control of ['a%00b', 'a%0Ab', 'a%1Bb']) {
        esperarValidacion(await getConRol(rol, `${ruta}?buscar=${control}`), 'buscar');
      }

      // 5. buscar con cadenas SQL legales devuelve 200 sin fugas ni devolver toda la tabla
      for (const payload of PAYLOADS_BUSCAR) {
        const resp = await getConRol(rol, `${ruta}?buscar=${encodeURIComponent(payload)}`);
        expect(resp.status).toBe(200);
        sinFugasInternas(resp);
        if (tieneBuscarEnModelo && payload === "' OR '1'='1") {
          expect(resp.body.paginacion.total).toBe(0);
          expect(resp.body.datos).toEqual([]);
        }
      }
    },
  );

  it('trata % y _ en buscar como texto literal y no como comodines ILIKE', async () => {
    const prefijo = `San-${Date.now()}`;
    const titulos = [
      `${prefijo} Colecta 100% real`,
      `${prefijo} Colecta 1000 normal`,
      `${prefijo} Grupo A_B literal`,
      `${prefijo} Grupo AXB distinto`,
    ];
    const creados = [];

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

    try {
      for (const titulo of titulos) {
        const res = await panel.como('admin').post('/api/admin/publicaciones', {
          sedeId: sede.id,
          tipo: 'AVISO',
          titulo,
          contenido,
        });
        expect(res.status).toBe(201);
        creados.push(res.body.datos.id);
      }

      const conPorcentaje = await getConRol(
        'admin',
        `/api/admin/publicaciones?buscar=${encodeURIComponent(`${prefijo} Colecta 100%`)}`,
      );
      expect(conPorcentaje.status).toBe(200);
      expect(conPorcentaje.body.datos.map((p) => p.titulo)).toEqual([
        `${prefijo} Colecta 100% real`,
      ]);

      const conGuionBajo = await getConRol(
        'admin',
        `/api/admin/publicaciones?buscar=${encodeURIComponent(`${prefijo} Grupo A_B`)}`,
      );
      expect(conGuionBajo.status).toBe(200);
      expect(conGuionBajo.body.datos.map((p) => p.titulo)).toEqual([
        `${prefijo} Grupo A_B literal`,
      ]);
    } finally {
      for (const id of creados) {
        await panel.como('admin').delete(`/api/admin/publicaciones/${id}`);
      }
      // Limpiamos los registros de bitácora generados por esta prueba aislada para comprobar
      // que la batería de saneamiento por sí sola dejó la base intacta.
      if (creados.length > 0) {
        await consultar(
          `DELETE FROM bitacora_cambio WHERE entidad = 'publicacion' AND entidad_id = ANY($1::text[])`,
          [creados.map(String)],
        );
      }
    }
  });

  it('mantiene intactas las tablas usuario, publicacion y bitacora_cambio tras la batería de casos', async () => {
    const conteoFinal = await contarTablasCriticas();
    expect(conteoFinal).toEqual(conteoInicial);
  });
});
