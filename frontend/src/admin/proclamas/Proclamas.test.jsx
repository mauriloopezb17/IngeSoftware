import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

import { clienteHttp } from '../../services/clienteHttp.js';
import { crearQueryClient } from '../../services/queryClient.js';
import { hoyBolivia } from '../mocks/apoyoMock.js';
import { reiniciarMocksAdmin } from '../mocks/handlers.js';
import { CONTRASENA_DESARROLLO } from '../mocks/usuarios.js';
import { SesionProvider } from '../sesion/SesionProvider.jsx';
import Proclamas from './Proclamas.jsx';

const entrar = (usuario) =>
  clienteHttp.post('/auth/login', { correo: `${usuario}@parroquia.test`, contrasena: CONTRASENA_DESARROLLO });

function Ubicacion() {
  const { pathname, search } = useLocation();
  return <p data-testid="ubicacion">{pathname + search}</p>;
}

function montar(entrada = '/admin/proclamas') {
  return render(
    <QueryClientProvider client={crearQueryClient()}>
      <SesionProvider>
        <MemoryRouter initialEntries={[entrada]}>
          <Routes>
            <Route path="/admin/proclamas/*" element={<Proclamas />} />
          </Routes>
          <Ubicacion />
        </MemoryRouter>
      </SesionProvider>
    </QueryClientProvider>,
  );
}

const dia = (n) => hoyBolivia(new Date(Date.now() + n * 86400000));
const tarjeta = (nombre) => screen.getByRole('article', { name: new RegExp(nombre) });

