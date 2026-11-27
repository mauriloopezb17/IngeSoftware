import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

import { api } from '../../../mocks/api.js';
import { server } from '../../../mocks/server.js';
import { clienteHttp } from '../../../services/clienteHttp.js';
import { reiniciarMocksAdmin } from '../../mocks/handlers.js';
import { CONTRASENA_DESARROLLO } from '../../mocks/usuarios.js';
import { SesionProvider } from '../../sesion/SesionProvider.jsx';
import { ProveedorToasts } from '../../ui/index.js';
import { reiniciarMocksContenido } from '../mocks/handlers.js';
import Videos from './Videos.jsx';

const entrar = (rol = 'marketing') =>
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
          <MemoryRouter initialEntries={['/admin/videos']}>
            <Videos />
          </MemoryRouter>
        </SesionProvider>
      </ProveedorToasts>
    </QueryClientProvider>,
  );
}

describe('gestión de videos de YouTube', () => {
  beforeEach(() => {
    reiniciarMocksAdmin();
    reiniciarMocksContenido();
  });

  afterEach(() => {
    reiniciarMocksAdmin();
    reiniciarMocksContenido();
  });

  it('muestra estado vacío inicial y permite crear y editar un video con URL de YouTube', async () => {
    await entrar('marketing');
    montar();
    const usuario = userEvent.setup();

    expect(
      await screen.findByText('No hay videos registrados.'),
    ).toBeInTheDocument();

    await usuario.click(screen.getAllByRole('button', { name: 'Nuevo video' })[0]);
    const dialogo = await screen.findByRole('dialog', { name: 'Nuevo video de YouTube' });
    fireEvent.change(within(dialogo).getByLabelText('URL o ID de YouTube'), {
      target: { value: 'https://www.youtube.com/watch?v=pX7aQm3kR2c' },
    });
    fireEvent.change(within(dialogo).getByLabelText('Título'), {
      target: { value: 'Un recorrido por nuestra parroquia' },
    });
    fireEvent.change(within(dialogo).getByLabelText('Duración en segundos (opcional)'), {
      target: { value: '30' },
    });
    await usuario.click(within(dialogo).getByLabelText('Marcar como video destacado'));
    await usuario.click(within(dialogo).getByRole('button', { name: 'Agregar video' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Se agregó el video «Un recorrido por nuestra parroquia».')).toBeInTheDocument();
    expect(within(await screen.findByRole('table')).getByText('Un recorrido por nuestra parroquia')).toBeInTheDocument();
    expect(screen.getByText('Duración: 0:30')).toBeInTheDocument();

    // Editar
    await usuario.click(
      await screen.findByRole('button', { name: 'Editar «Un recorrido por nuestra parroquia»' }),
    );
    const dialogoEditar = await screen.findByRole('dialog', { name: 'Editar video' });
    const titulo = within(dialogoEditar).getByLabelText('Título');
    fireEvent.change(titulo, { target: { value: 'Recorrido actualizado' } });
    await usuario.click(within(dialogoEditar).getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Se actualizó el video «Recorrido actualizado».')).toBeInTheDocument();
  });

  it('muestra error de validación (400 VALIDACION) junto al campo si la URL de YouTube no es válida', async () => {
    await entrar('marketing');
    montar();
    const usuario = userEvent.setup();

    await screen.findByText('No hay videos registrados.');
    const [btnNuevo] = await screen.findAllByRole('button', { name: 'Nuevo video' });
    await usuario.click(btnNuevo);

    const dialogo = await screen.findByRole('dialog', { name: 'Nuevo video de YouTube' });
    fireEvent.change(within(dialogo).getByLabelText('URL o ID de YouTube'), {
      target: { value: 'https://vimeo.com/123456' },
    });
    fireEvent.change(within(dialogo).getByLabelText('Título'), { target: { value: 'Video inválido' } });
    await usuario.click(within(dialogo).getByRole('button', { name: 'Agregar video' }));

    const campoUrl = await within(dialogo).findByLabelText('URL o ID de YouTube');
    await waitFor(() => expect(campoUrl).toBeInvalid());
    expect(campoUrl).toHaveAccessibleDescription(/Ingresa una URL o identificador válido de YouTube\./);
  });

  it('elimina un video tras confirmación', async () => {
    await entrar('marketing');
    await clienteHttp.post('/admin/videos', {
      youtube: 'https://youtu.be/pX7aQm3kR2c',
      titulo: 'Video a eliminar',
    });
    montar();
    const usuario = userEvent.setup();

    expect(await within(await screen.findByRole('table')).findByText('Video a eliminar')).toBeInTheDocument();
    await usuario.click(await screen.findByRole('button', { name: 'Eliminar «Video a eliminar»' }));

    const confirmacion = await screen.findByRole('dialog', { name: '¿Eliminar «Video a eliminar»?' });
    await usuario.click(within(confirmacion).getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Se eliminó el video «Video a eliminar».')).toBeInTheDocument();
    expect(screen.queryByText('Video a eliminar')).not.toBeInTheDocument();
  });

  it('oculta los botones de reordenar y muestra aviso cuando hay filtros activos', async () => {
    await entrar('marketing');
    await clienteHttp.post('/admin/videos', {
      youtube: 'pX7aQm3kR2c',
      titulo: 'Video A',
    });
    await clienteHttp.post('/admin/videos', {
      youtube: 'dQw4w9WgXcQ',
      titulo: 'Video B',
    });
    montar();
    const usuario = userEvent.setup();

    await within(await screen.findByRole('table')).findByText('Video A');
    expect(screen.getByRole('button', { name: 'Subir «Video A»' })).toBeInTheDocument();

    await usuario.selectOptions(screen.getByLabelText('Destacado'), 'true');
    expect(
      await screen.findByText(/Para reordenar los videos, quita los filtros y asegúrate de ver todos en una sola página/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Subir «Video A»' })).not.toBeInTheDocument();
  });

  it('muestra la vista en solo lectura para un rol sin permiso videos.gestionar', async () => {
    await entrar('secretaria');
    await clienteHttp.post('/admin/videos', {
      youtube: 'pX7aQm3kR2c',
      titulo: 'Video institucional',
    });

    server.use(
      http.get(api('/auth/yo'), () =>
        HttpResponse.json({
          datos: {
            id: 99,
            nombreCompleto: 'Consulta (sin escritura)',
            correo: 'consulta@parroquia.test',
            rol: { codigo: 'CONSULTA', nombre: 'Solo consulta' },
            sede: {
              id: 1,
              nombre: 'Parroquia Señor de la Exaltación',
              slug: 'senor-de-la-exaltacion',
            },
            permisos: [],
          },
        }),
      ),
    );
    montar();

    expect(await within(await screen.findByRole('table')).findByText('Video institucional')).toBeInTheDocument();
    expect(screen.getByText(/Solo lectura:/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nuevo video' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Editar / })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Eliminar / })).not.toBeInTheDocument();
  });
});

