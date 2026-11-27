import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { api } from '../mocks/api.js';
import { server } from '../mocks/server.js';
import { renderConRouterYQuery } from '../test/utilidadesQuery.jsx';
import Comunidades from '../components/parroquia/Comunidades.jsx';
import ComunidadesPagina from './ComunidadesPagina.jsx';

describe('ComunidadesPagina (/comunidades)', () => {
  it('muestra el árbol Parroquia → Capilla → Comunidad y la Comunidad pasionista en una sección aparte', async () => {
    renderConRouterYQuery(<ComunidadesPagina />, ['/comunidades']);

    expect(
      await screen.findByRole('heading', { name: 'Parroquia Señor de la Exaltación' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Capilla San Pablo de la Cruz' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Comunidad San Gabriel (de ejemplo)' }),
    ).toBeInTheDocument();

    const seccionPasionista = document.getElementById('comunidad-pasionista');
    expect(seccionPasionista).toBeInTheDocument();
    expect(
      within(seccionPasionista).getByRole('heading', { name: 'Comunidad pasionista' }),
    ).toBeInTheDocument();
    expect(
      within(seccionPasionista).getByText('Comunidad Pasionista de Obrajes (de ejemplo)'),
    ).toBeInTheDocument();

    const enlaceMaps = screen.getByRole('link', {
      name: 'Cómo llegar a Parroquia Señor de la Exaltación en Google Maps',
    });
    expect(enlaceMaps).toHaveAttribute('href', expect.stringContaining('google.com/maps'));
  });

  it('muestra estado de error y vacío cuando la API falla o no devuelve sedes', async () => {
    server.use(
      http.get(api('/sedes/arbol'), () =>
        HttpResponse.json(
          { error: { codigo: 'ERROR_INTERNO', mensaje: 'Error interno' } },
          { status: 500 },
        ),
      ),
    );

    renderConRouterYQuery(<ComunidadesPagina />, ['/comunidades']);

    expect(
      await screen.findByText('No pudimos cargar las comunidades parroquiales.'),
    ).toBeInTheDocument();
  });
});

describe('Comunidades (resumen de portada)', () => {
  it('enlaza a /comunidades y separa la comunidad pasionista de las parroquias y capillas', async () => {
    renderConRouterYQuery(<Comunidades />);

    expect(
      await screen.findByRole('heading', { name: 'Señor de la Exaltación' }),
    ).toBeInTheDocument();
    const enlaceVerTodas = screen.getByRole('link', { name: /Ver todas las comunidades/ });
    expect(enlaceVerTodas).toHaveAttribute('href', '/comunidades');
    expect(screen.getByRole('heading', { name: 'Comunidad pasionista' })).toBeInTheDocument();
  });
});
