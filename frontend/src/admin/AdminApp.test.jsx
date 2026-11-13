import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

import { api } from '../mocks/api.js';
import { server } from '../mocks/server.js';
import { clienteHttp } from '../services/clienteHttp.js';
import { queryClient } from '../services/queryClient.js';
import AdminApp from './AdminApp.jsx';
import { reiniciarMocksAdmin } from './mocks/handlers.js';
import { CONTRASENA_DESARROLLO } from './mocks/usuarios.js';
import { SECCIONES } from './rutas.js';

function UbicacionActual() {
  const { pathname, search } = useLocation();
  return <p data-testid="ubicacion">{pathname + search}</p>;
}

// El panel se monta como en router.jsx: bajo /admin/*.
function montar(entrada) {
  return render(
    <MemoryRouter initialEntries={[entrada]}>
      <Routes>
        <Route path="/admin/*" element={<AdminApp />} />
      </Routes>
      <UbicacionActual />
    </MemoryRouter>,
  );
}

const iniciarSesion = (correo) => clienteHttp.post('/auth/login', { correo, contrasena: CONTRASENA_DESARROLLO });

const titulosDelMenu = async () => {
  const menu = await screen.findByRole('navigation', { name: 'Menú principal' });
  return within(menu)
    .getAllByRole('link')
    .map((enlace) => enlace.textContent);
};

const titulos = (...claves) => SECCIONES.filter((s) => claves.includes(s.clave)).map((s) => s.titulo);
const todas = SECCIONES.map((s) => s.clave);

describe('panel: rutas protegidas y menú por rol', () => {
  beforeEach(() => {
    queryClient.clear(); // AdminApp usa el QueryClient compartido
    reiniciarMocksAdmin();
  });
  afterEach(() => {
    queryClient.clear();
    reiniciarMocksAdmin();
  });

  describe('sin sesión', () => {
    it('redirige al login desde cualquier ruta del panel', async () => {
      montar('/admin/eventos');

      expect(await screen.findByRole('heading', { name: 'Panel de administración' })).toBeInTheDocument();
      expect(screen.getByTestId('ubicacion')).toHaveTextContent('/admin/login');
    });

    it('redirige también desde /admin', async () => {
      montar('/admin');

      expect(await screen.findByLabelText('Correo electrónico')).toBeInTheDocument();
      expect(screen.getByTestId('ubicacion')).toHaveTextContent('/admin/login');
    });

    it('tras iniciar sesión vuelve a la ruta original, con su query', async () => {
      montar('/admin/ruta-que-no-existe?pagina=2');
      const usuario = userEvent.setup();

      await usuario.type(await screen.findByLabelText('Correo electrónico'), 'admin@parroquia.test');
      await usuario.type(screen.getByLabelText('Contraseña'), CONTRASENA_DESARROLLO);
      await usuario.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

      expect(await screen.findByRole('heading', { name: 'Página no encontrada' })).toBeInTheDocument();
      expect(screen.getByTestId('ubicacion')).toHaveTextContent('/admin/ruta-que-no-existe?pagina=2');
    });
  });

  describe('con sesión', () => {
    it('/admin lleva al inicio', async () => {
      await iniciarSesion('admin@parroquia.test');
      montar('/admin');

      expect(await screen.findByRole('heading', { name: 'Inicio' })).toBeInTheDocument();
      expect(screen.getByTestId('ubicacion')).toHaveTextContent('/admin/inicio');
    });

    it('una ruta desconocida muestra «página no encontrada» dentro del panel', async () => {
      await iniciarSesion('admin@parroquia.test');
      montar('/admin/noticias');

      expect(await screen.findByRole('heading', { name: 'Página no encontrada' })).toBeInTheDocument();
      expect(screen.getByRole('navigation', { name: 'Menú principal' })).toBeInTheDocument();
    });

    it('el Administrador ve las 14 secciones', async () => {
      await iniciarSesion('admin@parroquia.test');
      montar('/admin/inicio');

      expect(await titulosDelMenu()).toEqual(titulos(...todas));
    });

    it('el Párroco ve todo menos Usuarios', async () => {
      await iniciarSesion('parroco@parroquia.test');
      montar('/admin/inicio');

      expect(await titulosDelMenu()).toEqual(titulos(...todas.filter((c) => c !== 'usuarios')));
    });

    it('Secretaría y Marketing no ven Usuarios ni Bitácora', async () => {
      for (const correo of ['secretaria@parroquia.test', 'marketing@parroquia.test']) {
        await iniciarSesion(correo);
        const { unmount } = montar('/admin/inicio');

        expect(await titulosDelMenu()).toEqual(titulos(...todas.filter((c) => c !== 'usuarios' && c !== 'bitacora')));
        unmount();
        queryClient.clear();
      }
    });

    it('Marketing y Administrador tienen menús distintos', async () => {
      await iniciarSesion('marketing@parroquia.test');
      const marketing = montar('/admin/inicio');
      const menuMarketing = await titulosDelMenu();
      marketing.unmount();
      queryClient.clear();

      await iniciarSesion('admin@parroquia.test');
      montar('/admin/inicio');
      const menuAdmin = await titulosDelMenu();

      expect(menuMarketing).not.toEqual(menuAdmin);
      expect(menuAdmin).toContain('Usuarios');
      expect(menuMarketing).not.toContain('Usuarios');
    });

    it('un 401 mientras se usa el panel devuelve al login conservando la ruta', async () => {
      await iniciarSesion('admin@parroquia.test');
      montar('/admin/inicio');
      await screen.findByRole('heading', { name: 'Inicio' });

      // La sesión vence en el servidor y la siguiente comprobación responde 401.
      server.use(
        http.get(api('/auth/yo'), () =>
          HttpResponse.json(
            { error: { codigo: 'NO_AUTENTICADO', mensaje: 'Tu sesión expiró.', detalles: [] } },
            { status: 401 },
          ),
        ),
      );
      await queryClient.invalidateQueries({ queryKey: ['admin', 'sesion'] });

      expect(await screen.findByLabelText('Correo electrónico')).toBeInTheDocument();
      expect(screen.getByTestId('ubicacion')).toHaveTextContent('/admin/login');
    });
  });
});
