import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { ErrorApp } from '../../src/errores/ErrorApp.js';
import { manejarErrores } from '../../src/middlewares/errores.js';

const app = express();
app.get('/limite', () => {
  throw ErrorApp.demasiadasSolicitudes('Demasiados intentos fallidos.', 754);
});
app.get('/conflicto', () => {
  throw ErrorApp.conflicto('Ya existe.');
});
app.use(manejarErrores);

describe('ErrorApp.demasiadasSolicitudes', () => {
  it('responde 429 con el formato del contrato y la cabecera Retry-After en segundos', async () => {
    const respuesta = await request(app).get('/limite');

    expect(respuesta.status).toBe(429);
    expect(respuesta.headers['retry-after']).toBe('754');
    expect(respuesta.body).toEqual({
      error: {
        codigo: 'DEMASIADAS_SOLICITUDES',
        mensaje: 'Demasiados intentos fallidos.',
        detalles: [],
      },
    });
  });

  it('los demás errores no llevan Retry-After', async () => {
    const respuesta = await request(app).get('/conflicto');

    expect(respuesta.status).toBe(409);
    expect(respuesta.headers['retry-after']).toBeUndefined();
  });
});
