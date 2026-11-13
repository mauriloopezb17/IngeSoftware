import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';

import { clienteHttp } from '../services/clienteHttp.js';
import { queryClient } from '../services/queryClient.js';
import AdminApp from './AdminApp.jsx';
import { reiniciarMocksAdmin } from './mocks/handlers.js';
import { CONTRASENA_DESARROLLO } from './mocks/usuarios.js';
import { SECCIONES } from './rutas.js';

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

  it.each(SECCIONES.filter((s) => s.clave !== 'inicio'))(
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

  it('el Párroco sí entra a la bitácora', async () => {
    await abrir('parroco@parroquia.test', 'bitacora');

    expect(await screen.findByRole('heading', { level: 1, name: 'Bitácora' })).toBeInTheDocument();
  });

  it('una subruta inexistente de una sección muestra «página no encontrada»', async () => {
    await abrir('admin@parroquia.test', 'multimedia/no-existe');

    expect(await screen.findByRole('heading', { name: 'Página no encontrada' })).toBeInTheDocument();
  });
});
