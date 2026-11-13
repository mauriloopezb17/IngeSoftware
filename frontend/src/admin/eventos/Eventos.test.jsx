import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

import { clienteHttp } from '../../services/clienteHttp.js';
import { crearQueryClient } from '../../services/queryClient.js';
import { reiniciarMocksAdmin } from '../mocks/handlers.js';
import { CONTRASENA_DESARROLLO } from '../mocks/usuarios.js';
import { SesionProvider } from '../sesion/SesionProvider.jsx';
import Eventos from './Eventos.jsx';

const entrar = (usuario) =>
  clienteHttp.post('/auth/login', { correo: `${usuario}@parroquia.test`, contrasena: CONTRASENA_DESARROLLO });

function Ubicacion() {
  const { pathname, search } = useLocation();
  return <p data-testid="ubicacion">{pathname + search}</p>;
}

function montar(entrada = '/admin/eventos') {
  return render(
    <QueryClientProvider client={crearQueryClient()}>
      <SesionProvider>
        <MemoryRouter initialEntries={[entrada]}>
          <Routes>
            <Route path="/admin/eventos/*" element={<Eventos />} />
          </Routes>
          <Ubicacion />
        </MemoryRouter>
      </SesionProvider>
    </QueryClientProvider>,
  );
}

const tarjeta = (titulo) => screen.getByRole('article', { name: new RegExp(titulo) });
const lista = () => screen.findByRole('list', { name: 'Eventos' });

