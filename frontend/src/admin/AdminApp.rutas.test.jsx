import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';

import { clienteHttp } from '../services/clienteHttp.js';
import { queryClient } from '../services/queryClient.js';
import AdminApp from './AdminApp.jsx';
import { pantallasContenido } from './contenido/pantallas.jsx';
import { reiniciarMocksAdmin } from './mocks/handlers.js';
import { CONTRASENA_DESARROLLO } from './mocks/usuarios.js';
import { pantallasPublicaciones } from './publicaciones/pantallas.jsx';
import { SECCIONES } from './rutas.js';

// Pantalla de publicaciones de prueba: declara sus subrutas como lo hará la real. Así se comprueba
// el enrutado del panel (guardia + subrutas) sin depender de la pantalla definitiva.
vi.mock('./publicaciones/pantallas.jsx', async () => {
  const { createElement } = await import('react');
  const { Route, Routes } = await import('react-router');
  const { default: NoEncontrada } = await import('./paginas/NoEncontrada.jsx');
  const titulo = (texto) => createElement('h1', null, texto);
  function PublicacionesDePrueba() {
    return createElement(
      Routes,
      null,
      createElement(Route, { index: true, element: titulo('Listado de publicaciones') }),
      createElement(Route, { path: 'nueva', element: titulo('Nueva publicación') }),
      createElement(Route, { path: ':id/editar', element: titulo('Editar publicación') }),
      createElement(Route, { path: '*', element: createElement(NoEncontrada) }),
    );
  }
  return { pantallasPublicaciones: { publicaciones: createElement(PublicacionesDePrueba) } };
});

// Índice de docs/api/admin.md: las rutas que debe registrar el panel.
const RUTAS_DEL_INDICE = [
  'inicio',
  'publicaciones',
  'eventos',
  'horarios',
  'servicios',
  'grupos',
  'videos',
  'multimedia',
  'sedes',
  'proclamas',
  'boletines',
  'paginas',
  'bitacora',
  'usuarios',
];

async function abrir(correo, ruta) {
  await clienteHttp.post('/auth/login', { correo, contrasena: CONTRASENA_DESARROLLO });
  return render(
    <MemoryRouter initialEntries={[`/admin/${ruta}`]}>
      <Routes>
        <Route path="/admin/*" element={<AdminApp />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('rutas del panel', () => {
  beforeEach(() => {
    queryClient.clear();
    reiniciarMocksAdmin();
  });
  afterEach(() => {
    queryClient.clear();
    reiniciarMocksAdmin();
  });

  it('registra todas las secciones del índice de admin.md', () => {
    expect(SECCIONES.map((s) => s.ruta)).toEqual(RUTAS_DEL_INDICE);
  });

  // Multimedia, publicaciones y las pantallas de contenido ya tienen su pantalla.
  it.each(
    SECCIONES.filter(
      (s) =>
        s.clave !== 'inicio' &&
        s.clave !== 'multimedia' &&
        !Object.hasOwn(pantallasContenido, s.clave) &&
        !Object.hasOwn(pantallasPublicaciones, s.clave),
    ),
  )(
    'el Administrador abre «$titulo» con su pantalla provisional',
    async ({ ruta, titulo }) => {
      await abrir('admin@parroquia.test', ruta);

      expect(await screen.findByRole('heading', { level: 1, name: titulo })).toBeInTheDocument();
      expect(screen.getByText(/en construcción/)).toBeInTheDocument();
      const menu = screen.getByRole('navigation', { name: 'Menú principal' });
      expect(within(menu).getByRole('link', { name: titulo })).toHaveAttribute('aria-current', 'page');
    },
  );

  it.each([
    ['marketing@parroquia.test', 'usuarios'],
    ['marketing@parroquia.test', 'bitacora'],
    ['secretaria@parroquia.test', 'usuarios'],
    ['secretaria@parroquia.test', 'bitacora'],
    ['parroco@parroquia.test', 'usuarios'],
  ])('%s recibe «sin permiso» en /admin/%s', async (correo, ruta) => {
    await abrir(correo, ruta);

    expect(await screen.findByRole('heading', { name: 'Sin permiso' })).toBeInTheDocument();
    expect(screen.queryByText(/en construcción/)).not.toBeInTheDocument();
    // El panel sigue disponible: se puede volver al resto de secciones.
    expect(screen.getByRole('navigation', { name: 'Menú principal' })).toBeInTheDocument();
  });

  it('Multimedia muestra la biblioteca, no la pantalla provisional', async () => {
    await abrir('marketing@parroquia.test', 'multimedia');

    expect(await screen.findByRole('heading', { level: 1, name: 'Multimedia' })).toBeInTheDocument();
    expect(await screen.findByRole('list', { name: 'Archivos' })).toBeInTheDocument();
    expect(screen.queryByText(/en construcción/)).not.toBeInTheDocument();
  });

  it('el Párroco sí entra a la bitácora', async () => {
    await abrir('parroco@parroquia.test', 'bitacora');

    expect(await screen.findByRole('heading', { level: 1, name: 'Bitácora' })).toBeInTheDocument();
  });

  it('una subruta inexistente de una sección muestra «página no encontrada»', async () => {
    await abrir('admin@parroquia.test', 'multimedia/no-existe');

    expect(await screen.findByRole('heading', { name: 'Página no encontrada' })).toBeInTheDocument();
  });

  describe('subrutas de una sección', () => {
    it('/admin/publicaciones muestra el listado, dentro del panel y de su guardia', async () => {
      await abrir('marketing@parroquia.test', 'publicaciones');

      expect(await screen.findByRole('heading', { name: 'Listado de publicaciones' })).toBeInTheDocument();
      const menu = screen.getByRole('navigation', { name: 'Menú principal' });
      expect(within(menu).getByRole('link', { name: 'Publicaciones' })).toHaveAttribute('aria-current', 'page');
    });

    it('/admin/publicaciones/nueva llega a la pantalla de publicaciones', async () => {
      await abrir('marketing@parroquia.test', 'publicaciones/nueva');

      expect(await screen.findByRole('heading', { name: 'Nueva publicación' })).toBeInTheDocument();
      const menu = screen.getByRole('navigation', { name: 'Menú principal' });
      expect(within(menu).getByRole('link', { name: 'Publicaciones' })).toHaveAttribute('aria-current', 'page');
    });

    it('acepta subrutas con parámetros (/admin/publicaciones/7/editar)', async () => {
      await abrir('admin@parroquia.test', 'publicaciones/7/editar');

      expect(await screen.findByRole('heading', { name: 'Editar publicación' })).toBeInTheDocument();
    });

    it('una subruta desconocida de publicaciones muestra «página no encontrada»', async () => {
      await abrir('admin@parroquia.test', 'publicaciones/no-existe/nada/mas');

      expect(await screen.findByRole('heading', { name: 'Página no encontrada' })).toBeInTheDocument();
      expect(screen.getByRole('navigation', { name: 'Menú principal' })).toBeInTheDocument();
    });

    it('las demás secciones siguen respondiendo solo en su raíz', async () => {
      await abrir('admin@parroquia.test', 'eventos/nueva');

      expect(await screen.findByRole('heading', { name: 'Página no encontrada' })).toBeInTheDocument();
    });
  });
});
