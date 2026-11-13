import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';

import { clienteHttp } from '../../services/clienteHttp.js';
import { crearQueryClient } from '../../services/queryClient.js';
import { reiniciarMocksAdmin } from '../mocks/handlers.js';
import { CONTRASENA_DESARROLLO } from '../mocks/usuarios.js';
import { SesionProvider } from '../sesion/SesionProvider.jsx';
import GuardiaSeccion from './GuardiaSeccion.jsx';

function montar() {
  return render(
    <QueryClientProvider client={crearQueryClient()}>
      <SesionProvider>
        <MemoryRouter initialEntries={['/admin/usuarios']}>
          <Routes>
            <Route path="/admin/inicio" element={<h1>Inicio</h1>} />
            <Route path="/admin/usuarios" element={<GuardiaSeccion clave="usuarios" />}>
              <Route index element={<h1>Gestión de usuarios</h1>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </SesionProvider>
    </QueryClientProvider>,
  );
}

const iniciarSesion = (correo) => clienteHttp.post('/auth/login', { correo, contrasena: CONTRASENA_DESARROLLO });

describe('guardia de sección', () => {
  beforeEach(reiniciarMocksAdmin);
  afterEach(reiniciarMocksAdmin);

  it('muestra «sin permiso» a un rol que no puede entrar, no el contenido', async () => {
    await iniciarSesion('marketing@parroquia.test');
    montar();

    // Fuera de RutaProtegida, la guardia puede verse un instante antes de que cargue el usuario.
    expect(await screen.findByText(/Tu rol \(Marketing\) no tiene acceso/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sin permiso' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/admin/inicio');
    expect(screen.queryByRole('heading', { name: 'Gestión de usuarios' })).not.toBeInTheDocument();
  });

  it('deja pasar a un rol con permiso', async () => {
    await iniciarSesion('admin@parroquia.test');
    montar();

    expect(await screen.findByRole('heading', { name: 'Gestión de usuarios' })).toBeInTheDocument();
  });
});
