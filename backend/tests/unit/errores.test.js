import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { z } from 'zod';
import { CODIGOS_ERROR, ErrorApp } from '../../src/errores/ErrorApp.js';
import { manejarErrores, rutaNoEncontrada } from '../../src/middlewares/errores.js';

// Se controla si el entorno es de producción sin tocar process.env.
const entornoSimulado = vi.hoisted(() => ({ esProduccion: false }));
vi.mock('../../src/config/entorno.js', () => ({
  obtenerEntorno: () => entornoSimulado,
}));

// App mínima con rutas que lanzan cada tipo de error y los middlewares de la API.
function crearAppDePrueba() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.post('/eco', (req, res) => res.json(req.body));
  app.get('/conflicto', () => {
    throw ErrorApp.conflicto('El slug ya existe en esta sede.', [
      { campo: 'slug', mensaje: 'Ya está en uso.' },
    ]);
  });
  app.get('/zod', () => {
    z.object({
      titulo: z.string().min(3, 'Mínimo 3 caracteres.'),
      contenido: z.object({ bloques: z.array(z.object({ type: z.string() })) }),
    })
      .strict()
      .parse({ titulo: 'a', contenido: { bloques: [{}] }, extra: true });
  });
  app.get('/inesperado', async () => {
    throw new Error('detalle interno de la base de datos');
  });
  app.get('/item/:id', (req, res) => res.json({ id: req.params.id }));

  app.use(rutaNoEncontrada);
  app.use(manejarErrores);
  return app;
}

describe('ErrorApp', () => {
  it('toma el estado HTTP del código del contrato', () => {
    const error = ErrorApp.noEncontrado('No existe la sede «x».');

    expect(error).toBeInstanceOf(Error);
    expect(error.estado).toBe(404);
    expect(error.codigo).toBe('NO_ENCONTRADO');
    expect(error.aRespuesta()).toEqual({
      error: { codigo: 'NO_ENCONTRADO', mensaje: 'No existe la sede «x».', detalles: [] },
    });
  });

  it('tiene los 9 códigos del contrato con su estado', () => {
    expect(CODIGOS_ERROR).toEqual({
      VALIDACION: 400,
      NO_AUTENTICADO: 401,
      SIN_PERMISO: 403,
      NO_ENCONTRADO: 404,
      CONFLICTO: 409,
      ARCHIVO_DEMASIADO_GRANDE: 413,
      TIPO_NO_PERMITIDO: 415,
      DEMASIADAS_SOLICITUDES: 429,
      ERROR_INTERNO: 500,
    });
  });

  it('rechaza un código que no está en el contrato', () => {
    expect(() => new ErrorApp('NO_EXISTE', 'x')).toThrow(TypeError);
  });
});

describe('manejo centralizado de errores', () => {
  beforeEach(() => {
    entornoSimulado.esProduccion = false;
  });

  it('responde 404 con el formato del contrato y sin la query', async () => {
    const respuesta = await request(crearAppDePrueba()).get('/no-existe?pagina=2');

    expect(respuesta.status).toBe(404);
    expect(respuesta.body).toEqual({
      error: {
        codigo: 'NO_ENCONTRADO',
        mensaje: 'No existe la ruta GET /no-existe.',
        detalles: [],
      },
    });
  });

  it('respeta el estado, el código y los detalles de un ErrorApp', async () => {
    const respuesta = await request(crearAppDePrueba()).get('/conflicto');

    expect(respuesta.status).toBe(409);
    expect(respuesta.body.error).toEqual({
      codigo: 'CONFLICTO',
      mensaje: 'El slug ya existe en esta sede.',
      detalles: [{ campo: 'slug', mensaje: 'Ya está en uso.' }],
    });
  });

  it('convierte un error de Zod en VALIDACION con la ruta de cada campo', async () => {
    const respuesta = await request(crearAppDePrueba()).get('/zod');

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('VALIDACION');
    expect(respuesta.body.error.detalles).toEqual([
      { campo: 'titulo', mensaje: 'Mínimo 3 caracteres.' },
      { campo: 'contenido.bloques.0.type', mensaje: 'Es obligatorio.' },
      { campo: 'extra', mensaje: 'Campo no permitido.' },
    ]);
  });

  it('responde 400 si el cuerpo no es un JSON válido', async () => {
    const respuesta = await request(crearAppDePrueba())
      .post('/eco')
      .set('Content-Type', 'application/json')
      .send('{"titulo": ');

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('VALIDACION');
  });

  it('responde 413 si el cuerpo supera 1 MB', async () => {
    const respuesta = await request(crearAppDePrueba())
      .post('/eco')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ texto: 'a'.repeat(1_100_000) }));

    expect(respuesta.status).toBe(413);
    expect(respuesta.body.error.codigo).toBe('ARCHIVO_DEMASIADO_GRANDE');
  });

  it('responde 415 si el cuerpo no viene en UTF-8', async () => {
    const respuesta = await request(crearAppDePrueba())
      .post('/eco')
      .set('Content-Type', 'application/json; charset=latin9')
      .send('{}');

    expect(respuesta.status).toBe(415);
    expect(respuesta.body.error.codigo).toBe('TIPO_NO_PERMITIDO');
  });

  it('responde 400 si un parámetro de ruta está mal codificado', async () => {
    const respuesta = await request(crearAppDePrueba()).get('/item/%E0%A4%A');

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('VALIDACION');
  });

  it('oculta el detalle de un error inesperado e incluye la traza fuera de producción', async () => {
    const respuesta = await request(crearAppDePrueba()).get('/inesperado');

    expect(respuesta.status).toBe(500);
    expect(respuesta.body.error.codigo).toBe('ERROR_INTERNO');
    expect(respuesta.body.error.mensaje).toBe(
      'Ocurrió un error inesperado. Intenta de nuevo más tarde.',
    );
    expect(respuesta.body.error.traza).toContain('detalle interno de la base de datos');
  });

  it('no envía la traza en producción', async () => {
    entornoSimulado.esProduccion = true;

    const respuesta = await request(crearAppDePrueba()).get('/inesperado');

    expect(respuesta.status).toBe(500);
    expect(respuesta.body.error).not.toHaveProperty('traza');
    expect(JSON.stringify(respuesta.body)).not.toContain('detalle interno');
  });
});
