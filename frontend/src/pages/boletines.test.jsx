import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { http, HttpResponse } from 'msw';

import { server } from '../mocks/server.js';
import { api } from '../mocks/api.js';
import { renderConRouterYQuery } from '../test/utilidadesQuery.jsx';
import Boletines from './Boletines.jsx';

function renderBoletines(rutaInicial = '/boletines') {
  return renderConRouterYQuery(
    <Routes>
      <Route path="/boletines" element={<Boletines />} />
    </Routes>,
    [rutaInicial],
  );
}

describe('Boletines (archivo mensual en PDF)', () => {
  it('lista los boletines con periodo y descarga PDF, y permite filtrar por año y paginar', async () => {
    const usuario = userEvent.setup();
    renderBoletines('/boletines');

    expect(await screen.findByText('Edición de octubre 2026')).toBeInTheDocument();
    expect(document.title).toBe('Boletines parroquiales | Parroquia Señor de la Exaltación');
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toContain(
      'Parroquia Señor de la Exaltación',
    );
    expect(screen.getByText(/PDF \(2,4 MB\)/)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Descargar PDF: Edición de octubre 2026' }),
    ).toHaveAttribute(
      'href',
      'https://cdn.pasionistas.org.bo/sedes/senor-de-la-exaltacion/2026/10/8f3c2a1d-5b7e-4c90-a1f4-6d2e9b0c7a35.pdf',
    );
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }));

    expect(await screen.findByText('Edición de noviembre 2025')).toBeInTheDocument();
    expect(screen.getByText('Página 2 de 2')).toBeInTheDocument();

    const selectorAnio = screen.getByLabelText('Año');
    await usuario.selectOptions(selectorAnio, '2025');

    await waitFor(() => {
      expect(screen.getByText('Edición de diciembre 2025')).toBeInTheDocument();
      expect(screen.queryByText('Edición de octubre 2026')).not.toBeInTheDocument();
    });

    await usuario.click(screen.getByRole('button', { name: 'Limpiar filtros' }));

    expect(await screen.findByText('Edición de octubre 2026')).toBeInTheDocument();
  });

  it('muestra error con Reintentar cuando la API responde 500 y estado vacío si no hay boletines', async () => {
    const usuario = userEvent.setup();
    let fallo = true;

    server.use(
      http.get(api('/sedes/:sede/boletines'), () => {
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

    renderBoletines('/boletines');

    expect(
      await screen.findByText('No pudimos cargar los boletines parroquiales.'),
    ).toBeInTheDocument();

    fallo = false;
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(
      await screen.findByText('No hay boletines publicados por el momento.'),
    ).toBeInTheDocument();
  });
});

