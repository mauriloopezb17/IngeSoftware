import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { z } from 'zod';
import { manejarErrores } from '../../src/middlewares/errores.js';
import { validar } from '../../src/middlewares/validar.js';

const esquemaSede = z.object({ sede: z.string().regex(/^[a-z0-9-]+$/, 'Slug inválido.') });
const esquemaPaginacion = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(50).default(10),
});
const esquemaPublicacion = z
  .object({ titulo: z.string().min(3), destacada: z.boolean().default(false) })
  .strict();

function crearAppDePrueba() {
  const app = express();
  app.use(express.json());

  app.get(
    '/sedes/:sede/publicaciones',
    validar({ params: esquemaSede, query: esquemaPaginacion }),
    (req, res) => res.json({ validado: req.validado, queryOriginal: req.query }),
  );
  app.post(
    '/publicaciones/:id',
    validar({
      params: z.object({ id: z.coerce.number().int().positive() }),
      body: esquemaPublicacion,
    }),
    (req, res) => res.status(201).json({ validado: req.validado }),
  );

  app.use(manejarErrores);
  return app;
}

describe('middleware validar', () => {
  it('deja lo validado en req.validado, con conversiones y valores por defecto', async () => {
    const respuesta = await request(crearAppDePrueba()).get(
      '/sedes/senor-de-la-exaltacion/publicaciones?porPagina=5&desconocido=x',
    );

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.validado).toEqual({
      params: { sede: 'senor-de-la-exaltacion' },
      query: { pagina: 1, porPagina: 5 },
    });
    // req.query no se modifica (en Express 5 es de solo lectura).
    expect(respuesta.body.queryOriginal).toEqual({ porPagina: '5', desconocido: 'x' });
  });

  it('valida el cuerpo y aplica sus valores por defecto', async () => {
    const respuesta = await request(crearAppDePrueba())
      .post('/publicaciones/7')
      .send({ titulo: 'Solemnidad de Cristo Rey' });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.validado).toEqual({
      params: { id: 7 },
      body: { titulo: 'Solemnidad de Cristo Rey', destacada: false },
    });
  });

  it('antepone query. y params. al campo de los errores', async () => {
    const respuesta = await request(crearAppDePrueba()).get(
      '/sedes/Sede_X/publicaciones?pagina=0&porPagina=51',
    );

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('VALIDACION');
    expect(respuesta.body.error.detalles.map((detalle) => detalle.campo)).toEqual([
      'params.sede',
      'query.pagina',
      'query.porPagina',
    ]);
  });

  it('informa juntos los errores de params, query y cuerpo', async () => {
    const respuesta = await request(crearAppDePrueba())
      .post('/publicaciones/-1')
      .send({ titulo: 'a', extra: 1 });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.detalles).toEqual([
      expect.objectContaining({ campo: 'params.id' }),
      expect.objectContaining({ campo: 'titulo' }),
      { campo: 'extra', mensaje: 'Campo no permitido.' },
    ]);
  });

  it('informa como obligatorios los campos de un cuerpo vacío', async () => {
    const respuesta = await request(crearAppDePrueba()).post('/publicaciones/7');

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.detalles).toEqual([
      { campo: 'titulo', mensaje: 'Es obligatorio.' },
    ]);
  });

  it('responde 415 si se espera JSON y llega otro tipo de cuerpo', async () => {
    const respuesta = await request(crearAppDePrueba())
      .post('/publicaciones/7')
      .set('Content-Type', 'text/plain')
      .send('titulo=Cristo Rey');

    expect(respuesta.status).toBe(415);
    expect(respuesta.body.error.codigo).toBe('TIPO_NO_PERMITIDO');
  });

  it('falla al definir la ruta si una parte está mal escrita', () => {
    expect(() => validar({ cuerpo: z.object({}) })).toThrow(/partes desconocidas: cuerpo/);
  });
});