describe('proclamas del panel', () => {
  beforeEach(reiniciarMocksAdmin);
  afterEach(reiniciarMocksAdmin);

  it('muestra las vigentes con su historial de publicaciones', async () => {
    await entrar('secretaria');
    montar();

    await screen.findByRole('list', { name: 'Proclamas' });
    expect(screen.getByText('3 proclamas')).toBeInTheDocument();
    const juan = tarjeta('Juan Carlos');
    expect(within(juan).getByText('Vigente')).toBeInTheDocument();
    expect(within(juan).getAllByRole('listitem').map((li) => li.textContent.slice(0, 4))).toEqual(['1.ª ', '2.ª ', '3.ª ']);
    expect(screen.queryByText(/Rodrigo/)).not.toBeInTheDocument();
  });

  it('el historial incluye las celebradas y las que aún no salieron', async () => {
    await entrar('secretaria');
    montar();
    await screen.findByRole('list', { name: 'Proclamas' });

    await userEvent.click(screen.getByRole('button', { name: 'Historial' }));
    await screen.findByText('2 proclamas');
    expect(within(tarjeta('Marcelo')).getByText('Celebrada')).toBeInTheDocument();
    expect(within(tarjeta('Rodrigo')).getByText('Aún sin publicar')).toBeInTheDocument();
    expect(within(tarjeta('Rodrigo')).getByText(/\(programada\)/)).toBeInTheDocument();
    expect(screen.getByTestId('ubicacion')).toHaveTextContent('?vista=historial');
  });

  it('busca por nombre', async () => {
    await entrar('secretaria');
    montar();
    await screen.findByRole('list', { name: 'Proclamas' });

    await userEvent.type(screen.getByLabelText('Buscar por nombre'), 'camila');
    await screen.findByText('1 proclama');
    expect(screen.getByRole('heading', { name: 'Diego A. Choque L. y Camila S. Paredes' })).toBeInTheDocument();
  });

  it('Marketing solo consulta: sin botones de modificar y con el historial en solo lectura', async () => {
    await entrar('marketing');
    montar();

    await screen.findByRole('list', { name: 'Proclamas' });
    expect(screen.getByRole('note')).toHaveTextContent('Solo lectura');
    expect(screen.queryByRole('link', { name: /Nueva proclama/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Eliminar/ })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('link', { name: /Ver «Luis F. Gutiérrez/ }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Proclama' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Historial de publicaciones' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cambiar la fecha/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Agregar proclama' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Contrayente 1')).not.toBeInTheDocument();
  });

  it('Marketing recibe «sin permiso» si entra directo a crear', async () => {
    await entrar('marketing');
    montar('/admin/proclamas/nueva');

    expect(await screen.findByRole('heading', { name: 'Sin permiso' })).toBeInTheDocument();
  });

  it('crea una proclama con su primera publicación y abre su historial', async () => {
    await entrar('secretaria');
    montar('/admin/proclamas/nueva');
    const usuario = userEvent.setup();

    await usuario.click(await screen.findByRole('button', { name: 'Crear proclama' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('El nombre es obligatorio.');
    expect(screen.getByRole('alert')).toHaveTextContent('Indica la fecha y la hora del matrimonio.');

    await usuario.type(screen.getByLabelText('Contrayente 1'), 'Pablo Ríos');
    await usuario.type(screen.getByLabelText('Contrayente 2'), 'Sonia Tola');
    fireEvent.change(screen.getByLabelText('Fecha y hora del matrimonio'), { target: { value: `${dia(30)}T11:00` } });
    fireEvent.change(screen.getByLabelText('Primera proclama (opcional)'), { target: { value: dia(2) } });
    await usuario.click(screen.getByRole('button', { name: 'Crear proclama' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Editar proclama' })).toBeInTheDocument();
    expect(screen.getByText(/Proclama creada/)).toBeInTheDocument();
    const historial = await screen.findByRole('list', { name: 'Historial de publicaciones' });
    expect(within(historial).getByText('Programada')).toBeInTheDocument();
    expect(screen.getByLabelText('Fecha de la 2.ª proclama')).toBeInTheDocument();
  });

  it('agrega la siguiente proclama hasta llegar a 3', async () => {
    await entrar('secretaria');
    montar('/admin/proclamas/3/editar');
    const usuario = userEvent.setup();

    await screen.findByRole('list', { name: 'Historial de publicaciones' });
    fireEvent.change(screen.getByLabelText('Fecha de la 2.ª proclama'), { target: { value: dia(2) } });
    await usuario.click(screen.getByRole('button', { name: 'Agregar proclama' }));
    expect(await screen.findByText('Se agregó la 2.ª proclama.')).toBeInTheDocument();

    fireEvent.change(await screen.findByLabelText('Fecha de la 3.ª proclama'), { target: { value: dia(9) } });
    await usuario.click(screen.getByRole('button', { name: 'Agregar proclama' }));
    expect(await screen.findByText('Ya tiene las 3 publicaciones.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Agregar proclama' })).not.toBeInTheDocument();
  });

  it('muestra el error de la API si la fecha no es posterior a la anterior', async () => {
    await entrar('secretaria');
    montar('/admin/proclamas/2/editar');
    const usuario = userEvent.setup();

    await screen.findByRole('list', { name: 'Historial de publicaciones' });
    fireEvent.change(screen.getByLabelText('Fecha de la 3.ª proclama'), { target: { value: dia(-20) } });
    await usuario.click(screen.getByRole('button', { name: 'Agregar proclama' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Debe ser posterior a la proclama anterior.');
  });

  it('cambia la fecha de una publicación y solo permite quitar la última', async () => {
    await entrar('secretaria');
    montar('/admin/proclamas/1/editar');
    const usuario = userEvent.setup();
    await screen.findByRole('list', { name: 'Historial de publicaciones' });

    expect(screen.getAllByRole('button', { name: /Quitar la/ })).toHaveLength(1);
    await usuario.click(screen.getByRole('button', { name: 'Cambiar la fecha de la 3.ª proclama' }));
    const dialogo = screen.getByRole('dialog', { name: 'Cambiar la fecha de la 3.ª proclama' });
    fireEvent.change(within(dialogo).getByLabelText('Fecha de publicación'), { target: { value: dia(-3) } });
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Se cambió la fecha de la 3.ª proclama.')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Quitar la 3.ª proclama' }));
    const confirmar = screen.getByRole('dialog', { name: '¿Quitar la 3.ª proclama?' });
    await usuario.click(within(confirmar).getByRole('button', { name: 'Quitar' }));
    expect(await screen.findByText('Se quitó la 3.ª proclama.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cambiar la fecha de la 3.ª proclama' })).not.toBeInTheDocument();
  });

  it('eliminar una proclama con publicaciones ya alcanzadas muestra el motivo del 409', async () => {
    await entrar('secretaria');
    montar();
    const usuario = userEvent.setup();
    await screen.findByRole('list', { name: 'Proclamas' });

    await usuario.click(screen.getByRole('button', { name: /Eliminar «Juan Carlos/ }));
    const dialogo = screen.getByRole('dialog');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Eliminar' }));

    expect(await within(dialogo).findByRole('alert')).toHaveTextContent(/historial público/);
    expect(screen.getByRole('article', { name: /Juan Carlos/ })).toBeInTheDocument();
  });

  it('edita los datos de una proclama', async () => {
    await entrar('parroco');
    montar('/admin/proclamas/3/editar');
    const usuario = userEvent.setup();

    const nombre = await screen.findByLabelText('Contrayente 1');
    expect(nombre).toHaveValue('Luis F. Gutiérrez');
    await usuario.clear(nombre);
    await usuario.type(nombre, 'Luis Fernando Gutiérrez');
    await usuario.click(screen.getByRole('button', { name: 'Guardar datos' }));

    expect(await screen.findByText('Cambios guardados.')).toBeInTheDocument();
  });
});
