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
import { ProveedorToasts } from '../../ui/index.js';
import { reiniciarMocksContenido } from '../mocks/handlers.js';
import Horarios from './Horarios.jsx';

const entrar = (rol = 'secretaria') =>
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
          <MemoryRouter initialEntries={['/admin/horarios']}>
            <Horarios />
          </MemoryRouter>
        </SesionProvider>
      </ProveedorToasts>
    </QueryClientProvider>,
  );
}

describe('gestión de horarios', () => {
  beforeEach(() => {
    reiniciarMocksAdmin();
    reiniciarMocksContenido();
  });

  afterEach(() => {
    reiniciarMocksAdmin();
    reiniciarMocksContenido();
  });

  it('muestra los horarios en la tabla con tipo, día, hora y estado', async () => {
    await entrar('secretaria');
    montar();

    expect(await screen.findByRole('heading', { level: 1, name: 'Horarios' })).toBeInTheDocument();
    const tabla = await screen.findByRole('table');
    expect(within(tabla).getAllByText('Santa Misa').length).toBeGreaterThan(0);
    expect(within(tabla).getAllByText('Confesiones').length).toBeGreaterThan(0);
    expect(within(tabla).getAllByText('Adoración').length).toBeGreaterThan(0);
    expect(within(tabla).getAllByText('Secretaría').length).toBeGreaterThan(0);

    const filaSabado = within(tabla).getByText('Misa vespertina dominical').closest('tr');
    expect(filaSabado).toHaveTextContent('Sábado');
    expect(filaSabado).toHaveTextContent('18:00');
  });

  it('crea un nuevo horario con éxito', async () => {
    await entrar('secretaria');
    montar();
    const usuario = userEvent.setup();

    await screen.findByRole('table');
    await usuario.click(await screen.findByRole('button', { name: 'Nuevo horario' }));

    const dialogo = await screen.findByRole('dialog', { name: 'Nuevo horario' });
    await usuario.selectOptions(within(dialogo).getByLabelText('Tipo de horario'), '3');
    await usuario.selectOptions(within(dialogo).getByLabelText('Día de la semana'), '5');
    await usuario.type(within(dialogo).getByLabelText('Hora de inicio'), '17:00');
    await usuario.type(within(dialogo).getByLabelText('Hora de fin (opcional)'), '18:00');
    await usuario.type(within(dialogo).getByLabelText('Descripción (opcional)'), 'Hora santa');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Crear horario' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText(/Se agregó el horario de Adoración/)).toBeInTheDocument();
    const filaNueva = (await within(screen.getByRole('table')).findByText('Hora santa')).closest('tr');
    expect(filaNueva).toHaveTextContent('Viernes');
    expect(filaNueva).toHaveTextContent('17:00 – 18:00');
  });

  it('edita un horario existente con éxito', async () => {
    await entrar('secretaria');
    montar();
    const usuario = userEvent.setup();

    await screen.findByRole('table');
    await usuario.click(await screen.findByRole('button', { name: 'Editar horario Adoración Jueves 19:30' }));

    const dialogo = await screen.findByRole('dialog', { name: 'Editar horario' });
    const desc = within(dialogo).getByLabelText('Descripción (opcional)');
    await usuario.type(desc, 'Adoración al Santísimo');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText(/Se actualizó el horario de Adoración/)).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getByText('Adoración al Santísimo')).toBeInTheDocument();
  });

  it('muestra errores de validación (400 VALIDACION) junto al campo', async () => {
    await entrar('secretaria');
    montar();
    const usuario = userEvent.setup();

    await screen.findByRole('table');
    await usuario.click(await screen.findByRole('button', { name: 'Nuevo horario' }));

    const dialogo = await screen.findByRole('dialog', { name: 'Nuevo horario' });
    await usuario.type(within(dialogo).getByLabelText('Hora de inicio'), '19:00');
    await usuario.type(within(dialogo).getByLabelText('Hora de fin (opcional)'), '18:00');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Crear horario' }));

    const horaFin = await within(dialogo).findByLabelText('Hora de fin (opcional)');
    await waitFor(() => expect(horaFin).toBeInvalid());
    expect(horaFin).toHaveAccessibleDescription(/La hora de fin debe ser posterior a la hora de inicio\./);
  });

  it('elimina un horario tras confirmación', async () => {
    await entrar('secretaria');
    montar();
    const usuario = userEvent.setup();

    await screen.findByRole('table');
    await usuario.click(await screen.findByRole('button', { name: 'Eliminar horario Adoración Jueves 19:30' }));

    const confirmacion = await screen.findByRole('dialog', { name: '¿Eliminar horario?' });
    await usuario.click(within(confirmacion).getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText(/Se eliminó el horario de Adoración/)).toBeInTheDocument();
    expect(within(screen.getByRole('table')).queryByText('Adoración')).not.toBeInTheDocument();
  });

  it('muestra error de carga y permite reintentar', async () => {
    server.use(
      http.get(
        api('/admin/horarios'),
        () =>
          HttpResponse.json(
            { error: { codigo: 'ERROR_INTERNO', mensaje: 'Fallo temporal.', detalles: [] } },
            { status: 500 },
          ),
        { once: true },
      ),
    );
    await entrar('secretaria');
    montar();

    expect(await screen.findByRole('alert')).toHaveTextContent('Fallo temporal.');
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    const tabla = await screen.findByRole('table');
    expect(within(tabla).getAllByText('Santa Misa').length).toBeGreaterThan(0);
  });

  it('envía filtros de tipo, estado y búsqueda al backend', async () => {
    let ultimaUrl = '';
    server.use(
      http.get(api('/admin/horarios'), ({ request }) => {
        ultimaUrl = request.url;
        return HttpResponse.json({
          datos: [],
          paginacion: { pagina: 1, porPagina: 15, total: 0, totalPaginas: 0 },
        });
      }),
    );
    await entrar('secretaria');
    montar();
    const usuario = userEvent.setup();

    await screen.findByText(/No hay horarios registrados con estos filtros/i);
    await usuario.selectOptions(screen.getByLabelText('Tipo de horario'), '1');
    await usuario.selectOptions(screen.getByLabelText('Estado'), 'true');
    await usuario.type(screen.getByPlaceholderText('Nota del horario'), 'vespertina');

    await waitFor(() => {
      const url = new URL(ultimaUrl);
      expect(url.searchParams.get('tipo')).toBe('1');
      expect(url.searchParams.get('activo')).toBe('true');
      expect(url.searchParams.get('buscar')).toBe('vespertina');
    });
  });

  it('muestra la vista en solo lectura para Marketing (sin botones de crear, editar ni eliminar)', async () => {
    await entrar('marketing');
    montar();

    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(screen.getByText(/Solo lectura:/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nuevo horario' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Editar horario/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Eliminar horario/ })).not.toBeInTheDocument();
  });
});

