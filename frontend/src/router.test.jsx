import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';

import { rutas } from './router.jsx';
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
  it('muestra la portada en /', async () => {
    renderizarRuta('/');

    expect(await screen.findByRole('heading', { name: 'Portada simulada' })).toBeInTheDocument();
  });

  it('muestra el listado de noticias en /noticias', async () => {
    renderizarRuta('/noticias');

    expect(await screen.findByRole('heading', { name: 'Noticias' })).toBeInTheDocument();
  });

  it('muestra el detalle de una noticia con su slug', async () => {
    renderizarRuta('/noticias/primeras-comuniones');

    expect(await screen.findByText(/primeras-comuniones/)).toBeInTheDocument();
  });

  it('carga el panel de administración de forma diferida', async () => {
    renderizarRuta('/admin/noticias');

    expect(
      await screen.findByRole('heading', { name: 'Panel de administración' }),
    ).toBeInTheDocument();
  });

  it('muestra la página 404 en rutas desconocidas', async () => {
    renderizarRuta('/esta-ruta-no-existe');

    expect(await screen.findByRole('heading', { name: 'Página no encontrada' })).toBeInTheDocument();
  });
});
