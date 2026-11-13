import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

import { api } from '../../../mocks/api.js';
import { server } from '../../../mocks/server.js';
import { clienteHttp } from '../../../services/clienteHttp.js';
import { reiniciarMocksAdmin } from '../../mocks/handlers.js';
import { CONTRASENA_DESARROLLO } from '../../mocks/usuarios.js';
import { SesionProvider } from '../../sesion/SesionProvider.jsx';
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
      <SesionProvider>
        <MemoryRouter initialEntries={['/admin/videos']}>
          <Videos />
        </MemoryRouter>
      </SesionProvider>
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
      await screen.findByText('Todavía no hay videos de YouTube registrados.'),
    ).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Nuevo video' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Nuevo video de YouTube' });
    await usuario.type(
      within(dialogo).getByLabelText('URL o ID de YouTube'),
      'https://www.youtube.com/watch?v=pX7aQm3kR2c',
    );
    await usuario.type(within(dialogo).getByLabelText('Título'), 'Un recorrido por nuestra parroquia');
    await usuario.type(within(dialogo).getByLabelText('Duración en segundos (opcional)'), '30');
    await usuario.click(within(dialogo).getByLabelText('Marcar como video destacado'));
    await usuario.click(within(dialogo).getByRole('button', { name: 'Agregar video' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Se agregó el video «Un recorrido por nuestra parroquia».')).toBeInTheDocument();
    expect(screen.getByText('ID: pX7aQm3kR2c')).toBeInTheDocument();
    expect(screen.getByText('Duración: 0:30')).toBeInTheDocument();

    // Editar
    await usuario.click(screen.getByRole('button', { name: 'Editar Un recorrido por nuestra parroquia' }));
    const dialogoEditar = await screen.findByRole('dialog', { name: 'Editar video' });
    const titulo = within(dialogoEditar).getByLabelText('Título');
    await usuario.clear(titulo);
    await usuario.type(titulo, 'Recorrido actualizado');
    await usuario.click(within(dialogoEditar).getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Se actualizó el video «Recorrido actualizado».')).toBeInTheDocument();
  });

  it('muestra error de validación (400 VALIDACION) junto al campo si la URL de YouTube no es válida', async () => {
    await entrar('marketing');
    montar();
    const usuario = userEvent.setup();

    await screen.findByText('Todavía no hay videos de YouTube registrados.');
    await usuario.click(screen.getByRole('button', { name: 'Nuevo video' }));

    const dialogo = await screen.findByRole('dialog', { name: 'Nuevo video de YouTube' });
    await usuario.type(within(dialogo).getByLabelText('URL o ID de YouTube'), 'https://vimeo.com/123456');
    await usuario.type(within(dialogo).getByLabelText('Título'), 'Video inválido');
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

    expect(await screen.findByRole('heading', { level: 2, name: 'Video a eliminar' })).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Eliminar Video a eliminar' }));

    const confirmacion = await screen.findByRole('dialog', { name: '¿Eliminar «Video a eliminar»?' });
    await usuario.click(within(confirmacion).getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Se eliminó el video «Video a eliminar».')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: 'Video a eliminar' })).not.toBeInTheDocument();
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

    expect(await screen.findByRole('heading', { level: 2, name: 'Video institucional' })).toBeInTheDocument();
    expect(screen.getByText(/Solo lectura:/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nuevo video' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Editar / })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Eliminar / })).not.toBeInTheDocument();
  });
});

