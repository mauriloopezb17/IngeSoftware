import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';

import { api } from '../../mocks/api.js';
import { server } from '../../mocks/server.js';
import { clienteHttp } from '../../services/clienteHttp.js';
import { crearQueryClient } from '../../services/queryClient.js';
import { reiniciarMocksAdmin } from '../mocks/handlers.js';
import { CONTRASENA_DESARROLLO, crearSesion, usuariosSeed } from '../mocks/usuarios.js';
import { SECCIONES } from '../rutas.js';
import { SesionProvider } from '../sesion/SesionProvider.jsx';
import LayoutPanel from './LayoutPanel.jsx';

async function iniciarSesion(correo) {
  await clienteHttp.post('/auth/login', { correo, contrasena: CONTRASENA_DESARROLLO });
}

function montar(entrada = '/admin/inicio') {
  return render(
    <QueryClientProvider client={crearQueryClient()}>
      <SesionProvider>
        <MemoryRouter initialEntries={[entrada]}>
          <Routes>
            <Route path="/admin/login" element={<h1>Pantalla de login</h1>} />
            <Route element={<LayoutPanel />}>
              <Route path="/admin/inicio" element={<h1>Contenido de inicio</h1>} />
              <Route path="/admin/eventos" element={<h1>Contenido de eventos</h1>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </SesionProvider>
    </QueryClientProvider>,
  );
}

describe('layout del panel', () => {
  beforeEach(reiniciarMocksAdmin);
  afterEach(reiniciarMocksAdmin);

  it('muestra el menú con todas las secciones y marca la activa', async () => {
    await iniciarSesion('admin@parroquia.test');
    montar();

    await screen.findByText('Administrador (desarrollo)'); // el menú se arma cuando carga el usuario
    const menu = screen.getByRole('navigation', { name: 'Menú principal' });
    const enlaces = within(menu).getAllByRole('link');
    expect(enlaces.map((e) => e.textContent)).toEqual(SECCIONES.map((s) => s.titulo));
    expect(within(menu).getByRole('link', { name: 'Inicio' })).toHaveAttribute('aria-current', 'page');
    expect(within(menu).getByRole('link', { name: 'Eventos' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('heading', { name: 'Contenido de inicio' })).toBeInTheDocument();
  });

  it('cambia de pantalla al elegir una sección', async () => {
    await iniciarSesion('admin@parroquia.test');
    montar();

    await userEvent.click(await screen.findByRole('link', { name: 'Eventos' }));

    expect(await screen.findByRole('heading', { name: 'Contenido de eventos' })).toBeInTheDocument();
  });

  it('muestra el usuario, su rol y su sede', async () => {
    await iniciarSesion('secretaria@parroquia.test');
    montar();

    expect(await screen.findByText('Secretaría (desarrollo)')).toBeInTheDocument();
    expect(screen.getByText('Secretaría · Parroquia Señor de la Exaltación')).toBeInTheDocument();
  });

  it('soporta un usuario sin sede (Administrador de todas las sedes)', async () => {
    // Usuario de prueba con sede null; los 4 usuarios del seed no cambian.
    const sinSede = crearSesion({ ...usuariosSeed[0], sede: null });
    server.use(http.get(api('/auth/yo'), () => HttpResponse.json({ datos: sinSede })));
    montar();

    expect(await screen.findByText('Administrador · Todas las sedes')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Menú principal' })).toBeInTheDocument();
  });

  it('en móvil el botón abre y cierra el menú, y gestiona el foco', async () => {
    await iniciarSesion('admin@parroquia.test');
    montar();
    const usuario = userEvent.setup();
    const abrir = await screen.findByRole('button', { name: 'Abrir menú' });
    expect(abrir).toHaveAttribute('aria-expanded', 'false');
    expect(abrir).toHaveAttribute('aria-controls', 'menu-panel');

    await usuario.click(abrir);
    expect(abrir).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Cerrar menú' })).toHaveFocus();

    await usuario.keyboard('{Escape}');
    expect(abrir).toHaveAttribute('aria-expanded', 'false');
    expect(abrir).toHaveFocus();

    await usuario.click(abrir);
    await usuario.click(screen.getByRole('button', { name: 'Cerrar menú' }));
    expect(abrir).toHaveAttribute('aria-expanded', 'false');
  });

  it('el menú se cierra al elegir una sección', async () => {
    await iniciarSesion('admin@parroquia.test');
    montar();
    const usuario = userEvent.setup();
    const abrir = await screen.findByRole('button', { name: 'Abrir menú' });

    await usuario.click(abrir);
    await usuario.click(screen.getByRole('link', { name: 'Eventos' }));

    expect(await screen.findByRole('heading', { name: 'Contenido de eventos' })).toBeInTheDocument();
    expect(abrir).toHaveAttribute('aria-expanded', 'false');
  });

  it('cerrar sesión termina la sesión y lleva al login', async () => {
    await iniciarSesion('admin@parroquia.test');
    montar();

    await userEvent.click(await screen.findByRole('button', { name: 'Cerrar sesión' }));

    expect(await screen.findByRole('heading', { name: 'Pantalla de login' })).toBeInTheDocument();
    await expect(clienteHttp.get('/auth/yo')).rejects.toMatchObject({ estado: 401 });
  });

  it('ofrece un enlace para saltar al contenido', async () => {
    await iniciarSesion('admin@parroquia.test');
    montar();

    expect(await screen.findByRole('link', { name: 'Saltar al contenido' })).toHaveAttribute('href', '#contenido');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'contenido');
  });

  // jsdom no calcula estilos: se comprueban las clases que dan el alto completo en escritorio.
  it('el fondo del menú cubre toda la altura de la página, sin importar el largo del contenido', async () => {
    await iniciarSesion('admin@parroquia.test');
    montar();

    await screen.findByText('Administrador (desarrollo)');
    const columna = screen.getByRole('complementary');
    const clases = columna.className.split(/\s+/);
    // El fondo está en la columna, que se estira con el contenido: no tiene alto fijo en escritorio.
    expect(clases).toContain('bg-deep');
    expect(clases).toContain('lg:static');
    expect(clases).not.toContain('lg:h-screen');
    expect(clases).not.toContain('lg:sticky');
    // El menú queda pegado a la pantalla dentro de la columna.
    const menu = screen.getByTestId('menu-fijo');
    expect(menu.className.split(/\s+/)).toEqual(expect.arrayContaining(['lg:sticky', 'lg:top-0', 'lg:h-screen']));
    expect(columna).toContainElement(menu);
  });
});
