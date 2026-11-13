// GET /api/sedes, GET /api/sedes/:sede y GET /api/sedes/:sede/horarios contra el seed real.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { cerrarPool, consultar } from '../../src/db/index.js';
import { ejemploDelContrato } from '../apoyo/contrato.js';

const app = createApp();
const SEDE = '/api/sedes/senor-de-la-exaltacion';

// Sede inactiva temporal: el seed solo tiene sedes activas.
const slugInactiva = `prueba-inactiva-${randomUUID().slice(0, 8)}`;

beforeAll(async () => {
  await consultar(
    `INSERT INTO sede (tipo_sede_id, nombre, slug, activo)
     VALUES ((SELECT id FROM tipo_sede WHERE nombre = 'Capilla'), 'Capilla de prueba inactiva', $1, false)`,
    [slugInactiva],
  );
});

afterAll(async () => {
  await consultar('DELETE FROM sede WHERE slug = $1', [slugInactiva]);
  await cerrarPool();
});

describe('GET /api/sedes', () => {
  it('coincide con el ejemplo del contrato', async () => {
    const respuesta = await request(app).get('/api/sedes');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual(ejemploDelContrato('## `GET /api/sedes`'));
  });

  it('no incluye las sedes inactivas', async () => {
    const respuesta = await request(app).get('/api/sedes');

    expect(respuesta.body.datos.map((sede) => sede.slug)).not.toContain(slugInactiva);
  });
});

describe('GET /api/sedes/:sede', () => {
  it('coincide con el ejemplo del contrato', async () => {
    const respuesta = await request(app).get(SEDE);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual(ejemploDelContrato('## `GET /api/sedes/:sede`'));
  });

  it('responde una sede sin contenido con null, listas vacías y configuración vacía', async () => {
    const respuesta = await request(app).get('/api/sedes/resurreccion');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos).toEqual({
      id: 2,
      nombre: 'Parroquia de la Resurrección',
      slug: 'resurreccion',
      tipo: { codigo: 'PARROQUIA', nombre: 'Parroquia' },
      sedePadre: null,
      direccion: 'La Paz',
      telefono: null,
      whatsapp: null,
      correo: null,
      ubicacion: null,
      imagenPortada: null,
      redesSociales: [],
      configuracion: {},
    });
  });

  it('incluye la sede padre de una capilla', async () => {
    const respuesta = await request(app).get('/api/sedes/capilla-san-pablo-de-la-cruz');

    expect(respuesta.body.datos.tipo).toEqual({ codigo: 'CAPILLA', nombre: 'Capilla' });
    expect(respuesta.body.datos.sedePadre).toEqual({
      id: 1,
      nombre: 'Parroquia Señor de la Exaltación',
      slug: 'senor-de-la-exaltacion',
    });
  });

  it.each([
    ['inexistente', 'no-existe'],
    ['inactiva', () => slugInactiva],
    ['con mayúsculas', 'Senor-De-La-Exaltacion'],
    ['con espacios', 'con%20espacio'],
  ])('responde 404 para una sede %s', async (_caso, slug) => {
    const valor = typeof slug === 'function' ? slug() : slug;
    const respuesta = await request(app).get(`/api/sedes/${valor}`);

    expect(respuesta.status).toBe(404);
    expect(respuesta.body).toEqual({
      error: {
        codigo: 'NO_ENCONTRADO',
        mensaje: `No existe la sede «${decodeURIComponent(valor)}».`,
        detalles: [],
      },
    });
  });

  it('responde 404 también en las rutas que cuelgan de una sede inexistente', async () => {
    const respuesta = await request(app).get('/api/sedes/no-existe/servicios');

    expect(respuesta.status).toBe(404);
    expect(respuesta.body.error.mensaje).toBe('No existe la sede «no-existe».');
  });
});

describe('GET /api/sedes/:sede/horarios', () => {
  it('coincide con el ejemplo del contrato', async () => {
    const respuesta = await request(app).get(`${SEDE}/horarios`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual(ejemploDelContrato('## `GET /api/sedes/:sede/horarios`'));
  });

  it('filtra por id de tipo de horario', async () => {
    const respuesta = await request(app).get(`${SEDE}/horarios?tipo=2,3`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos.map((grupo) => grupo.tipo.nombre)).toEqual([
      'Confesiones',
      'Adoración',
    ]);
  });

  it('responde una lista vacía para un tipo sin horarios o una sede sin contenido', async () => {
    const sinTipo = await request(app).get(`${SEDE}/horarios?tipo=999`);
    const sinContenido = await request(app).get('/api/sedes/resurreccion/horarios');

    expect(sinTipo.status).toBe(200);
    expect(sinTipo.body).toEqual({ datos: [] });
    expect(sinContenido.status).toBe(200);
    expect(sinContenido.body).toEqual({ datos: [] });
  });

  it('responde 400 si el filtro de tipo no es una lista de ids', async () => {
    const respuesta = await request(app).get(`${SEDE}/horarios?tipo=1,abc`);

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('VALIDACION');
    expect(respuesta.body.error.detalles).toEqual([
      { campo: 'query.tipo.1', mensaje: 'Debe ser un número.' },
    ]);
  });
});
