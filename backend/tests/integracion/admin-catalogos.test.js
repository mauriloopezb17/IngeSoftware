// GET /api/admin/catalogos (docs/api/admin.md, sección 1) contra la aplicación real y el seed.
// Las listas se comparan con el ejemplo del contrato, que es lo que usan los mocks del panel.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { esquemasDelSeed } from '../apoyo/bloques.js';
import { ejemploDelContrato } from '../apoyo/contrato.js';
import { crearPanel } from '../apoyo/panel.js';

const { createApp } = await import('../../src/app.js');
const { cerrarPool } = await import('../../src/db/index.js');
const { cerrarRedis } = await import('../../src/db/redis.js');
const request = (await import('supertest')).default;

const app = createApp();
const panel = crearPanel(app);
const { como } = panel;
const RUTA = '/api/admin/catalogos';
const ejemplo = ejemploDelContrato('## 1. Catálogos', 0, 'admin.md').datos;

let datos;

beforeAll(async () => {
  await panel.conSesion('admin', { rol: 'ADMINISTRADOR', sede: null });
  await panel.conSesion('parroco', { rol: 'PARROCO' });
  await panel.conSesion('secretaria', { rol: 'SECRETARIA' });
  await panel.conSesion('marketing', { rol: 'MARKETING' });
  datos = (await como('marketing').get(RUTA)).body.datos;
});

afterAll(async () => {
  await panel.limpiar();
  await cerrarPool();
  await cerrarRedis();
});

describe('GET /api/admin/catalogos', () => {
  it('sin sesión responde 401', async () => {
    expect((await como().get(RUTA)).status).toBe(401);
  });

  it.each(['admin', 'parroco', 'secretaria', 'marketing'])(
    'lo puede consultar %s',
    async (quien) => {
      const respuesta = await como(quien).get(RUTA);
      expect(respuesta.status).toBe(200);
      expect(respuesta.body.datos).toEqual(datos);
    },
  );

  it('trae todos los catálogos del contrato, en ese orden', () => {
    expect(Object.keys(datos)).toEqual(Object.keys(ejemplo));
  });

  it.each([
    'roles',
    'tiposSede',
    'estadosPublicacion',
    'tiposPublicacion',
    'categorias',
    'categoriasEvento',
    'tiposHorario',
    'redesSociales',
  ])('«%s» coincide con el ejemplo del contrato', (catalogo) => {
    expect(datos[catalogo]).toEqual(ejemplo[catalogo]);
  });

  it('los estados van en el orden del flujo, no por id', () => {
    expect(datos.estadosPublicacion.map((estado) => estado.codigo)).toEqual([
      'BORRADOR',
      'EN_REVISION',
      'PUBLICADO',
      'ARCHIVADO',
    ]);
  });

  it('tiposBloque trae los 6 tipos del seed con su esquema completo', () => {
    const esquemas = esquemasDelSeed();
    expect(datos.tiposBloque.map((tipo) => tipo.codigo).sort()).toEqual(
      Object.keys(esquemas).sort(),
    );
    for (const tipo of datos.tiposBloque) {
      expect(Object.keys(tipo)).toEqual(['id', 'codigo', 'nombre', 'esquemaValidacion']);
      expect(tipo.esquemaValidacion).toEqual(esquemas[tipo.codigo]);
    }
    expect(datos.tiposBloque.find((tipo) => tipo.codigo === 'cita')).toEqual(
      ejemplo.tiposBloque[0],
    );
  });

  it('las categorías coinciden con las de los endpoints públicos', async () => {
    const categorias = (await request(app).get('/api/categorias')).body.datos;
    const categoriasEvento = (await request(app).get('/api/categorias-evento')).body.datos;
    const porId = (a, b) => a.id - b.id;

    expect([...categorias].sort(porId)).toEqual(datos.categorias);
    expect(categoriasEvento).toEqual(datos.categoriasEvento);
  });
});
