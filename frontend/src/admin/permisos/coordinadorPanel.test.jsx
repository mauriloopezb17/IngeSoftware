import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';

import { clienteHttp } from '../../services/clienteHttp.js';
import { crearQueryClient } from '../../services/queryClient.js';
import GuardiaSeccion from '../componentes/GuardiaSeccion.jsx';
import LayoutPanel from '../componentes/LayoutPanel.jsx';
import { reiniciarMocksAdmin } from '../mocks/handlers.js';
import { CONTRASENA_DESARROLLO } from '../mocks/usuarios.js';
import Inicio from '../paginas/Inicio.jsx';
import ListadoPublicaciones from '../publicaciones/ListadoPublicaciones.jsx';
import FormularioPublicacion from '../publicaciones/FormularioPublicacion.jsx';
import { SesionProvider } from '../sesion/SesionProvider.jsx';
import { ProveedorToasts } from '../ui/index.js';

async function entrarCoordinador() {
  await clienteHttp.post('/auth/login', {
    correo: 'coordinador@parroquia.test',
    contrasena: CONTRASENA_DESARROLLO,
  });
}

function montar(entrada = '/admin/inicio') {
  const router = createMemoryRouter(
    [
      {
        element: <LayoutPanel />,
        children: [
          { path: '/admin/inicio', element: <Inicio /> },
          { path: '/admin/publicaciones', element: <ListadoPublicaciones /> },
          { path: '/admin/publicaciones/nueva', element: <FormularioPublicacion /> },
          {
            path: '/admin/eventos',
            element: <GuardiaSeccion clave="eventos" />,
            children: [{ index: true, element: <h1>Eventos</h1> }],
          },
        ],
      },
    ],
    { initialEntries: [entrada] },
  );

  return render(
    <QueryClientProvider client={crearQueryClient()}>
      <ProveedorToasts>
        <SesionProvider>
          <RouterProvider router={router} />
        </SesionProvider>
      </ProveedorToasts>
    </QueryClientProvider>,
  );
}

describe('Panel del Coordinador de grupo', () => {
  beforeEach(reiniciarMocksAdmin);
  afterEach(reiniciarMocksAdmin);

  it('muestra Inicio, Noticias de mis grupos, Mis grupos y Multimedia en el menú y el resumen de sus grupos', async () => {
    await entrarCoordinador();
    montar('/admin/inicio');

    await screen.findByText('Coordinador (desarrollo)');
    const menu = screen.getByRole('navigation', { name: 'Menú principal' });
    const enlaces = within(menu).getAllByRole('link');
    expect(enlaces.map((e) => e.textContent)).toEqual([
      'Inicio',
      'Noticias de mis grupos',
      'Mis grupos',
      'Multimedia',
    ]);

    expect(await screen.findByRole('heading', { name: 'Mis grupos' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Monaguillos' })).toHaveAttribute('href', '/admin/grupos');
  });

  it('en Noticias de mis grupos preselecciona su único grupo y oculta sacramentos', async () => {
    await entrarCoordinador();
    montar('/admin/publicaciones/nueva');

    expect(await screen.findByRole('group', { name: 'Grupos relacionados' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Sacramentos y servicios' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quitar Monaguillos' })).toBeInTheDocument();
  });

  it('muestra aviso de acceso denegado al entrar a otra sección como /admin/eventos', async () => {
    await entrarCoordinador();
    montar('/admin/eventos');

    expect(await screen.findByText(/no tiene acceso a esta sección/i)).toBeInTheDocument();
  });
});
