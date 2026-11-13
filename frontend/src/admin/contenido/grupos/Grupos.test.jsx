import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

import { clienteHttp } from '../../../services/clienteHttp.js';
import { reiniciarMocksAdmin } from '../../mocks/handlers.js';
import { CONTRASENA_DESARROLLO } from '../../mocks/usuarios.js';
import { SesionProvider } from '../../sesion/SesionProvider.jsx';
import { reiniciarMocksContenido } from '../mocks/handlers.js';
import Grupos from './Grupos.jsx';

const entrar = (rol = 'secretaria') =>
  clienteHttp.post('/auth/login', {
    correo: `${rol}@parroquia.test`,
    contrasena: CONTRASENA_DESARROLLO,
  });

function montar() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <SesionProvider>
        <MemoryRouter initialEntries={['/admin/grupos']}>
          <Grupos />
        </MemoryRouter>
      </SesionProvider>
    </QueryClientProvider>,
  );
}

describe('gestión de grupos pastorales', () => {
  beforeEach(() => {
    reiniciarMocksAdmin();
    reiniciarMocksContenido();
  });

  afterEach(() => {
    reiniciarMocksAdmin();
    reiniciarMocksContenido();
  });

  it('crea un grupo pastoral eligiendo ícono e imagen con SelectorImagenes', async () => {
    await entrar('secretaria');
    montar();
    const usuario = userEvent.setup();

    expect(await screen.findByRole('heading', { level: 2, name: 'Monaguillos' })).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Nuevo grupo' }));

    const dialogo = await screen.findByRole('dialog', { name: 'Nuevo grupo pastoral' });
    await usuario.type(within(dialogo).getByLabelText('Nombre'), 'Pastoral Familiar');
    await usuario.type(within(dialogo).getByLabelText('Horario de reunión (opcional)'), 'Sábados · 17:00');
    await usuario.selectOptions(within(dialogo).getByLabelText('Ícono (opcional)'), 'users');

    await usuario.click(within(dialogo).getByRole('button', { name: 'Elegir imagen' }));
    const selector = await screen.findByRole('dialog', { name: 'Elegir imagen del grupo' });
    const lista = await within(selector).findByRole('list', { name: 'Imágenes' });
    await usuario.click(within(lista).getByRole('button', { name: /pastoral-familiar\.jpg/ }));
    await usuario.click(within(selector).getByRole('button', { name: 'Usar esta imagen' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Elegir imagen del grupo' })).not.toBeInTheDocument(),
    );

    await usuario.click(within(dialogo).getByRole('button', { name: 'Crear grupo' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    expect(screen.getByText('Se creó el grupo «Pastoral Familiar».')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Pastoral Familiar' })).toBeInTheDocument();
  });

  it('edita un grupo pastoral existente', async () => {
    await entrar('secretaria');
    montar();
    const usuario = userEvent.setup();

    await screen.findByRole('heading', { level: 2, name: 'Monaguillos' });
    await usuario.click(screen.getByRole('button', { name: 'Editar Monaguillos' }));

    const dialogo = await screen.findByRole('dialog', { name: 'Editar grupo pastoral' });
    const horario = within(dialogo).getByLabelText('Horario de reunión (opcional)');
    await usuario.clear(horario);
    await usuario.type(horario, 'Sábados · 10:30');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Se actualizó el grupo «Monaguillos».')).toBeInTheDocument();
    expect(screen.getByText('Sábados · 10:30')).toBeInTheDocument();
  });

  it('muestra error de validación (400 VALIDACION) junto al campo', async () => {
    await entrar('secretaria');
    montar();
    const usuario = userEvent.setup();

    await screen.findByRole('heading', { level: 2, name: 'Monaguillos' });
    await usuario.click(screen.getByRole('button', { name: 'Nuevo grupo' }));

    const dialogo = await screen.findByRole('dialog', { name: 'Nuevo grupo pastoral' });
    await usuario.click(within(dialogo).getByRole('button', { name: 'Crear grupo' }));

    const nombre = await within(dialogo).findByLabelText('Nombre');
    await waitFor(() => expect(nombre).toBeInvalid());
    expect(nombre).toHaveAccessibleDescription(/El nombre es obligatorio/);
  });

  it('elimina un grupo pastoral tras confirmación', async () => {
    await entrar('secretaria');
    montar();
    const usuario = userEvent.setup();

    await screen.findByRole('heading', { level: 2, name: 'Catequistas' });
    await usuario.click(screen.getByRole('button', { name: 'Eliminar Catequistas' }));

    const confirmacion = await screen.findByRole('dialog', { name: '¿Eliminar «Catequistas»?' });
    await usuario.click(within(confirmacion).getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Se eliminó el grupo «Catequistas».')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: 'Catequistas' })).not.toBeInTheDocument();
  });

  it('muestra la vista en solo lectura para Marketing', async () => {
    await entrar('marketing');
    montar();

    expect(await screen.findByRole('heading', { level: 2, name: 'Monaguillos' })).toBeInTheDocument();
    expect(screen.getByText(/Solo lectura:/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nuevo grupo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Editar / })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Eliminar / })).not.toBeInTheDocument();
  });
});

