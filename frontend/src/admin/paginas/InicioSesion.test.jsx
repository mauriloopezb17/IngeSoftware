import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

import { api } from '../../mocks/api.js';
import { server } from '../../mocks/server.js';
import { crearQueryClient } from '../../services/queryClient.js';
import { reiniciarMocksAdmin } from '../mocks/handlers.js';
import { CONTRASENA_DESARROLLO } from '../mocks/usuarios.js';
import { SesionProvider } from '../sesion/SesionProvider.jsx';
import Inicio from './Inicio.jsx';
import InicioSesion from './InicioSesion.jsx';

function Ruta() {
  const { pathname, search } = useLocation();
  return <p>ruta: {pathname + search}</p>;
}

function montar(entrada = '/admin/login') {
  return render(
    <QueryClientProvider client={crearQueryClient()}>
      <SesionProvider>
        <MemoryRouter initialEntries={[entrada]}>
          <Routes>
            <Route path="/admin/login" element={<InicioSesion />} />
            <Route path="/admin/inicio" element={<Inicio />} />
            <Route path="/admin/publicaciones" element={<Ruta />} />
            <Route path="*" element={<Ruta />} />
          </Routes>
        </MemoryRouter>
      </SesionProvider>
    </QueryClientProvider>,
  );
}

const campoCorreo = () => screen.findByLabelText('Correo electrónico');
const campoContrasena = () => screen.getByLabelText('Contraseña');
const botonEntrar = () => screen.getByRole('button', { name: 'Iniciar sesión' });

async function escribirYEntrar(correo, contrasena) {
  const usuario = userEvent.setup();
  const campo = await campoCorreo(); // espera a que termine la comprobación de la sesión
  if (correo) await usuario.type(campo, correo);
  if (contrasena) await usuario.type(campoContrasena(), contrasena);
  await usuario.click(botonEntrar());
  return usuario;
}

describe('pantalla de inicio de sesión', () => {
  beforeEach(reiniciarMocksAdmin);
  afterEach(reiniciarMocksAdmin);

  it('muestra el título «Panel de administración» y el formulario', async () => {
    montar();

    expect(await screen.findByRole('heading', { level: 1, name: 'Panel de administración' })).toBeInTheDocument();
    expect(await campoCorreo()).toBeInTheDocument();
    expect(campoContrasena()).toHaveAttribute('type', 'password');
  });

  it('con credenciales correctas abre la sesión y entra al inicio del panel', async () => {
    montar();
    await escribirYEntrar('secretaria@parroquia.test', CONTRASENA_DESARROLLO);

    expect(await screen.findByText('Bienvenido, Secretaría (desarrollo).')).toBeInTheDocument();
  });

  it('con credenciales incorrectas muestra el error del servidor y no entra', async () => {
    montar();
    await escribirYEntrar('secretaria@parroquia.test', 'clave-equivocada');

    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos.');
    expect(screen.getByRole('heading', { name: 'Panel de administración' })).toBeInTheDocument();
    // Se conserva el correo, se limpia la contraseña y el foco vuelve a ella.
    expect(await campoCorreo()).toHaveValue('secretaria@parroquia.test');
    expect(campoContrasena()).toHaveValue('');
    expect(campoContrasena()).toHaveFocus();
  });

  it('valida los campos vacíos sin enviar y asocia cada error a su campo', async () => {
    let peticiones = 0;
    server.use(
      http.post(api('/auth/login'), () => {
        peticiones++;
        return new HttpResponse(null, { status: 500 });
      }),
    );
    montar();
    await escribirYEntrar();

    const correo = await campoCorreo();
    expect(correo).toBeInvalid();
    expect(correo).toHaveAccessibleDescription('Escribe tu correo.');
    expect(campoContrasena()).toHaveAccessibleDescription('Escribe tu contraseña.');
    expect(correo).toHaveFocus();
    expect(peticiones).toBe(0);
  });

  it('rechaza un correo con formato inválido', async () => {
    montar();
    await escribirYEntrar('esto-no-es-un-correo', 'algo');

    expect(await campoCorreo()).toHaveAccessibleDescription(/correo válido/);
  });

  it('muestra los errores de validación del servidor en su campo', async () => {
    server.use(
      http.post(api('/auth/login'), () =>
        HttpResponse.json(
          {
            error: {
              codigo: 'VALIDACION',
              mensaje: 'Los datos enviados no son válidos.',
              detalles: [{ campo: 'correo', mensaje: 'El correo no es válido para el servidor.' }],
            },
          },
          { status: 400 },
        ),
      ),
    );
    montar();
    await escribirYEntrar('a@b.co', 'x');

    expect(await campoCorreo()).toHaveAccessibleDescription('El correo no es válido para el servidor.');
  });

  it('informa el bloqueo por demasiados intentos', async () => {
    montar();
    const usuario = await escribirYEntrar('parroco@parroquia.test', 'mala');
    for (let i = 0; i < 5; i++) {
      await screen.findByRole('alert');
      await usuario.type(campoContrasena(), 'mala');
      await usuario.click(botonEntrar());
    }

    expect(await screen.findByText(/Demasiados intentos fallidos/)).toBeInTheDocument();
  });

  it('permite mostrar y ocultar la contraseña', async () => {
    montar();
    await campoCorreo();
    const usuario = userEvent.setup();

    await usuario.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(campoContrasena()).toHaveAttribute('type', 'text');

    await usuario.click(screen.getByRole('button', { name: 'Ocultar contraseña' }));
    expect(campoContrasena()).toHaveAttribute('type', 'password');
  });

  it('tras iniciar sesión vuelve a la ruta original guardada en el estado', async () => {
    montar({ pathname: '/admin/login', state: { desde: '/admin/publicaciones?pagina=2' } });
    await escribirYEntrar('admin@parroquia.test', CONTRASENA_DESARROLLO);

    expect(await screen.findByText('ruta: /admin/publicaciones?pagina=2')).toBeInTheDocument();
  });

  it('ignora un destino que no sea una ruta interna del panel', async () => {
    montar({ pathname: '/admin/login', state: { desde: 'https://sitio-externo.example/robo' } });
    await escribirYEntrar('admin@parroquia.test', CONTRASENA_DESARROLLO);

    expect(await screen.findByRole('heading', { name: 'Inicio' })).toBeInTheDocument();
  });

  it('si ya hay sesión, no muestra el formulario y redirige', async () => {
    const primera = montar();
    await escribirYEntrar('admin@parroquia.test', CONTRASENA_DESARROLLO);
    await screen.findByText(/Bienvenido/);
    primera.unmount();

    montar(); // la sesión del mock persiste, como tras recargar
    expect(await screen.findByText(/Bienvenido, Administrador/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Correo electrónico')).not.toBeInTheDocument();
  });
});
