import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

import { clienteHttp } from '../../services/clienteHttp.js';
import { reiniciarMocksContenido } from '../contenido/mocks/handlers.js';
import { reiniciarMocksAdmin } from '../mocks/handlers.js';
import { CONTRASENA_DESARROLLO } from '../mocks/usuarios.js';
import { SesionProvider } from '../sesion/SesionProvider.jsx';
import Bitacora from './Bitacora.jsx';

const entrar = (rol = 'admin') =>
  clienteHttp.post('/auth/login', {
    correo: `${rol}@parroquia.test`,
    contrasena: CONTRASENA_DESARROLLO,
  });

function montar() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <SesionProvider>
        <MemoryRouter initialEntries={['/admin/bitacora']}>
          <Bitacora />
        </MemoryRouter>
      </SesionProvider>
    </QueryClientProvider>,
  );
}

describe('visor de la bitácora de cambios', () => {
  beforeEach(() => {
    reiniciarMocksAdmin();
    reiniciarMocksContenido();
  });

  afterEach(() => {
    reiniciarMocksAdmin();
    reiniciarMocksContenido();
  });

  it('el Administrador ve todas las sedes, filtra y abre el detalle con Antes/Después y [oculto]', async () => {
    await entrar('admin');
    montar();
    const u = userEvent.setup({ delay: null });

    const lista = await screen.findByRole('list', { name: 'Registros de bitácora' });
    // Incluye el registro de la sede 2 (horario #18) y procesos del sistema
    expect(within(lista).getByText('horario #18')).toBeInTheDocument();
    expect(within(lista).getByText('Sistema')).toBeInTheDocument();

    // Ver detalle con campo [oculto]
    await u.click(screen.getByRole('button', { name: 'Ver detalle del cambio #127' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Detalle del cambio #127' });
    expect(within(dialogo).getByText('Antes')).toBeInTheDocument();
    expect(within(dialogo).getByText('Después')).toBeInTheDocument();
    expect(within(dialogo).getAllByText('[oculto]').length).toBeGreaterThanOrEqual(2);
    await u.click(within(dialogo).getByRole('button', { name: 'Cerrar detalle' }));

    // Filtrar por entidad y acción
    await u.selectOptions(screen.getByLabelText('Entidad'), 'publicacion');
    await u.selectOptions(screen.getByLabelText('Acción'), 'UPDATE');
    const listaFiltrada = await screen.findByRole('list', { name: 'Registros de bitácora' });
    expect(within(listaFiltrada).getByText('publicacion #7')).toBeInTheDocument();
    expect(within(listaFiltrada).queryByText('publicacion #12')).not.toBeInTheDocument();

    await u.click(screen.getByRole('button', { name: /Limpiar filtros/ }));
    expect(await screen.findByText('horario #18')).toBeInTheDocument();
  }, 15000);

  it('el Párroco solo ve los registros de su sede', async () => {
    await entrar('parroco');
    montar();

    const lista = await screen.findByRole('list', { name: 'Registros de bitácora' });
    expect(within(lista).getByText('publicacion #7')).toBeInTheDocument();
    expect(within(lista).queryByText('horario #18')).not.toBeInTheDocument();
  });

  it('Secretaría recibe 403 al intentar consultar /admin/bitacora', async () => {
    await entrar('secretaria');
    await expect(clienteHttp.get('/admin/bitacora')).rejects.toMatchObject({
      estado: 403,
      codigo: 'SIN_PERMISO',
    });
  });
});

