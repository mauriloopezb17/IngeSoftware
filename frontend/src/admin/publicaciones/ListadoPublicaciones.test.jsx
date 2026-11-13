import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

import { api } from '../../mocks/api.js';
import { server } from '../../mocks/server.js';
import { clienteHttp } from '../../services/clienteHttp.js';
import { crearQueryClient } from '../../services/queryClient.js';
import { reiniciarMocksAdmin } from '../mocks/handlers.js';
import { CONTRASENA_DESARROLLO } from '../mocks/usuarios.js';
import Publicaciones from './Publicaciones.jsx';

const entrar = (usuario) =>
  clienteHttp.post('/auth/login', { correo: `${usuario}@parroquia.test`, contrasena: CONTRASENA_DESARROLLO });

function Ubicacion() {
  const { pathname, search } = useLocation();
  return <p data-testid="ubicacion">{pathname + search}</p>;
}

function montar(entrada = '/admin/publicaciones') {
  return render(
    <QueryClientProvider client={crearQueryClient()}>
      <MemoryRouter initialEntries={[entrada]}>
        <Routes>
          <Route path="/admin/publicaciones/*" element={<Publicaciones />} />
        </Routes>
        <Ubicacion />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const esperar = { timeout: 4000 };
const filas = () => within(screen.getByRole('table')).getAllByRole('row').slice(1); // sin el encabezado
const fila = (titulo) => screen.getByRole('row', { name: new RegExp(titulo) });

describe('listado de publicaciones', () => {
  beforeEach(reiniciarMocksAdmin);
  afterEach(reiniciarMocksAdmin);

  it('lista solo noticias y notas de prensa (no avisos), paginadas', async () => {
    await entrar('parroco');
    montar();

    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Publicaciones' })).toBeInTheDocument();
    expect(screen.getByText('9 publicaciones')).toBeInTheDocument();
    expect(filas()).toHaveLength(8);
    expect(screen.queryByText(/la secretaría atenderá solo por la mañana/)).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Título' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Siguiente/ }));
    expect(await screen.findByText('Página 2 de 2 · 9 en total')).toBeInTheDocument();
    await screen.findByRole('row', { name: /Misa de acción de gracias/ });
    expect(filas()).toHaveLength(1);
    expect(screen.getByTestId('ubicacion')).toHaveTextContent('?pagina=2');
  });

  it('muestra la situación de cada publicación: borrador, rechazada, en revisión, programada, publicada, expirada y archivada', async () => {
    await entrar('parroco');
    montar();
    await screen.findByRole('table');

    expect(within(fila('Retiro de Adviento')).getByText('Borrador')).toBeInTheDocument();
    expect(within(fila('Encuentro de monaguillos')).getByText('Rechazada (con observación)')).toBeInTheDocument();
    expect(within(fila('Jornada de oración')).getByText('En revisión')).toBeInTheDocument();
    expect(within(fila('Festividad del Señor')).getByText('Programada')).toBeInTheDocument();
    expect(within(fila('Primeras comuniones')).getByText('Publicada')).toBeInTheDocument();
    expect(within(fila('Comunicado sobre el horario')).getByText('Expirada')).toBeInTheDocument();
    expect(within(fila('Retiro de Adviento')).getByText('Marketing (desarrollo)')).toBeInTheDocument();
    expect(within(fila('Comunicado sobre el horario')).getByText('Nota de prensa')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Siguiente/ }));
    expect(await screen.findByText('Archivada')).toBeInTheDocument();
  });

  it('filtra por estado y la elección queda en la URL', async () => {
    await entrar('parroco');
    montar();
    await screen.findByRole('table');

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Estado' }), 'EN_REVISION');

    expect(await screen.findByText('2 publicaciones con estos filtros', {}, esperar)).toBeInTheDocument();
    expect(filas().map((f) => within(f).getByRole('rowheader').textContent)).toEqual(
      expect.arrayContaining(['Jornada de oración por las vocaciones', 'Solemnidad de Cristo Rey: invitación a la procesión']),
    );
    expect(filas()).toHaveLength(2);
    expect(screen.getByTestId('ubicacion')).toHaveTextContent('?estado=EN_REVISION');
  });

  it('filtra por tipo', async () => {
    await entrar('parroco');
    montar();
    await screen.findByRole('table');

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Tipo' }), 'NOTA_DE_PRENSA');

    expect(await screen.findByText('2 publicaciones con estos filtros', {}, esperar)).toBeInTheDocument();
    for (const f of filas()) expect(within(f).getByText('Nota de prensa')).toBeInTheDocument();
  });

  it('combina estado y tipo, y con «Solo las mías» muestra lo del autor en sesión', async () => {
    await entrar('marketing');
    montar();
    await screen.findByRole('table');

    await userEvent.click(screen.getByRole('checkbox', { name: 'Solo las mías' }));
    expect(await screen.findByText('4 publicaciones con estos filtros', {}, esperar)).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Estado' }), 'BORRADOR');
    expect(await screen.findByText('2 publicaciones con estos filtros', {}, esperar)).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Tipo' }), 'NOTA_DE_PRENSA');
    expect(await screen.findByText(/No hay publicaciones que coincidan con los filtros/, {}, esperar)).toBeInTheDocument();
  });

  it('busca por título sin distinguir acentos', async () => {
    await entrar('parroco');
    montar();
    await screen.findByRole('table');

    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar' }), 'procesion');

    expect(await screen.findByText('1 publicación con estos filtros', {}, esperar)).toBeInTheDocument();
    expect(filas()).toHaveLength(1);
    expect(screen.getByTestId('ubicacion')).toHaveTextContent('?buscar=procesion');
  });

  it('sin resultados ofrece quitar los filtros', async () => {
    await entrar('parroco');
    montar('/admin/publicaciones?estado=ARCHIVADO&tipo=NOTA_DE_PRENSA');

    expect(await screen.findByText('No hay publicaciones que coincidan con los filtros.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Quitar los filtros' }));

    expect(await screen.findByText('9 publicaciones')).toBeInTheDocument();
    expect(screen.getByTestId('ubicacion')).toHaveTextContent(/^\/admin\/publicaciones$/);
  });

  it('descarta valores desconocidos de la URL en lugar de fallar', async () => {
    await entrar('parroco');
    montar('/admin/publicaciones?estado=INVENTADO&tipo=AVISO&pagina=-3');

    expect(await screen.findByText('9 publicaciones')).toBeInTheDocument();
  });

  it('muestra el error de la API y permite reintentar', async () => {
    await entrar('parroco');
    server.use(
      http.get(api('/admin/publicaciones'), () =>
        HttpResponse.json(
          { error: { codigo: 'SIN_PERMISO', mensaje: 'Sin acceso por ahora.', detalles: [] } },
          { status: 403 },
        ),
      ),
    );
    montar();

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar las publicaciones: Sin acceso por ahora.');

    server.resetHandlers();
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('table')).toBeInTheDocument();
  });

  it('una subruta desconocida de publicaciones muestra «página no encontrada»', async () => {
    await entrar('parroco');
    montar('/admin/publicaciones/no-existe');

    expect(await screen.findByRole('heading', { name: 'Página no encontrada' })).toBeInTheDocument();
  });
});
