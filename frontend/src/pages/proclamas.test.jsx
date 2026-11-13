import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { http, HttpResponse } from 'msw';

import { server } from '../mocks/server.js';
import { api } from '../mocks/api.js';
import { renderConRouterYQuery } from '../test/utilidadesQuery.jsx';
import Proclamas from './Proclamas.jsx';

function renderProclamas(rutaInicial = '/proclamas') {
  return renderConRouterYQuery(
    <Routes>
      <Route path="/proclamas" element={<Proclamas />} />
    </Routes>,
    [rutaInicial],
  );
}

describe('Proclamas (vigentes e historial público)', () => {
  it('muestra las proclamas vigentes, el historial con sus publicaciones y filtra por año', async () => {
    const usuario = userEvent.setup();
    renderProclamas('/proclamas');

    expect(
      await screen.findAllByText('Juan Carlos M. Q. & María Fernanda R. V.'),
    ).not.toHaveLength(0);
    expect(document.title).toBe('Proclamas matrimoniales | Parroquia Señor de la Exaltación');
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toContain(
      'Parroquia Señor de la Exaltación',
    );
    expect(await screen.findByText('Carlos E. Mendoza T. & Valeria N. Quispe P.')).toBeInTheDocument();

    const selectorAnio = screen.getByLabelText('Año');
    await usuario.selectOptions(selectorAnio, '2025');

    await waitFor(() => {
      expect(screen.getByText('Marco A. Rojas C. & Lucía B. Vargas H.')).toBeInTheDocument();
      expect(screen.queryByText('Carlos E. Mendoza T. & Valeria N. Quispe P.')).not.toBeInTheDocument();
    });

    await usuario.click(screen.getByRole('button', { name: 'Limpiar filtros' }));

    expect(
      await screen.findByText('Carlos E. Mendoza T. & Valeria N. Quispe P.'),
    ).toBeInTheDocument();
  });

  it('pagina los resultados del historial', async () => {
    const usuario = userEvent.setup();

    server.use(
      http.get(api('/sedes/:sede/proclamas/historial'), ({ request }) => {
        const url = new URL(request.url);
        const pagina = Number(url.searchParams.get('pagina') ?? '1');

        const elemento =
          pagina === 2
            ? {
                id: 99,
                contrayente1: 'Pareja Página 2 A',
                contrayente2: 'Pareja Página 2 B',
                fechaMatrimonio: '2025-10-12T11:00:00-04:00',
                numeroProclama: 3,
                publicaciones: [{ numero: 1, fecha: '2025-09-28' }],
              }
            : {
                id: 98,
                contrayente1: 'Pareja Página 1 A',
                contrayente2: 'Pareja Página 1 B',
                fechaMatrimonio: '2026-11-12T11:00:00-04:00',
                numeroProclama: 2,
                publicaciones: [{ numero: 1, fecha: '2026-10-25' }],
              };

        return HttpResponse.json({
          datos: [elemento],
          paginacion: {
            pagina,
            porPagina: 5,
            total: 6,
            totalPaginas: 2,
          },
        });
      }),
    );

    renderProclamas('/proclamas?pagina=1');

    expect(await screen.findByText('Pareja Página 1 A & Pareja Página 1 B')).toBeInTheDocument();
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }));

    expect(await screen.findByText('Pareja Página 2 A & Pareja Página 2 B')).toBeInTheDocument();
    expect(screen.getByText('Página 2 de 2')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Anterior' }));

    expect(await screen.findByText('Pareja Página 1 A & Pareja Página 1 B')).toBeInTheDocument();
  });

  it('muestra error con Reintentar cuando el historial devuelve 500 y estado vacío si no hay registros', async () => {
    const usuario = userEvent.setup();
    let fallo = true;

    server.use(
      http.get(api('/sedes/:sede/proclamas/historial'), () => {
        if (fallo) {
          return HttpResponse.json(
            { error: { codigo: 'ERROR_INTERNO', mensaje: 'Error interno' } },
            { status: 500 },
          );
        }
        return HttpResponse.json({
          datos: [],
          paginacion: { pagina: 1, porPagina: 5, total: 0, totalPaginas: 0 },
        });
      }),
    );

    renderProclamas('/proclamas');

    expect(
      await screen.findByText('No pudimos cargar el historial de proclamas.'),
    ).toBeInTheDocument();

    fallo = false;
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(
      await screen.findByText('No hay proclamas registradas en el historial.'),
    ).toBeInTheDocument();
  });
});

