import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { http, HttpResponse } from 'msw';

import { server } from '../mocks/server.js';
import { api } from '../mocks/api.js';
import { renderConRouterYQuery } from '../test/utilidadesQuery.jsx';
import Calendario from './Calendario.jsx';

function renderCalendario(rutaInicial = '/calendario') {
  return renderConRouterYQuery(
    <Routes>
      <Route path="/calendario" element={<Calendario />} />
    </Routes>,
    [rutaInicial],
  );
}

describe('Calendario (eventos próximos con filtros y paginación)', () => {
  it('muestra los próximos eventos sin incluir los pasados y permite filtrar por categoría y mes', async () => {
    const usuario = userEvent.setup();
    renderCalendario('/calendario');

    expect(await screen.findByText('Adoración eucarística comunitaria')).toBeInTheDocument();
    expect(document.title).toBe('Calendario de eventos | Parroquia Señor de la Exaltación');
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toContain(
      'Parroquia Señor de la Exaltación',
    );
    expect(
      screen.queryByText('Evento pasado de archivo (oculto automáticamente)'),
    ).not.toBeInTheDocument();

    const botonCatequesis = await screen.findByRole('button', { name: 'Catequesis' });
    await usuario.click(botonCatequesis);

    await waitFor(() => {
      expect(
        screen.getByText('Charla pre-bautismal para padres y padrinos'),
      ).toBeInTheDocument();
      expect(screen.queryByText('Adoración eucarística comunitaria')).not.toBeInTheDocument();
    });

    const selectorMes = screen.getByLabelText('Mes');
    const opcionesMes = Array.from(selectorMes.querySelectorAll('option')).filter(
      (opt) => opt.value !== '',
    );
    await usuario.selectOptions(selectorMes, opcionesMes[5].value);

    expect(
      await screen.findByText('No hay próximos eventos que coincidan con los filtros seleccionados.'),
    ).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Limpiar filtros' }));

    expect(await screen.findByText('Adoración eucarística comunitaria')).toBeInTheDocument();
  });

  it('pagina los eventos y pasa desde/hasta al seleccionar un mes', async () => {
    const usuario = userEvent.setup();

    renderCalendario('/calendario');

    expect(await screen.findByText('Adoración eucarística comunitaria')).toBeInTheDocument();
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }));

    expect(await screen.findByText('Catequesis familiar comunitaria')).toBeInTheDocument();
    expect(screen.getByText('Página 2 de 2')).toBeInTheDocument();
  });

  it('muestra error con Reintentar cuando la API responde 500', async () => {
    const usuario = userEvent.setup();
    let fallo = true;

    server.use(
      http.get(api('/sedes/:sede/eventos'), () => {
        if (fallo) {
          return HttpResponse.json(
            { error: { codigo: 'ERROR_INTERNO', mensaje: 'Error interno' } },
            { status: 500 },
          );
        }
        return HttpResponse.json({
          datos: [],
          paginacion: { pagina: 1, porPagina: 6, total: 0, totalPaginas: 0 },
        });
      }),
    );

    renderCalendario('/calendario');

    expect(
      await screen.findByText('No pudimos cargar los próximos eventos.'),
    ).toBeInTheDocument();

    fallo = false;
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(
      await screen.findByText('No hay próximos eventos programados por el momento.'),
    ).toBeInTheDocument();
  });
});

