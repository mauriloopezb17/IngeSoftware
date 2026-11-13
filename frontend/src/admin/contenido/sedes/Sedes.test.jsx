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
import Sedes from './Sedes.jsx';

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
        <MemoryRouter initialEntries={['/admin/sedes']}>
          <Sedes />
        </MemoryRouter>
      </SesionProvider>
    </QueryClientProvider>,
  );
}

describe('edición de datos de la sede y redes sociales', () => {
  beforeEach(() => {
    reiniciarMocksAdmin();
    reiniciarMocksContenido();
  });

  afterEach(() => {
    reiniciarMocksAdmin();
    reiniciarMocksContenido();
  });

  it('Secretaría edita directamente su sede (sin selector), configuración y redes sociales', async () => {
    await entrar('secretaria');
    montar();
    const usuario = userEvent.setup({ delay: null });

    expect(await screen.findByDisplayValue('Parroquia Señor de la Exaltación')).toBeInTheDocument();
    expect(screen.queryByLabelText('Sede a editar')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nueva sede' })).not.toBeInTheDocument();

    const campoWhatsapp = screen.getByLabelText('WhatsApp');
    await usuario.type(campoWhatsapp, '+591 71234567');

    const avisoBarra = screen.getByLabelText('Aviso en la barra superior');
    await usuario.clear(avisoBarra);
    await usuario.type(avisoBarra, 'Hoy: Santa Misa 19:00');

    await usuario.click(screen.getByRole('button', { name: 'Agregar red social' }));
    await usuario.selectOptions(screen.getByLabelText('Red social 4'), '4');
    await usuario.type(screen.getByLabelText('URL 4'), 'https://www.tiktok.com/@parroquia');

    await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(
      await screen.findByText('Se guardaron los cambios de «Parroquia Señor de la Exaltación».'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('WhatsApp')).toHaveValue('+591 71234567');
  }, 15000);

  it('muestra error de validación (400 VALIDACION) junto al campo si la URL de red social no usa https', async () => {
    await entrar('secretaria');
    montar();
    const usuario = userEvent.setup();

    await screen.findByDisplayValue('Parroquia Señor de la Exaltación');
    const url1 = screen.getByLabelText('URL 1');
    await usuario.clear(url1);
    await usuario.type(url1, 'http://facebook.com/invalido');
    await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(url1).toBeInvalid());
    expect(url1).toHaveAccessibleDescription(/La URL de la red social debe comenzar con https:\/\/\./);
  });

  it('Administrador ve el selector de sedes y puede crear una nueva sede', async () => {
    await entrar('admin');
    montar();
    const usuario = userEvent.setup();

    const selector = await screen.findByLabelText('Sede a editar');
    expect(selector).toBeInTheDocument();
    expect(within(selector).getAllByRole('option')).toHaveLength(3);

    await usuario.click(screen.getByRole('button', { name: 'Nueva sede' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Nueva sede' });
    await usuario.type(within(dialogo).getByLabelText('Nombre'), 'Capilla Santa Gema');
    await usuario.type(within(dialogo).getByLabelText('Dirección (opcional)'), 'Obrajes, La Paz');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Crear sede' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Se creó la sede «Capilla Santa Gema».')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre de la sede')).toHaveValue('Capilla Santa Gema');
  });

  it('muestra la vista en solo lectura para Marketing', async () => {
    await entrar('marketing');
    montar();

    expect(await screen.findByDisplayValue('Parroquia Señor de la Exaltación')).toBeInTheDocument();
    expect(screen.getByText(/Solo lectura:/)).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre de la sede')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Agregar red social' })).not.toBeInTheDocument();
  });
});

