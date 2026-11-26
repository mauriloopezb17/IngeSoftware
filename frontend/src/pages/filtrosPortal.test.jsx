import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router';

import { renderConRouterYQuery } from '../test/utilidadesQuery.jsx';
import Boletines from './Boletines.jsx';
import Calendario from './Calendario.jsx';
import Noticias from './Noticias.jsx';
import Proclamas from './Proclamas.jsx';

function Ubicacion() {
  const { pathname, search } = useLocation();
  return <p data-testid="ubicacion">{pathname + search}</p>;
}

describe('Filtros y paginación unificados en el portal', () => {
  it('Noticias: busca por texto, sincroniza la URL y permite quitar filtros en estado vacío', async () => {
    const usuario = userEvent.setup();

    renderConRouterYQuery(
      <>
        <Routes>
          <Route path="/noticias" element={<Noticias />} />
        </Routes>
        <Ubicacion />
      </>,
      ['/noticias?pagina=2'],
    );

    const buscador = await screen.findByRole('searchbox', { name: 'Buscar noticias' });
    await usuario.type(buscador, 'inexistente-xyz');

    await waitFor(() => {
      expect(screen.getByTestId('ubicacion')).toHaveTextContent('?buscar=inexistente-xyz');
    });

    expect(
      await screen.findByText('No hay noticias que coincidan con los filtros seleccionados.'),
    ).toBeInTheDocument();

    await usuario.click(screen.getAllByRole('button', { name: 'Quitar filtros' })[0]);

    await waitFor(() => {
      expect(screen.getByTestId('ubicacion')).toHaveTextContent(/^\/noticias$/);
    });
  });

  it('Noticias: conserva tipo y búsqueda al abrir una URL compartida', async () => {
    renderConRouterYQuery(
      <Routes>
        <Route path="/noticias" element={<Noticias />} />
      </Routes>,
      ['/noticias?tipo=NOTA_DE_PRENSA'],
    );

    const btnNotas = await screen.findByRole('button', { name: 'Notas de prensa' });
    expect(btnNotas).toHaveAttribute('aria-pressed', 'true');
  });

  it('Calendario: muestra botón Quitar filtros cuando no hay resultados con filtro', async () => {
    const usuario = userEvent.setup();

    renderConRouterYQuery(
      <>
        <Routes>
          <Route path="/calendario" element={<Calendario />} />
        </Routes>
        <Ubicacion />
      </>,
      ['/calendario?categoria=9999'],
    );

    expect(
      await screen.findByText('No hay próximos eventos que coincidan con los filtros seleccionados.'),
    ).toBeInTheDocument();

    await usuario.click(screen.getAllByRole('button', { name: 'Quitar filtros' })[0]);

    await waitFor(() => {
      expect(screen.getByTestId('ubicacion')).toHaveTextContent(/^\/calendario$/);
    });
  });

  it('Proclamas: muestra botón Quitar filtros en el historial cuando el año no tiene resultados', async () => {
    const usuario = userEvent.setup();

    renderConRouterYQuery(
      <>
        <Routes>
          <Route path="/proclamas" element={<Proclamas />} />
        </Routes>
        <Ubicacion />
      </>,
      ['/proclamas?anio=2024'],
    );

    expect(
      await screen.findByText('No hay proclamas registradas para el año 2024.'),
    ).toBeInTheDocument();

    await usuario.click(screen.getAllByRole('button', { name: 'Quitar filtros' })[0]);

    await waitFor(() => {
      expect(screen.getByTestId('ubicacion')).toHaveTextContent(/^\/proclamas$/);
    });
  });

  it('Boletines: cambia de página y devuelve el foco al inicio del listado', async () => {
    const usuario = userEvent.setup();

    renderConRouterYQuery(
      <>
        <Routes>
          <Route path="/boletines" element={<Boletines />} />
          <Route path="/boletines/:periodo" element={<Boletines />} />
        </Routes>
        <Ubicacion />
      </>,
      ['/boletines'],
    );

    expect(await screen.findByText('Página 1 de 2')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }));

    expect(await screen.findByText('Página 2 de 2')).toBeInTheDocument();
    expect(screen.getByTestId('ubicacion')).toHaveTextContent('?pagina=2');
  });
});
