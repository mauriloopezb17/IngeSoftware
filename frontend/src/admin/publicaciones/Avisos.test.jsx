import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router';

import { clienteHttp } from '../../services/clienteHttp.js';
import { crearQueryClient } from '../../services/queryClient.js';
import { reiniciarMocksAdmin } from '../mocks/handlers.js';
import { CONTRASENA_DESARROLLO } from '../mocks/usuarios.js';
import { useSesion } from '../sesion/SesionContexto.js';
import { SesionProvider } from '../sesion/SesionProvider.jsx';
import { prepararEditorEnJsdom } from './apoyoPruebas.js';
import Publicaciones from './Publicaciones.jsx';

const entrar = (usuario) =>
  clienteHttp.post('/auth/login', { correo: `${usuario}@parroquia.test`, contrasena: CONTRASENA_DESARROLLO });

function Ubicacion() {
  const { pathname } = useLocation();
  return <p data-testid="ubicacion">{pathname}</p>;
}

function ConSesion({ children }) {
  const { cargando } = useSesion();
  return cargando ? null : children;
}

function montar(entrada) {
  const router = createMemoryRouter(
    [
      {
        path: '/admin/publicaciones/*',
        element: (
          <>
            <Publicaciones />
            <Ubicacion />
          </>
        ),
      },
    ],
    { initialEntries: [entrada] },
  );
  render(
    <QueryClientProvider client={crearQueryClient()}>
      <SesionProvider>
        <ConSesion>
          <RouterProvider router={router} />
        </ConSesion>
      </SesionProvider>
    </QueryClientProvider>,
  );
  return router;
}

vi.setConfig({ testTimeout: 30000 });
const esperar = { timeout: 15000 };
const fila = (titulo) => screen.getByRole('row', { name: new RegExp(titulo) });

