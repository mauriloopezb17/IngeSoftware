import { describe, it, expect } from 'vitest';

import { clienteHttp, ErrorApi } from '../../services/clienteHttp.js';

describe('handlersPortal (MSW)', () => {
  it('devuelve las sedes activas y el detalle de la sede principal', async () => {
    const lista = await clienteHttp.get('/sedes');
    const detalle = await clienteHttp.get('/sedes/senor-de-la-exaltacion');

    expect(lista.datos).toHaveLength(3);
    expect(detalle.datos.slug).toBe('senor-de-la-exaltacion');
    expect(detalle.datos.redesSociales).toHaveLength(3);
  });

  it('responde 404 NO_ENCONTRADO cuando la sede no existe', async () => {
    const error = await clienteHttp
      .get('/sedes/parroquia-x/horarios')
      .catch((capturado) => capturado);

    expect(error).toBeInstanceOf(ErrorApi);
    expect(error.estado).toBe(404);
    expect(error.codigo).toBe('NO_ENCONTRADO');
  });

  it('filtra publicaciones por tipo y devuelve paginación', async () => {
    const avisos = await clienteHttp.get('/sedes/senor-de-la-exaltacion/publicaciones', {
      parametros: { tipo: 'AVISO', porPagina: 3 },
    });
    const noticias = await clienteHttp.get('/sedes/senor-de-la-exaltacion/publicaciones', {
      parametros: { tipo: 'NOTICIA,NOTA_DE_PRENSA', porPagina: 3 },
    });

    expect(avisos.datos).toHaveLength(3);
    expect(avisos.datos.every((item) => item.tipo.codigo === 'AVISO')).toBe(true);
    expect(avisos.paginacion).toEqual({ pagina: 1, porPagina: 3, total: 3, totalPaginas: 1 });

    expect(noticias.datos).toHaveLength(3);
    expect(noticias.datos[0].slug).toBe('encuentro-pastoral-familiar-duelo');
  });

  it('limita boletines con porPagina=1 y devuelve fechas futuras en eventos', async () => {
    const boletines = await clienteHttp.get('/sedes/senor-de-la-exaltacion/boletines', {
      parametros: { porPagina: 1 },
    });
    const eventos = await clienteHttp.get('/sedes/senor-de-la-exaltacion/eventos', {
      parametros: { porPagina: 4 },
    });

    expect(boletines.datos).toHaveLength(1);
    expect(boletines.paginacion.porPagina).toBe(1);
    expect(eventos.datos).toHaveLength(4);
    expect(new Date(eventos.datos[0].fechaInicio).getTime()).toBeGreaterThan(Date.now());
  });
});
