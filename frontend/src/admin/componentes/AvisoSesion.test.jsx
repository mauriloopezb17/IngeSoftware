import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';

import { clienteHttp } from '../../services/clienteHttp.js';
import { crearQueryClient } from '../../services/queryClient.js';
import { reiniciarMocksAdmin } from '../mocks/handlers.js';
import { guardarSesionMock, obtenerSesionMock } from '../mocks/sesionMock.js';
import { CONTRASENA_DESARROLLO, fechaBolivia } from '../mocks/usuarios.js';
import { CLAVE_SESION_VENCIDA } from '../sesion/api.js';
import { SesionProvider } from '../sesion/SesionProvider.jsx';
import { formatearHora } from '../sesion/vencimiento.js';
import AvisoSesion from './AvisoSesion.jsx';

const MIN = 60 * 1000;

// Entra como Marketing y fija cuándo vence la sesión simulada (`sesionExpiraEn`) antes de montar el panel.
async function sesionQueVenceEn(ms) {
  await clienteHttp.post('/auth/login', { correo: 'marketing@parroquia.test', contrasena: CONTRASENA_DESARROLLO });
  const expiraEn = fechaBolivia(new Date(Date.now() + ms));
  guardarSesionMock({ ...obtenerSesionMock(), sesionExpiraEn: expiraEn });
  return expiraEn;
}

function montar() {
  const cliente = crearQueryClient();
  render(
    <QueryClientProvider client={cliente}>
      <SesionProvider>
        <MemoryRouter initialEntries={['/admin/inicio']}>
          <Routes>
            <Route path="/admin/inicio" element={<><h1>Pantalla con trabajo sin guardar</h1><AvisoSesion /></>} />
            <Route path="/admin/login" element={<h1>Iniciar sesión</h1>} />
          </Routes>
        </MemoryRouter>
      </SesionProvider>
    </QueryClientProvider>,
  );
  return cliente;
}

const aviso = () => screen.findByRole('region', { name: 'Estado de la sesión' });

