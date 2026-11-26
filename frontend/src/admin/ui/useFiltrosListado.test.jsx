import { act, renderHook } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useFiltrosListado } from './useFiltrosListado.js';

function crearWrapper(rutaInicial = '/admin/publicaciones') {
  return function Wrapper({ children }) {
    return <MemoryRouter initialEntries={[rutaInicial]}>{children}</MemoryRouter>;
  };
}

describe('useFiltrosListado', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('lee filtros, búsqueda, orden y página desde la URL e ignora valores inválidos', () => {
    const config = {
      filtros: {
        estado: { defecto: '', validar: (v) => ['BORRADOR', 'PUBLICADO'].includes(v) },
        soloMias: { defecto: false, tipo: 'booleano', claveApi: 'autor', valorApiSiTrue: 'yo' },
      },
      ordenDefecto: '-fecha',
      ordenesValidos: ['-fecha', 'titulo'],
      porPagina: 20,
    };

    const { result: valido } = renderHook(() => useFiltrosListado(config), {
      wrapper: crearWrapper('/admin/publicaciones?estado=BORRADOR&soloMias=true&pagina=3&buscar=pascua&orden=titulo'),
    });

    expect(valido.current.pagina).toBe(3);
    expect(valido.current.valores).toEqual({ estado: 'BORRADOR', soloMias: true });
    expect(valido.current.busqueda).toBe('pascua');
    expect(valido.current.orden).toBe('titulo');
    expect(valido.current.filtrosActivos).toEqual({
      pagina: 3,
      porPagina: 20,
      buscar: 'pascua',
      orden: 'titulo',
      estado: 'BORRADOR',
      autor: 'yo',
    });

    const { result: invalido } = renderHook(() => useFiltrosListado(config), {
      wrapper: crearWrapper('/admin/publicaciones?estado=ROTO&soloMias=quizas&pagina=-5&orden=drop_table'),
    });

    expect(invalido.current.pagina).toBe(1);
    expect(invalido.current.valores).toEqual({ estado: '', soloMias: false });
    expect(invalido.current.orden).toBe('-fecha');
    expect(invalido.current.filtrosActivos).toEqual({
      pagina: 1,
      porPagina: 20,
      orden: '-fecha',
    });
  });

  it('al cambiar un filtro o buscar vuelve a la página 1 y espera 300 ms para la búsqueda', () => {
    vi.useFakeTimers();
    const config = {
      filtros: { estado: { defecto: '' } },
      porPagina: 10,
    };

    const { result } = renderHook(
      () => ({
        listado: useFiltrosListado(config),
        ubicacion: useLocation(),
      }),
      { wrapper: crearWrapper('/admin/publicaciones?pagina=4') },
    );

    expect(result.current.listado.pagina).toBe(4);

    act(() => {
      result.current.listado.actualizarFiltro('estado', 'PUBLICADO');
    });

    expect(result.current.listado.pagina).toBe(1);
    expect(result.current.ubicacion.search).toBe('?estado=PUBLICADO');

    act(() => {
      result.current.listado.setPagina(2);
    });
    expect(result.current.listado.pagina).toBe(2);

    act(() => {
      result.current.listado.setBusqueda('navidad');
    });
    // Antes de 300 ms la URL aún no cambia
    expect(result.current.ubicacion.search).not.toContain('buscar=');

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.listado.pagina).toBe(1);
    expect(result.current.ubicacion.search).toContain('buscar=navidad');
    expect(result.current.ubicacion.search).not.toContain('pagina=');

    act(() => {
      result.current.listado.limpiarFiltros();
    });
    expect(result.current.ubicacion.search).toBe('');
    expect(result.current.listado.hayFiltrosActivos).toBe(false);
  });
});
