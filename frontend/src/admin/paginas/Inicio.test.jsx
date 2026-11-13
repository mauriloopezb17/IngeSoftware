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
import { SesionProvider } from '../sesion/SesionProvider.jsx';
import Inicio from './Inicio.jsx';

const entrar = (usuario) =>
  clienteHttp.post('/auth/login', { correo: `${usuario}@parroquia.test`, contrasena: CONTRASENA_DESARROLLO });

function Ubicacion() {
  const { pathname, search } = useLocation();
  return <p data-testid="ubicacion">{pathname + search}</p>;
}

function montar() {
  return render(
    <QueryClientProvider client={crearQueryClient()}>
      <SesionProvider>
        <MemoryRouter initialEntries={['/admin/inicio']}>
          <Routes>
            <Route path="/admin/inicio" element={<Inicio />} />
            <Route path="*" element={<Ubicacion />} />
          </Routes>
        </MemoryRouter>
      </SesionProvider>
    </QueryClientProvider>,
  );
}

const tarjeta = (nombre) => screen.findByRole('article', { name: nombre });
const titulosDeTarjetas = () => screen.getAllByRole('article').map((t) => within(t).getByRole('heading').textContent);

describe('inicio del panel: resumen de pendientes', () => {
  beforeEach(reiniciarMocksAdmin);
  afterEach(reiniciarMocksAdmin);

  it('el Párroco ve lo que está en revisión, los próximos eventos y las proclamas vigentes', async () => {
    await entrar('parroco');
    montar();

    const revision = await tarjeta('En revisión');
    expect(await within(revision).findByText('2 publicaciones')).toBeInTheDocument();
    expect(within(revision).getByText('Jornada de oración por las vocaciones')).toBeInTheDocument();
    expect(within(revision).getByRole('link', { name: /bandeja de revisión/ })).toHaveAttribute(
      'href',
      '/admin/publicaciones/revision',
    );

    const eventos = await tarjeta('Próximos eventos');
    expect(await within(eventos).findByText('5 eventos')).toBeInTheDocument();
    expect(within(eventos).getByText('Adoración eucarística comunitaria')).toBeInTheDocument();
    // Solo los próximos y publicados: no el borrador ni el archivado.
    expect(within(eventos).queryByText('Concierto de villancicos')).not.toBeInTheDocument();

    const proclamas = await tarjeta('Proclamas vigentes');
    expect(await within(proclamas).findByText('3 proclamas')).toBeInTheDocument();
    expect(within(proclamas).getByText('Juan Carlos M. Q. y María Fernanda R. V.')).toBeInTheDocument();
    expect(within(proclamas).getByText(/3\.ª proclama/)).toBeInTheDocument();

    expect(titulosDeTarjetas()).toEqual(['En revisión', 'Próximos eventos', 'Proclamas vigentes']);
  });

  it('el Administrador también ve la tarjeta de revisión (puede aprobar)', async () => {
    await entrar('admin');
    montar();

    expect(await tarjeta('En revisión')).toBeInTheDocument();
    expect(screen.queryByRole('article', { name: 'Mis borradores' })).not.toBeInTheDocument();
  });

  it('Marketing ve sus borradores y sus rechazadas, con la observación del Párroco', async () => {
    await entrar('marketing');
    montar();

    const borradores = await tarjeta('Mis borradores');
    expect(await within(borradores).findByText('1 borrador')).toBeInTheDocument();
    expect(within(borradores).getByRole('link', { name: 'Retiro de Adviento: inscripciones abiertas' })).toHaveAttribute(
      'href',
      '/admin/publicaciones/4/editar',
    );

    const rechazadas = await tarjeta('Rechazadas');
    expect(await within(rechazadas).findByText('1 rechazada')).toBeInTheDocument();
    expect(within(rechazadas).getByRole('link', { name: 'Encuentro de monaguillos de la Vicaría Sur' })).toBeInTheDocument();
    expect(within(rechazadas).getByText(/Agregar el nombre de la parroquia anfitriona/)).toBeInTheDocument();

    // Marketing no aprueba: no ve la tarjeta de revisión. Sí consulta eventos y proclamas.
    expect(screen.queryByRole('article', { name: 'En revisión' })).not.toBeInTheDocument();
    expect(titulosDeTarjetas()).toEqual(['Mis borradores', 'Rechazadas', 'Próximos eventos', 'Proclamas vigentes']);
  });

  it('Secretaría no ve tarjetas de publicaciones: solo eventos y proclamas', async () => {
    await entrar('secretaria');
    montar();

    await tarjeta('Próximos eventos');
    expect(titulosDeTarjetas()).toEqual(['Próximos eventos', 'Proclamas vigentes']);
  });

  it('muestra «vacío» cuando no hay nada pendiente', async () => {
    await entrar('parroco');
    server.use(
      http.get(api('/admin/publicaciones'), () =>
        HttpResponse.json({ datos: [], paginacion: { pagina: 1, porPagina: 3, total: 0, totalPaginas: 0 } }),
      ),
    );
    montar();

    const revision = await tarjeta('En revisión');
    expect(await within(revision).findByText('0 publicaciones')).toBeInTheDocument();
    expect(within(revision).getByText('No hay publicaciones esperando tu revisión.')).toBeInTheDocument();
  });

  it('si una tarjeta falla, las demás siguen funcionando y se puede reintentar', async () => {
    await entrar('secretaria');
    let falla = true;
    server.use(
      http.get(api('/admin/eventos'), () =>
        falla
          ? HttpResponse.json({ error: { codigo: 'ERROR_INTERNO', mensaje: 'Error del servidor.', detalles: [] } }, { status: 500 })
          : HttpResponse.json({ datos: [], paginacion: { pagina: 1, porPagina: 3, total: 0, totalPaginas: 0 } }),
      ),
    );
    montar();
    const usuario = userEvent.setup();

    const eventos = await tarjeta('Próximos eventos');
    expect(await within(eventos).findByRole('alert', {}, { timeout: 8000 })).toHaveTextContent('Error del servidor.');
    const proclamas = await tarjeta('Proclamas vigentes');
    expect(await within(proclamas).findByText('3 proclamas')).toBeInTheDocument();

    falla = false;
    await usuario.click(within(eventos).getByRole('button', { name: 'Reintentar' }));
    expect(await within(eventos).findByText('0 eventos')).toBeInTheDocument();
  });

  it('el saludo y el título se mantienen', async () => {
    await entrar('parroco');
    montar();

    expect(await screen.findByRole('heading', { level: 1, name: 'Inicio' })).toBeInTheDocument();
    expect(await screen.findByText('Bienvenido, Párroco (desarrollo).')).toBeInTheDocument();
  });
});