describe('aviso de sesión por vencer', () => {
  beforeEach(reiniciarMocksAdmin);
  afterEach(reiniciarMocksAdmin);

  it('no muestra nada mientras falta tiempo', async () => {
    await sesionQueVenceEn(8 * 60 * MIN);
    montar();

    await screen.findByRole('heading', { name: 'Pantalla con trabajo sin guardar' });
    expect(screen.queryByRole('region', { name: 'Estado de la sesión' })).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('avisa unos minutos antes con la hora de vencimiento, sin bloquear la pantalla', async () => {
    const expiraEn = await sesionQueVenceEn(3 * MIN);
    montar();

    const region = await aviso();
    const alerta = within(region).getByRole('alert');
    expect(alerta).toHaveTextContent(`Tu sesión vence a las ${formatearHora(expiraEn)}`);
    expect(alerta).toHaveTextContent('Guarda tu trabajo o renueva la sesión.');
    // No es un diálogo modal: lo de abajo sigue disponible.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pantalla con trabajo sin guardar' })).toBeVisible();
    // La cuenta atrás es visual: no se anuncia cada segundo.
    expect(within(region).getByText(/Quedan \d+ min/)).toHaveAttribute('aria-hidden', 'true');
    expect(within(region).queryByLabelText(/Contraseña/)).not.toBeInTheDocument();
  });

  it('«Renovar sesión» pide la contraseña del mismo usuario (foco en el campo) y se puede dejar para después', async () => {
    await sesionQueVenceEn(3 * MIN);
    montar();
    const usuario = userEvent.setup();

    await usuario.click(await screen.findByRole('button', { name: 'Renovar sesión' }));

    const campo = await screen.findByLabelText('Contraseña de marketing@parroquia.test');
    expect(campo).toHaveFocus();
    expect(campo).toHaveAttribute('type', 'password');

    await usuario.click(screen.getByRole('button', { name: 'Ahora no' }));
    expect(screen.queryByLabelText(/Contraseña de/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Renovar sesión' })).toBeInTheDocument();
  });

  it('con la contraseña correcta renueva la sesión sin salir de la pantalla y lo confirma', async () => {
    await sesionQueVenceEn(3 * MIN);
    montar();
    const usuario = userEvent.setup();

    await usuario.click(await screen.findByRole('button', { name: 'Renovar sesión' }));
    await usuario.type(await screen.findByLabelText(/Contraseña de/), CONTRASENA_DESARROLLO);
    await usuario.click(within(await aviso()).getByRole('button', { name: 'Renovar sesión' }));

    expect(await screen.findByRole('status')).toHaveTextContent(/Sesión renovada\. Vence a las \d{2}:\d{2}\./);
    expect(screen.queryByRole('region', { name: 'Estado de la sesión' })).not.toBeInTheDocument();
    // La pantalla no se tocó.
    expect(screen.getByRole('heading', { name: 'Pantalla con trabajo sin guardar' })).toBeInTheDocument();
  });

  it('con una contraseña incorrecta muestra el error de la API y no cambia nada', async () => {
    await sesionQueVenceEn(3 * MIN);
    montar();
    const usuario = userEvent.setup();

    await usuario.click(await screen.findByRole('button', { name: 'Renovar sesión' }));
    const campo = await screen.findByLabelText(/Contraseña de/);
    await usuario.type(campo, 'incorrecta');
    await usuario.click(within(await aviso()).getByRole('button', { name: 'Renovar sesión' }));

    const error = await within(await aviso()).findByText('Correo o contraseña incorrectos.');
    expect(error).toHaveAttribute('role', 'alert');
    expect(campo).toHaveAttribute('aria-invalid', 'true');
    expect(campo).toHaveAccessibleDescription('Correo o contraseña incorrectos.');
    expect(campo).toHaveFocus();
  });

  it('no envía una contraseña vacía', async () => {
    await sesionQueVenceEn(3 * MIN);
    montar();
    const usuario = userEvent.setup();

    await usuario.click(await screen.findByRole('button', { name: 'Renovar sesión' }));
    await usuario.click(within(await aviso()).getByRole('button', { name: 'Renovar sesión' }));

    expect(await within(await aviso()).findByText('Escribe tu contraseña.')).toBeInTheDocument();
  });

  it('con la sesión vencida ofrece volver a entrar ahí mismo, sin perder la pantalla', async () => {
    await sesionQueVenceEn(-MIN);
    montar();
    const usuario = userEvent.setup();

    const region = await aviso();
    expect(within(region).getByRole('alert')).toHaveTextContent('Tu sesión venció.');
    expect(within(region).getByRole('alert')).toHaveTextContent('Lo que no guardaste sigue en esta pantalla');
    // El formulario ya está abierto, pero no le quita el foco a lo que la persona esté escribiendo.
    const campo = within(region).getByLabelText('Contraseña de marketing@parroquia.test');
    expect(campo).not.toHaveFocus();

    await usuario.type(campo, CONTRASENA_DESARROLLO);
    await usuario.click(within(region).getByRole('button', { name: 'Volver a entrar' }));

    await waitFor(() => expect(screen.queryByRole('region', { name: 'Estado de la sesión' })).not.toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'Pantalla con trabajo sin guardar' })).toBeInTheDocument();
  });

  it('un 401 de la API (aunque la hora no haya llegado) también marca la sesión como vencida', async () => {
    await sesionQueVenceEn(8 * 60 * MIN);
    const cliente = montar();
    await screen.findByRole('heading', { name: 'Pantalla con trabajo sin guardar' });
    expect(screen.queryByRole('region', { name: 'Estado de la sesión' })).not.toBeInTheDocument();

    cliente.setQueryData(CLAVE_SESION_VENCIDA, true);

    expect(await within(await aviso()).findByText(/Tu sesión venció\./)).toBeInTheDocument();
  });

  it('«Ir al inicio de sesión» cierra la sesión y avisa que se pierde lo no guardado', async () => {
    await sesionQueVenceEn(-MIN);
    montar();
    const usuario = userEvent.setup();

    const region = await aviso();
    expect(within(region).getByText('Si sales ahora, se pierde lo que no guardaste.')).toBeInTheDocument();
    await usuario.click(within(region).getByRole('button', { name: 'Ir al inicio de sesión' }));

    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });

  it('sin sesión no muestra nada', async () => {
    montar();

    await waitFor(() => expect(screen.queryByRole('region')).not.toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
