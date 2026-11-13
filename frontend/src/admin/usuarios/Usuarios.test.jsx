import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

import { clienteHttp } from '../../services/clienteHttp.js';
import { reiniciarMocksContenido } from '../contenido/mocks/handlers.js';
import { reiniciarMocksAdmin } from '../mocks/handlers.js';
import { CONTRASENA_DESARROLLO } from '../mocks/usuarios.js';
import { SesionProvider } from '../sesion/SesionProvider.jsx';
import Usuarios from './Usuarios.jsx';

const entrar = (rol = 'admin') =>
  clienteHttp.post('/auth/login', {
    correo: `${rol}@parroquia.test`,
    contrasena: CONTRASENA_DESARROLLO,
  });

function montar() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <SesionProvider>
        <MemoryRouter initialEntries={['/admin/usuarios']}>
          <Usuarios />
        </MemoryRouter>
      </SesionProvider>
    </QueryClientProvider>,
  );
}

describe('gestión de usuarios', () => {
  beforeEach(() => {
    reiniciarMocksAdmin();
    reiniciarMocksContenido();
  });

  afterEach(() => {
    reiniciarMocksAdmin();
    reiniciarMocksContenido();
  });

  it('lista los 4 usuarios de desarrollo, filtra por rol y crea un usuario nuevo', async () => {
    await entrar('admin');
    montar();
    const u = userEvent.setup({ delay: null });

    const lista = await screen.findByRole('list', { name: 'Usuarios' });
    expect(within(lista).getByText('admin@parroquia.test')).toBeInTheDocument();
    expect(within(lista).getByText('parroco@parroquia.test')).toBeInTheDocument();
    expect(within(lista).getByText('secretaria@parroquia.test')).toBeInTheDocument();
    expect(within(lista).getByText('marketing@parroquia.test')).toBeInTheDocument();

    // Crear nuevo usuario con validación de contraseña < 10 y correo repetido
    await u.click(screen.getByRole('button', { name: /Nuevo usuario/ }));
    const dialogo = await screen.findByRole('dialog', { name: 'Nuevo usuario' });
    await u.type(within(dialogo).getByLabelText('Nombre completo'), 'María Elena Quispe');
    await u.type(within(dialogo).getByLabelText('Correo electrónico'), 'ADMIN@parroquia.test');
    await u.type(within(dialogo).getByLabelText('Contraseña inicial'), 'corta');
    await u.click(within(dialogo).getByRole('button', { name: 'Crear usuario' }));
    expect(await within(dialogo).findByText(/al menos 10 caracteres/i)).toBeInTheDocument();

    await u.clear(within(dialogo).getByLabelText('Contraseña inicial'));
    await u.type(within(dialogo).getByLabelText('Contraseña inicial'), 'Temporal-Obrajes-2026');
    await u.click(within(dialogo).getByRole('button', { name: 'Crear usuario' }));
    expect(await within(dialogo).findByRole('alert')).toHaveTextContent(/Ya existe un usuario/i);

    await u.clear(within(dialogo).getByLabelText('Correo electrónico'));
    await u.type(
      within(dialogo).getByLabelText('Correo electrónico'),
      'secretaria.obrajes@parroquia.test',
    );
    await u.click(within(dialogo).getByRole('button', { name: 'Crear usuario' }));

    expect(await screen.findByText('María Elena Quispe')).toBeInTheDocument();

    // Filtro por rol
    await u.selectOptions(screen.getByLabelText('Rol'), 'MARKETING');
    const listaFiltrada = await screen.findByRole('list', { name: 'Usuarios' });
    expect(within(listaFiltrada).getByText('marketing@parroquia.test')).toBeInTheDocument();
    expect(within(listaFiltrada).queryByText('María Elena Quispe')).not.toBeInTheDocument();
  }, 15000);

  it('edita rol/sede, desactiva, restablece contraseña y bloquea desactivar al último Administrador', async () => {
    await entrar('admin');
    montar();
    const u = userEvent.setup({ delay: null });

    await screen.findByRole('list', { name: 'Usuarios' });

    // No se puede desactivar ni quitar rol al propio / último Administrador
    await u.click(screen.getByRole('button', { name: 'Desactivar a Administrador (desarrollo)' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/No puedes desactivar tu propia cuenta/i);

    await u.click(screen.getByRole('button', { name: 'Editar a Administrador (desarrollo)' }));
    const dialogoAdmin = await screen.findByRole('dialog', {
      name: 'Editar usuario «Administrador (desarrollo)»',
    });
    await u.selectOptions(within(dialogoAdmin).getByLabelText('Rol'), 'PARROCO');
    await u.click(within(dialogoAdmin).getByRole('button', { name: 'Guardar cambios' }));
    expect(await within(dialogoAdmin).findByRole('alert')).toHaveTextContent(
      /No puedes quitarte el rol de Administrador/i,
    );
    await u.click(within(dialogoAdmin).getByRole('button', { name: 'Cancelar' }));

    // Editar y desactivar/activar otro usuario
    await u.click(screen.getByRole('button', { name: 'Desactivar a Marketing (desarrollo)' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      /Se desactivó la cuenta de «Marketing \(desarrollo\)»/,
    );
    expect(
      screen.getByRole('button', { name: 'Activar a Marketing (desarrollo)' }),
    ).toBeInTheDocument();

    // Restablecer contraseña
    await u.click(
      screen.getByRole('button', { name: 'Restablecer contraseña de Secretaría (desarrollo)' }),
    );
    const dialogoPass = await screen.findByRole('dialog', {
      name: 'Restablecer contraseña de «Secretaría (desarrollo)»',
    });
    await u.type(within(dialogoPass).getByLabelText('Nueva contraseña'), 'NuevaClaveSegura2026!');
    await u.click(within(dialogoPass).getByRole('button', { name: 'Restablecer contraseña' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      /Se restableció la contraseña de «Secretaría \(desarrollo\)»/,
    );
  }, 15000);

  it('el endpoint responde 403 si intenta acceder un rol sin usuarios.gestionar', async () => {
    await entrar('parroco');
    await expect(clienteHttp.get('/admin/usuarios')).rejects.toMatchObject({
      estado: 403,
      codigo: 'SIN_PERMISO',
    });
  });
});