describe('eventos del panel', () => {
  beforeEach(reiniciarMocksAdmin);
  afterEach(reiniciarMocksAdmin);

  it('muestra los próximos eventos publicados en orden cronológico', async () => {
    await entrar('secretaria');
    montar();

    const eventos = within(await lista()).getAllByRole('article');
    expect(eventos.map((e) => within(e).getByRole('heading').textContent)).toEqual([
      'Adoración eucarística comunitaria',
      'Misa de sanación',
      'Misa por los difuntos de la comunidad',
      'Solemnidad de Cristo Rey del Universo',
      'Charla pre-bautismal para padres y padrinos',
      'Novena al Señor de la Exaltación (suspendida)',
      'Concierto de villancicos',
    ]);
    expect(within(tarjeta('Solemnidad de Cristo Rey')).getByText('Solemnidad')).toBeInTheDocument();
    expect(within(tarjeta('Concierto de villancicos')).getByText('Borrador')).toBeInTheDocument();
    expect(screen.queryByText('Finalizado')).not.toBeInTheDocument();
  });

  it('marca los eventos pasados como finalizados (RF-09)', async () => {
    await entrar('secretaria');
    montar();
    await lista();

    await userEvent.click(screen.getByRole('button', { name: 'Finalizados' }));
    await screen.findByRole('heading', { name: 'Retiro de catequistas' });
    expect(screen.getByRole('button', { name: 'Finalizados' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(tarjeta('Retiro de catequistas')).getByText('Finalizado')).toBeInTheDocument();
    expect(within(tarjeta('Kermés parroquial')).getByText(/Todo el día/)).toBeInTheDocument();
    expect(screen.getByText('2 eventos')).toBeInTheDocument();
    expect(screen.getByTestId('ubicacion')).toHaveTextContent('?vista=finalizados');
  });

  it('filtra por categoría con las categorías del catálogo', async () => {
    await entrar('secretaria');
    montar();
    await lista();

    const selector = screen.getByLabelText('Categoría');
    await screen.findByRole('option', { name: 'Catequesis' });
    await userEvent.selectOptions(selector, 'Catequesis');

    await screen.findByText('1 evento');
    expect(screen.getByRole('heading', { name: 'Charla pre-bautismal para padres y padrinos' })).toBeInTheDocument();
  });

  it('Marketing solo consulta: ve el aviso de solo lectura y ningún botón para modificar', async () => {
    await entrar('marketing');
    montar();
    await lista();

    expect(screen.getByRole('note')).toHaveTextContent('Solo lectura');
    expect(screen.queryByRole('link', { name: /Nuevo evento/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Editar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Eliminar/ })).not.toBeInTheDocument();
  });

  it('Marketing recibe «sin permiso» si entra directo a crear', async () => {
    await entrar('marketing');
    montar('/admin/eventos/nuevo');

    expect(await screen.findByRole('heading', { name: 'Sin permiso' })).toBeInTheDocument();
  });

  it('Secretaría crea un evento de todo el día y vuelve al listado con un aviso', async () => {
    await entrar('secretaria');
    montar('/admin/eventos/nuevo');
    const usuario = userEvent.setup();

    await usuario.click(await screen.findByRole('button', { name: 'Crear evento' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('El título debe tener entre 3 y 200 caracteres.');
    expect(screen.getByRole('alert')).toHaveTextContent('Indica el día del evento.');
    expect(screen.getByRole('alert')).toHaveTextContent('Elige una categoría.');

    await usuario.type(screen.getByLabelText('Título'), 'Peregrinación a Copacabana');
    await usuario.click(screen.getByLabelText('Todo el día'));
    const inicio = screen.getByRole('group', { name: 'Inicio' });
    expect(within(inicio).queryByLabelText('Hora')).not.toBeInTheDocument();
    fireEvent.change(within(inicio).getByLabelText('Día'), { target: { value: '2027-02-02' } });
    await screen.findByRole('option', { name: 'Comunidad' });
    await usuario.selectOptions(screen.getByLabelText('Categoría'), 'Comunidad');
    await usuario.click(screen.getByRole('button', { name: 'Crear evento' }));

    expect(await screen.findByText('Se creó el evento «Peregrinación a Copacabana».')).toBeInTheDocument();
    expect(screen.getByTestId('ubicacion')).toHaveTextContent(/^\/admin\/eventos$/);
    const nueva = await screen.findByRole('article', { name: /Peregrinación a Copacabana/ });
    expect(within(nueva).getByText(/Todo el día/)).toBeInTheDocument();
  });

  it('no deja guardar un fin anterior al inicio', async () => {
    await entrar('secretaria');
    montar('/admin/eventos/nuevo');
    const usuario = userEvent.setup();

    await usuario.type(await screen.findByLabelText('Título'), 'Vigilia de oración');
    const inicio = screen.getByRole('group', { name: 'Inicio' });
    const fin = screen.getByRole('group', { name: 'Fin (opcional)' });
    fireEvent.change(within(inicio).getByLabelText('Día'), { target: { value: '2027-03-10' } });
    fireEvent.change(within(inicio).getByLabelText('Hora'), { target: { value: '20:00' } });
    fireEvent.change(within(fin).getByLabelText('Hora'), { target: { value: '19:00' } });
    await screen.findByRole('option', { name: 'Liturgia' });
    await usuario.selectOptions(screen.getByLabelText('Categoría'), 'Liturgia');
    await usuario.click(screen.getByRole('button', { name: 'Crear evento' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('El fin debe ser igual o posterior al inicio.');
  });

  it('edita un evento existente con sus datos cargados', async () => {
    await entrar('parroco');
    montar();
    const usuario = userEvent.setup();
    await lista();

    await usuario.click(screen.getByRole('link', { name: 'Editar «Solemnidad de Cristo Rey del Universo»' }));
    const titulo = await screen.findByLabelText('Título');
    expect(titulo).toHaveValue('Solemnidad de Cristo Rey del Universo');
    expect(screen.getByLabelText('Categoría')).toHaveValue('2');
    expect(screen.getByRole('img')).toBeInTheDocument();

    await usuario.selectOptions(screen.getByLabelText('Estado'), 'Archivado');
    await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Se guardaron los cambios de «Solemnidad de Cristo Rey del Universo».')).toBeInTheDocument();
    expect(await within(tarjeta('Solemnidad de Cristo Rey')).findByText('Archivado')).toBeInTheDocument();
  });

  it('elimina un evento después de confirmar', async () => {
    await entrar('secretaria');
    montar();
    const usuario = userEvent.setup();
    await lista();

    await usuario.click(screen.getByRole('button', { name: 'Eliminar «Misa de sanación»' }));
    const dialogo = screen.getByRole('dialog', { name: '¿Eliminar «Misa de sanación»?' });
    await usuario.click(within(dialogo).getByRole('button', { name: 'Eliminar' }));

    expect(await screen.findByText('Se eliminó el evento «Misa de sanación».')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Misa de sanación' })).not.toBeInTheDocument();
  });

  it('una subruta desconocida muestra «página no encontrada»', async () => {
    await entrar('secretaria');
    montar('/admin/eventos/nueva');

    expect(await screen.findByRole('heading', { name: 'Página no encontrada' })).toBeInTheDocument();
  });
});
