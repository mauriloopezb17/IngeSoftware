import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';

import { rutas } from './router.jsx';
import { queryClient } from './services/queryClient.js';
import { crearClientePruebas } from './test/utilidadesQuery.jsx';

// La portada completa (video, imágenes) no es necesaria para probar el enrutado.
vi.mock('./pages/InicioParroquia.jsx', () => ({
  default: () => <h1>Portada simulada</h1>,
}));

function renderizarRuta(ruta) {
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] });
  const cliente = crearClientePruebas();
  return render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('rutas del frontend', () => {
  afterEach(() => {
    queryClient.clear();
    window.sessionStorage.clear();
  });

  it('muestra la portada en /', async () => {
    renderizarRuta('/');

    expect(await screen.findByRole('heading', { name: 'Portada simulada' })).toBeInTheDocument();
  });

  it('muestra el listado de noticias en /noticias', async () => {
    renderizarRuta('/noticias');

    expect(await screen.findByRole('heading', { name: 'Noticias' })).toBeInTheDocument();
  });

  it('muestra el detalle de una noticia con su slug', async () => {
    renderizarRuta('/noticias/primeras-comuniones-42-ninos');

    expect(
      await screen.findByRole('heading', {
        name: 'Primeras comuniones: 42 niños recibieron a Jesús',
      }),
    ).toBeInTheDocument();
  });

  it('carga el panel de administración de forma diferida', async () => {
    renderizarRuta('/admin/noticias');

    // cargarAdmin() dispara import('./admin/AdminApp.jsx') bajo demanda; con la suite en paralelo
    // Vite transforma el árbol completo del panel dentro de esta ventana y supera los 1000 ms por defecto.
    expect(
      await screen.findByRole('heading', { name: 'Panel de administración' }, { timeout: 5000 }),
    ).toBeInTheDocument();
  });

  it('muestra la página 404 en rutas desconocidas', async () => {
    renderizarRuta('/esta-ruta-no-existe');

    expect(await screen.findByRole('heading', { name: 'Página no encontrada' })).toBeInTheDocument();
  });
});