describe('avisos parroquiales', () => {
  beforeAll(prepararEditorEnJsdom);
  beforeEach(reiniciarMocksAdmin);
  afterEach(reiniciarMocksAdmin);

  it('la pestaña Avisos lista solo avisos, con las pestañas de navegación', async () => {
    await entrar('secretaria');
    montar('/admin/publicaciones/avisos');

    expect(await screen.findByRole('heading', { level: 1, name: 'Avisos' })).toBeInTheDocument();
    await screen.findByRole('table');
    expect(screen.getByText('2 avisos')).toBeInTheDocument();
    expect(fila('secretaría atenderá')).toBeInTheDocument();
    expect(screen.queryByText(/Primeras comuniones/)).not.toBeInTheDocument();

    const pestanas = screen.getByRole('navigation', { name: 'Tipo de publicación' });
    expect(within(pestanas).getByRole('link', { name: 'Avisos' })).toHaveAttribute('aria-current', 'page');
    expect(within(pestanas).getByRole('link', { name: 'Noticias y notas de prensa' })).not.toHaveAttribute('aria-current');
    // El filtro por tipo no tiene sentido aquí.
    expect(screen.queryByRole('combobox', { name: 'Tipo' })).not.toBeInTheDocument();
  });

  it('la pestaña de noticias sigue sin mostrar avisos', async () => {
    await entrar('secretaria');
    montar('/admin/publicaciones');

    await screen.findByRole('table');
    expect(screen.queryByText(/secretaría atenderá/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: 'Avisos' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Avisos' })).toBeInTheDocument();
    expect(screen.getByTestId('ubicacion')).toHaveTextContent('/admin/publicaciones/avisos');
  });

  it('Marketing solo consulta los avisos: aviso de solo lectura y sin botones', async () => {
    await entrar('marketing');
    montar('/admin/publicaciones/avisos');

    await screen.findByRole('table');
    expect(screen.getByRole('note')).toHaveTextContent('Solo lectura');
    expect(screen.queryByRole('link', { name: /Nuevo aviso/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Editar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Archivar|Eliminar|Publicar/ })).not.toBeInTheDocument();
  });

  it('Marketing recibe «sin permiso» al entrar directo a crear un aviso', async () => {
    await entrar('marketing');
    montar('/admin/publicaciones/avisos/nuevo');

    expect(await screen.findByRole('heading', { name: 'Sin permiso' })).toBeInTheDocument();
  });

  it('Secretaría no ve «Nueva publicación» (noticias) pero sí «Nuevo aviso»', async () => {
    await entrar('secretaria');
    montar('/admin/publicaciones/avisos');

    expect(await screen.findByRole('link', { name: /Nuevo aviso/ })).toHaveAttribute('href', '/admin/publicaciones/avisos/nuevo');
    expect(screen.queryByRole('link', { name: /Nueva publicación/ })).not.toBeInTheDocument();
  });

  it('crea un aviso con solo el título y lo publica sin revisión', async () => {
    await entrar('secretaria');
    montar('/admin/publicaciones/avisos/nuevo');
    const usuario = userEvent.setup();

    expect(await screen.findByRole('heading', { level: 1, name: 'Nuevo aviso' })).toBeInTheDocument();
    const tipo = screen.getByRole('combobox', { name: 'Tipo' });
    expect(tipo).toHaveValue('AVISO');
    expect(tipo).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Enviar a revisión' })).not.toBeInTheDocument();

    await usuario.type(screen.getByLabelText('Título'), 'Misa de difuntos el lunes a las 19:00');
    await usuario.click(screen.getByRole('button', { name: 'Publicar' }));

    expect(await screen.findByText('«Misa de difuntos el lunes a las 19:00» se publicó.', {}, esperar)).toBeInTheDocument();
    expect(screen.getByTestId('ubicacion')).toHaveTextContent(/^\/admin\/publicaciones\/avisos$/);
    const nueva = await screen.findByRole('row', { name: /Misa de difuntos/ });
    expect(within(nueva).getByText('Publicada')).toBeInTheDocument();
    expect(within(nueva).getByText('Secretaría (desarrollo)')).toBeInTheDocument();
  });

  it('con una fecha de publicación futura el aviso queda programado', async () => {
    await entrar('secretaria');
    montar('/admin/publicaciones/avisos/nuevo');
    const usuario = userEvent.setup();

    await usuario.type(await screen.findByLabelText('Título'), 'Inscripciones de catequesis');
    fireEvent.change(screen.getByLabelText('Fecha de publicación'), { target: { value: '2999-01-10T08:00' } });
    await usuario.click(screen.getByRole('button', { name: 'Publicar' }));

    expect(await screen.findByText('«Inscripciones de catequesis» quedó programada.', {}, esperar)).toBeInTheDocument();
    expect(within(await screen.findByRole('row', { name: /Inscripciones de catequesis/ })).getByText('Programada')).toBeInTheDocument();
  });

  it('si la publicación falla, el aviso queda como borrador y se muestra el motivo', async () => {
    await entrar('secretaria');
    montar('/admin/publicaciones/avisos/nuevo');
    const usuario = userEvent.setup();

    await usuario.type(await screen.findByLabelText('Título'), 'Aviso con expiración pasada');
    fireEvent.change(screen.getByLabelText('Fecha de publicación'), { target: { value: '2020-01-01T08:00' } });
    fireEvent.change(screen.getByLabelText('Fecha de expiración (opcional)'), { target: { value: '2020-01-02T08:00' } });
    await usuario.click(screen.getByRole('button', { name: 'Publicar' }));

    expect(await screen.findByText(/Se guardó como borrador, pero no se pudo publicar/, {}, esperar)).toBeInTheDocument();
    expect(screen.getByTestId('ubicacion')).toHaveTextContent(/\/admin\/publicaciones\/\d+\/editar/);
    expect(screen.getByRole('heading', { level: 1, name: 'Editar aviso' })).toBeInTheDocument();
  });

  it('edita un aviso publicado (los cambios se guardan sin cambiar el estado)', async () => {
    await entrar('secretaria');
    montar('/admin/publicaciones/avisos');
    const usuario = userEvent.setup();
    await screen.findByRole('table');

    await usuario.click(screen.getByRole('link', { name: /Editar «Inscripciones abiertas/ }));
    const titulo = await screen.findByLabelText('Título', {}, esperar);
    expect(titulo).toHaveValue('Inscripciones abiertas para la catequesis de Confirmación 2027.');
    expect(screen.getByRole('heading', { level: 1, name: 'Editar aviso' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publicar' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver a avisos' })).toHaveAttribute('href', '/admin/publicaciones/avisos');
  });

  it('archiva, restaura y elimina un aviso con confirmación', async () => {
    await entrar('secretaria');
    montar('/admin/publicaciones/avisos');
    const usuario = userEvent.setup();
    await screen.findByRole('table');

    await usuario.click(screen.getByRole('button', { name: /Archivar «El próximo lunes/ }));
    let dialogo = screen.getByRole('dialog', { name: /¿Archivar «El próximo lunes/ });
    await usuario.click(within(dialogo).getByRole('button', { name: 'Archivar' }));
    expect(await screen.findByText(/«El próximo lunes.*» se archivó\./)).toBeInTheDocument();
    expect(await within(fila('El próximo lunes')).findByText('Archivada')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: /Restaurar «El próximo lunes/ }));
    dialogo = screen.getByRole('dialog', { name: /¿Restaurar «El próximo lunes/ });
    await usuario.click(within(dialogo).getByRole('button', { name: 'Restaurar' }));
    expect(await within(fila('El próximo lunes')).findByText('Borrador')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: /Eliminar «El próximo lunes/ }));
    dialogo = screen.getByRole('dialog', { name: /¿Eliminar «El próximo lunes/ });
    await usuario.click(within(dialogo).getByRole('button', { name: 'Eliminar' }));
    const confirmacion = await screen.findByText(/«El próximo lunes.*» se eliminó\./);
    await waitFor(() => expect(confirmacion).toHaveFocus());
    expect(screen.queryByRole('row', { name: /El próximo lunes/ })).not.toBeInTheDocument();
  });
});
