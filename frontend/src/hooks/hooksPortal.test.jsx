import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';

import { server } from '../mocks/server.js';
import { api } from '../mocks/api.js';
import {
  useSede,
  useComunidades,
  usePagina,
  useHorarios,
  useServicios,
  useEventos,
  usePublicaciones,
  useBoletines,
  useProclamas,
  useGruposPastorales,
  useVideos,
  useCategorias,
} from './index.js';

function crearWrapper() {
  const cliente = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  return function Wrapper({ children }) {
    return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
  };
}

describe('hooks del portal (React Query + MSW)', () => {
  it('obtiene los datos de la sede, páginas y comunidades en éxito', async () => {
    const wrapper = crearWrapper();
    const { result: sede } = renderHook(() => useSede(), { wrapper });
    const { result: inicio } = renderHook(() => usePagina('inicio'), { wrapper });
    const { result: comunidades } = renderHook(() => useComunidades(), { wrapper });

    await waitFor(() => {
      expect(sede.current.isSuccess).toBe(true);
      expect(inicio.current.isSuccess).toBe(true);
      expect(comunidades.current.isSuccess).toBe(true);
    });

    expect(sede.current.data.slug).toBe('senor-de-la-exaltacion');
    expect(inicio.current.data.bloques).toHaveLength(2);
    expect(comunidades.current.data).toHaveLength(3);
  });

  it('obtiene horarios, servicios, eventos, publicaciones, boletines, proclamas, grupos y catálogos', async () => {
    const wrapper = crearWrapper();
    const { result: horarios } = renderHook(() => useHorarios(), { wrapper });
    const { result: servicios } = renderHook(() => useServicios(), { wrapper });
    const { result: eventos } = renderHook(() => useEventos({ porPagina: 4 }), { wrapper });
    const { result: noticias } = renderHook(
      () => usePublicaciones({ tipo: 'NOTICIA,NOTA_DE_PRENSA', porPagina: 3 }),
      { wrapper },
    );
    const { result: boletines } = renderHook(() => useBoletines({ porPagina: 1 }), { wrapper });
    const { result: proclamas } = renderHook(() => useProclamas(), { wrapper });
    const { result: grupos } = renderHook(() => useGruposPastorales(), { wrapper });
    const { result: videos } = renderHook(() => useVideos(), { wrapper });
    const { result: categorias } = renderHook(() => useCategorias(), { wrapper });

    await waitFor(() => {
      expect(horarios.current.isSuccess).toBe(true);
      expect(servicios.current.isSuccess).toBe(true);
      expect(eventos.current.isSuccess).toBe(true);
      expect(noticias.current.isSuccess).toBe(true);
      expect(boletines.current.isSuccess).toBe(true);
      expect(proclamas.current.isSuccess).toBe(true);
      expect(grupos.current.isSuccess).toBe(true);
      expect(videos.current.isSuccess).toBe(true);
      expect(categorias.current.isSuccess).toBe(true);
    });

    expect(horarios.current.data).toHaveLength(4);
    expect(servicios.current.data).toHaveLength(6);
    expect(eventos.current.data.datos).toHaveLength(4);
    expect(noticias.current.data.datos).toHaveLength(3);
    expect(boletines.current.data.datos).toHaveLength(1);
    expect(proclamas.current.data).toHaveLength(3);
    expect(grupos.current.data).toHaveLength(6);
    expect(videos.current.data).toEqual([]);
    expect(categorias.current.data).toHaveLength(4);
  });

  it('informa error cuando la API responde 500', async () => {
    server.use(
      http.get(api('/sedes/:sede/horarios'), () =>
        HttpResponse.json(
          { error: { codigo: 'ERROR_INTERNO', mensaje: 'Fallo interno.' } },
          { status: 500 },
        ),
      ),
    );

    const { result } = renderHook(() => useHorarios(), { wrapper: crearWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error.estado).toBe(500);
    expect(result.current.error.message).toBe('Fallo interno.');
  });

  it('devuelve lista vacía cuando el endpoint responde sin elementos', async () => {
    server.use(
      http.get(api('/sedes/:sede/proclamas'), () => HttpResponse.json({ datos: [] })),
    );

    const { result } = renderHook(() => useProclamas(), { wrapper: crearWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});
