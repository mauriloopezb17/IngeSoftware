import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { server } from '../../mocks/server.js';
import { api } from '../../mocks/api.js';
import { renderConQuery } from '../../test/utilidadesQuery.jsx';
import Horarios from './Horarios.jsx';
import Sacramentos from './Sacramentos.jsx';

describe('Horarios y Sacramentos desde la API', () => {
  it('renderiza las tarjetas compuestas de Horarios y los 6 Sacramentos', async () => {
    renderConQuery(
      <>
        <Horarios />
        <Sacramentos />
      </>,
    );

    expect(await screen.findByText('Santa Misa')).toBeInTheDocument();
    expect(screen.getByText('Confesiones y Adoración')).toBeInTheDocument();
    expect(screen.getByText('Jueves · Adoración')).toBeInTheDocument();
    expect(screen.getByText('Secretaría parroquial')).toBeInTheDocument();
    expect(screen.getByText('Asistente 24/7')).toBeInTheDocument();

    expect(screen.getByText('Bautismo')).toBeInTheDocument();
    expect(screen.getByText('Matrimonio')).toBeInTheDocument();
    expect(screen.getByText('Unción de los enfermos')).toBeInTheDocument();
  });

  it('muestra error con Reintentar cuando horarios o servicios devuelven 500', async () => {
    const usuario = userEvent.setup();
    let fallo = true;

    server.use(
      http.get(api('/sedes/:sede/horarios'), () => {
        if (fallo) {
          return HttpResponse.json(
            { error: { codigo: 'ERROR_INTERNO', mensaje: 'Error' } },
            { status: 500 },
          );
        }
        return HttpResponse.json({
          datos: [
            {
              tipo: { id: 1, nombre: 'Santa Misa' },
              filas: [
                {
                  dias: [7],
                  etiqueta: 'Domingo',
                  horarios: [{ horaInicio: '10:00', horaFin: null, descripcion: null }],
                },
              ],
            },
          ],
        });
      }),
      http.get(api('/sedes/:sede/servicios'), () =>
        HttpResponse.json(
          { error: { codigo: 'ERROR_INTERNO', mensaje: 'Error' } },
          { status: 500 },
        ),
      ),
    );

    renderConQuery(
      <>
        <Horarios />
        <Sacramentos />
      </>,
    );

    expect(await screen.findByText('No pudimos cargar los horarios.')).toBeInTheDocument();
    expect(screen.getByText('No pudimos cargar los servicios parroquiales.')).toBeInTheDocument();

    fallo = false;
    await usuario.click(screen.getAllByRole('button', { name: 'Reintentar' })[0]);

    await waitFor(() => {
      expect(screen.getByText('10:00')).toBeInTheDocument();
    });
  });

  it('muestra estado sin resultados cuando horarios o servicios vienen vacíos', async () => {
    server.use(
      http.get(api('/sedes/:sede/horarios'), () => HttpResponse.json({ datos: [] })),
      http.get(api('/sedes/:sede/servicios'), () => HttpResponse.json({ datos: [] })),
    );

    renderConQuery(
      <>
        <Horarios />
        <Sacramentos />
      </>,
    );

    expect(
      await screen.findByText('No hay horarios publicados por el momento.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('No hay servicios publicados por el momento.'),
    ).toBeInTheDocument();
  });
});
