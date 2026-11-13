import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { server } from '../../mocks/server.js';
import { api } from '../../mocks/api.js';
import { renderConQuery } from '../../test/utilidadesQuery.jsx';
import Agenda from './Agenda.jsx';
import Proclamas from './Proclamas.jsx';

describe('Agenda y Proclamas desde la API', () => {
  it('renderiza eventos, avisos, boletín y proclamas desde los endpoints', async () => {
    renderConQuery(
      <>
        <Agenda />
        <Proclamas />
      </>,
    );

    expect(await screen.findByText('Vigilia de Todos los Santos')).toBeInTheDocument();
    expect(screen.getByText(/8:00 – 10:00 – 12:00/)).toBeInTheDocument();
    expect(
      await screen.findByText(
        'Inscripciones abiertas para la catequesis de Confirmación 2027.',
      ),
    ).toBeInTheDocument();
    expect(await screen.findByText('Edición de octubre 2026')).toBeInTheDocument();
    expect(screen.getByText(/PDF · 2,4 MB/)).toBeInTheDocument();

    expect(
      await screen.findByText('Juan Carlos M. Q. & María Fernanda R. V.'),
    ).toBeInTheDocument();
    expect(screen.getByText('3.ª proclama')).toBeInTheDocument();
  });

  it('muestra error con Reintentar cuando eventos, avisos o proclamas devuelven 500', async () => {
    const usuario = userEvent.setup();
    let fallaProclamas = true;

    server.use(
      http.get(api('/sedes/:sede/eventos'), () =>
        HttpResponse.json(
          { error: { codigo: 'ERROR_INTERNO', mensaje: 'Error' } },
          { status: 500 },
        ),
      ),
      http.get(api('/sedes/:sede/publicaciones'), () =>
        HttpResponse.json(
          { error: { codigo: 'ERROR_INTERNO', mensaje: 'Error' } },
          { status: 500 },
        ),
      ),
      http.get(api('/sedes/:sede/proclamas'), () => {
        if (fallaProclamas) {
          return HttpResponse.json(
            { error: { codigo: 'ERROR_INTERNO', mensaje: 'Error' } },
            { status: 500 },
          );
        }
        return HttpResponse.json({
          datos: [
            {
              id: 10,
              contrayente1: 'Pareja A',
              contrayente2: 'Pareja B',
              fechaMatrimonio: '2026-12-05T12:00:00-04:00',
              numeroProclama: 1,
              publicaciones: [{ numero: 1, fecha: '2026-11-12' }],
            },
          ],
        });
      }),
    );

    renderConQuery(
      <>
        <Agenda />
        <Proclamas />
      </>,
    );

    expect(
      await screen.findByText('No pudimos cargar los próximos eventos.'),
    ).toBeInTheDocument();
    expect(await screen.findByText('No pudimos cargar los avisos.')).toBeInTheDocument();
    expect(
      await screen.findByText('No pudimos cargar las proclamas matrimoniales.'),
    ).toBeInTheDocument();

    fallaProclamas = false;
    const botones = screen.getAllByRole('button', { name: 'Reintentar' });
    await usuario.click(botones[botones.length - 1]);

    await waitFor(() => {
      expect(screen.getByText('Pareja A & Pareja B')).toBeInTheDocument();
    });
  });

  it('oculta la tarjeta del boletín y muestra sin resultados cuando las listas vienen vacías', async () => {
    server.use(
      http.get(api('/sedes/:sede/eventos'), () =>
        HttpResponse.json({
          datos: [],
          paginacion: { pagina: 1, porPagina: 4, total: 0, totalPaginas: 0 },
        }),
      ),
      http.get(api('/sedes/:sede/publicaciones'), () =>
        HttpResponse.json({
          datos: [],
          paginacion: { pagina: 1, porPagina: 3, total: 0, totalPaginas: 0 },
        }),
      ),
      http.get(api('/sedes/:sede/boletines'), () =>
        HttpResponse.json({
          datos: [],
          paginacion: { pagina: 1, porPagina: 1, total: 0, totalPaginas: 0 },
        }),
      ),
      http.get(api('/sedes/:sede/proclamas'), () => HttpResponse.json({ datos: [] })),
    );

    renderConQuery(
      <>
        <Agenda />
        <Proclamas />
      </>,
    );

    expect(
      await screen.findByText('No hay próximos eventos programados.'),
    ).toBeInTheDocument();
    expect(await screen.findByText('No hay avisos vigentes.')).toBeInTheDocument();
    expect(
      await screen.findByText('No hay proclamas vigentes esta semana.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Boletín parroquial')).not.toBeInTheDocument();
  });
});
