import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { http, HttpResponse } from 'msw';

import { clienteHttp } from '../../../services/clienteHttp.js';
import { api } from '../../../mocks/api.js';
import { server } from '../../../mocks/server.js';
import { reiniciarMocksAdmin } from '../../mocks/handlers.js';
import { CONTRASENA_DESARROLLO } from '../../mocks/usuarios.js';
import { SesionProvider } from '../../sesion/SesionProvider.jsx';
import { ProveedorToasts } from '../../ui/index.js';
import { reiniciarMocksContenido } from '../mocks/handlers.js';
import Sedes from './Sedes.jsx';

const entrar = (rol = 'admin') =>
  clienteHttp.post('/auth/login', {
    correo: `${rol}@parroquia.test`,
    contrasena: CONTRASENA_DESARROLLO,
  });

function montar() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <ProveedorToasts>
        <SesionProvider>
          <MemoryRouter initialEntries={['/admin/sedes']}>
            <Sedes />
          </MemoryRouter>
        </SesionProvider>
      </ProveedorToasts>
    </QueryClientProvider>,
  );
}

describe('gestión de jerarquía de sedes en el panel', () => {
  beforeEach(() => {
    reiniciarMocksAdmin();
    reiniciarMocksContenido();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    reiniciarMocksAdmin();
    reiniciarMocksContenido();
  });

  it('filtra el selector de Sede superior según el tipo y lo vacía al elegir un tipo raíz', async () => {
    await entrar('admin');
    montar();
    const usuario = userEvent.setup({ delay: null });

    await screen.findByRole('table');
    await usuario.click(screen.getByRole('button', { name: 'Nueva sede' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Nueva sede' });

    const selectTipo = within(dialogo).getByLabelText('Tipo de sede');
    const selectPadre = within(dialogo).getByLabelText('Sede superior');

    // Por defecto es CAPILLA: solo ofrece parroquias (no la Capilla San Pablo de la Cruz)
    expect(within(selectPadre).getByText('Parroquia Señor de la Exaltación')).toBeInTheDocument();
    expect(within(selectPadre).queryByText('Capilla San Pablo de la Cruz')).not.toBeInTheDocument();
    expect(within(dialogo).getByText('Una capilla depende de una parroquia.')).toBeInTheDocument();

    await usuario.selectOptions(selectPadre, '1');
    expect(selectPadre).toHaveValue('1');

    // Cambiar a COMUNIDAD: ahora ofrece parroquias y capillas
    await usuario.selectOptions(selectTipo, 'COMUNIDAD');
    expect(within(selectPadre).getByText('Capilla San Pablo de la Cruz')).toBeInTheDocument();
    expect(
      within(dialogo).getByText('Una comunidad depende de una parroquia o una capilla.'),
    ).toBeInTheDocument();

    // Cambiar a COMUNIDAD_PASIONISTA: se vacía y deshabilita
    await usuario.selectOptions(selectTipo, 'COMUNIDAD_PASIONISTA');
    expect(selectPadre).toBeDisabled();
    expect(selectPadre).toHaveValue('');
  });

  it('muestra la pestaña Jerarquía con el árbol y permite mover y reordenar sedes', async () => {
    await entrar('admin');
    const espiaPost = vi.spyOn(clienteHttp, 'post');
    montar();
    const usuario = userEvent.setup({ delay: null });

    await screen.findByRole('table');
    await usuario.click(screen.getByRole('tab', { name: 'Jerarquía' }));

    expect(
      await screen.findByRole('heading', { name: 'Parroquias, capillas y comunidades' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Comunidad pasionista' })).toBeInTheDocument();

    // Reordenar parroquias (subir la segunda: Parroquia Señor de la Exaltación)
    const btnSubir = screen.getByRole('button', { name: 'Subir «Parroquia Señor de la Exaltación»' });
    await usuario.click(btnSubir);

    await waitFor(() => {
      expect(espiaPost).toHaveBeenCalledWith('/admin/sedes/1/mover', {
        sedePadreId: null,
        orden: 0,
      });
      expect(espiaPost).toHaveBeenCalledWith('/admin/sedes/2/mover', {
        sedePadreId: null,
        orden: 1,
      });
    });

    // Abrir diálogo Mover sobre la capilla
    await usuario.click(screen.getByRole('button', { name: 'Mover «Capilla San Pablo de la Cruz»' }));
    const dialogo = await screen.findByRole('dialog', {
      name: 'Mover «Capilla San Pablo de la Cruz»',
    });

    await usuario.selectOptions(within(dialogo).getByLabelText('Sede superior'), '2');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar ubicación' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(espiaPost).toHaveBeenCalledWith('/admin/sedes/3/mover', {
      sedePadreId: 2,
      orden: 0,
    });
  });

  it('muestra errores 400 y 409 del servidor en los formularios', async () => {
    await entrar('admin');
    server.use(
      http.post(api('/admin/sedes/:id/mover'), () =>
        HttpResponse.json(
          {
            error: {
              codigo: 'VALIDACION',
              mensaje: 'Error de validación.',
              detalles: [{ campo: 'sedePadreId', mensaje: 'Una sede no puede depender de sí misma.' }],
            },
          },
          { status: 400 },
        ),
      ),
    );

    montar();
    const usuario = userEvent.setup({ delay: null });

    await screen.findByRole('table');
    await usuario.click(screen.getByRole('tab', { name: 'Jerarquía' }));
    await usuario.click(
      await screen.findByRole('button', { name: 'Mover «Capilla San Pablo de la Cruz»' }),
    );
    const dialogo = await screen.findByRole('dialog');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar ubicación' }));

    const selectPadre = within(dialogo).getByLabelText('Sede superior');
    await waitFor(() => expect(selectPadre).toBeInvalid());
    expect(selectPadre).toHaveAccessibleDescription(/Una sede no puede depender de sí misma\./);
  });

  it('no muestra la pestaña Jerarquía ni acciones de mover a Secretaría', async () => {
    await entrar('secretaria');
    montar();

    expect(await screen.findByDisplayValue('Parroquia Señor de la Exaltación')).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Jerarquía' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Mover/ })).not.toBeInTheDocument();
  });
});
