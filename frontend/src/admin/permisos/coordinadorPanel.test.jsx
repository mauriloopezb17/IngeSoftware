import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';

import { clienteHttp } from '../../services/clienteHttp.js';
import { crearQueryClient } from '../../services/queryClient.js';
import GuardiaSeccion from '../componentes/GuardiaSeccion.jsx';
import LayoutPanel from '../componentes/LayoutPanel.jsx';
import { reiniciarMocksAdmin } from '../mocks/handlers.js';
import { CONTRASENA_DESARROLLO } from '../mocks/usuarios.js';
import Inicio from '../paginas/Inicio.jsx';
import { SesionProvider } from '../sesion/SesionProvider.jsx';
import { ProveedorToasts } from '../ui/index.js';

async function entrarCoordinador() {
  await clienteHttp.post('/auth/login', {
    correo: 'coordinador@parroquia.test',
    contrasena: CONTRASENA_DESARROLLO,
  });
}

function montar(entrada = '/admin/inicio') {
  return render(
    <QueryClientProvider client={crearQueryClient()}>
      <ProveedorToasts>
        <SesionProvider>
          <MemoryRouter initialEntries={[entrada]}>
            <Routes>
              <Route element={<LayoutPanel />}>
                <Route path="/admin/inicio" element={<Inicio />} />
                <Route path="/admin/eventos" element={<GuardiaSeccion clave="eventos" />}>
                  <Route index element={<h1>Eventos</h1>} />
                </Route>
              </Route>
            </Routes>
          </MemoryRouter>
        </SesionProvider>
      </ProveedorToasts>
    </QueryClientProvider>,
  );
}

describe('Panel del Coordinador de grupo', () => {
  beforeEach(reiniciarMocksAdmin);
  afterEach(reiniciarMocksAdmin);

  it('muestra solo Inicio, Mis grupos y Multimedia en el menú y el resumen de sus grupos', async () => {
    await entrarCoordinador();
    montar('/admin/inicio');

    await screen.findByText('Coordinador (desarrollo)');
    const menu = screen.getByRole('navigation', { name: 'Menú principal' });
    const enlaces = within(menu).getAllByRole('link');
    expect(enlaces.map((e) => e.textContent)).toEqual(['Inicio', 'Mis grupos', 'Multimedia']);

    expect(await screen.findByRole('heading', { name: 'Mis grupos' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Monaguillos' })).toHaveAttribute('href', '/admin/grupos');
  });

  it('muestra aviso de acceso denegado al entrar a otra sección como /admin/eventos', async () => {
    await entrarCoordinador();
    montar('/admin/eventos');

    expect(await screen.findByText(/no tiene acceso a esta sección/i)).toBeInTheDocument();
  });
});
