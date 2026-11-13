// Integración: la sesión vence mientras se llena un formulario. Guardar da 401, pero la pantalla sigue ahí con lo
// escrito; se vuelve a entrar desde el aviso y se guarda lo mismo sin tener que escribirlo de nuevo.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';

import { api } from '../../mocks/api.js';
import { server } from '../../mocks/server.js';
import { clienteHttp } from '../../services/clienteHttp.js';
import { crearQueryClient } from '../../services/queryClient.js';
import FormularioEvento from '../eventos/FormularioEvento.jsx';
import { reiniciarMocksAdmin } from '../mocks/handlers.js';
import { CONTRASENA_DESARROLLO } from '../mocks/usuarios.js';
import { SesionProvider } from '../sesion/SesionProvider.jsx';
import AvisoSesion from './AvisoSesion.jsx';

describe('sesión que vence con trabajo sin guardar', () => {
  beforeEach(reiniciarMocksAdmin);
  afterEach(reiniciarMocksAdmin);

  it('no pierde lo escrito: avisa, se vuelve a entrar y el mismo formulario se guarda', async () => {
    await clienteHttp.post('/auth/login', { correo: 'secretaria@parroquia.test', contrasena: CONTRASENA_DESARROLLO });
    // La primera vez que se guarda, la sesión ya venció en el servidor.
    server.use(
      http.post(
        api('/admin/eventos'),
        () => HttpResponse.json({ error: { codigo: 'NO_AUTENTICADO', mensaje: 'Tu sesión expiró.', detalles: [] } }, { status: 401 }),
        { once: true },
      ),
    );
    render(
      <QueryClientProvider client={crearQueryClient()}>
        <SesionProvider>
          <MemoryRouter initialEntries={['/admin/eventos/nuevo']}>
            <Routes>
              <Route path="/admin/eventos/nuevo" element={<><FormularioEvento /><AvisoSesion /></>} />
              <Route path="/admin/eventos" element={<h1>Listado de eventos</h1>} />
            </Routes>
          </MemoryRouter>
        </SesionProvider>
      </QueryClientProvider>,
    );
    const usuario = userEvent.setup();

    await usuario.type(await screen.findByLabelText('Título'), 'Vigilia de oración por la paz');
    const inicio = screen.getByRole('group', { name: 'Inicio' });
    fireEvent.change(within(inicio).getByLabelText('Día'), { target: { value: '2027-03-10' } });
    fireEvent.change(within(inicio).getByLabelText('Hora'), { target: { value: '20:00' } });
    await screen.findByRole('option', { name: 'Liturgia' });
    await usuario.selectOptions(screen.getByLabelText('Categoría'), 'Liturgia');

    await usuario.click(screen.getByRole('button', { name: 'Crear evento' }));

    // El 401 no saca a la persona de la pantalla: aparece el aviso y el formulario conserva todo.
    const aviso = await screen.findByRole('region', { name: 'Estado de la sesión' });
    expect(within(aviso).getByRole('alert')).toHaveTextContent('Tu sesión venció.');
    expect(screen.getByLabelText('Título')).toHaveValue('Vigilia de oración por la paz');
    expect(within(inicio).getByLabelText('Día')).toHaveValue('2027-03-10');
    expect(screen.getByLabelText('Categoría')).toHaveValue('1');

    await usuario.type(within(aviso).getByLabelText(/Contraseña de secretaria@parroquia.test/), CONTRASENA_DESARROLLO);
    await usuario.click(within(aviso).getByRole('button', { name: 'Volver a entrar' }));
    await screen.findByRole('status'); // «Sesión renovada»
    expect(screen.queryByRole('region', { name: 'Estado de la sesión' })).not.toBeInTheDocument();

    // Lo mismo, sin volver a escribirlo, ahora sí se guarda.
    await usuario.click(screen.getByRole('button', { name: 'Crear evento' }));
    expect(await screen.findByRole('heading', { name: 'Listado de eventos' })).toBeInTheDocument();
    const { datos } = await clienteHttp.get('/admin/eventos', { parametros: { estado: 'PUBLICADO', finalizados: 'false' } });
    expect(datos.map((e) => e.titulo)).toContain('Vigilia de oración por la paz');
  });
});
