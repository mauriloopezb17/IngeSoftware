import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

import { server } from '../mocks/server.js';
import { api } from '../mocks/api.js';
import { renderConQuery } from '../test/utilidadesQuery.jsx';
import Buscar from './Buscar.jsx';

function Ubicacion() {
  const { pathname, search } = useLocation();
  return <p data-testid="ubicacion">{pathname + search}</p>;
}

function renderBuscar(entrada = '/buscar') {
  return renderConQuery(
    <MemoryRouter initialEntries={[entrada]}>
      <Routes>
        <Route path="/buscar" element={<Buscar />} />
        <Route path="*" element={<Ubicacion />} />
      </Routes>
      <Ubicacion />
    </MemoryRouter>,
  );
}

describe('Página de resultados /buscar', () => {
  it('muestra aviso cuando no hay consulta o tiene menos de 2 letras', () => {
    renderBuscar('/buscar?q=a');

    expect(
      screen.getByText('Escribe al menos 2 letras para buscar en el portal.'),
    ).toBeInTheDocument();
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  });

  it('muestra pestañas con totales, oculta las de 0 salvo la activa, y sincroniza filtros con la URL', async () => {
    const usuario = userEvent.setup();
    renderBuscar('/buscar?q=bautismo');

    expect(
      await screen.findByRole('heading', { level: 2, name: /Bautismo/i }),
    ).toBeInTheDocument();

    const tabTodo = screen.getByRole('tab', { name: /Todo/i });
    const tabSacramentos = screen.getByRole('tab', { name: /Sacramentos/i });
    expect(tabTodo).toHaveAttribute('aria-selected', 'true');
    expect(tabSacramentos).toBeInTheDocument();
    // Tipos sin resultados quedan ocultos
    expect(screen.queryByRole('tab', { name: /Boletines/i })).not.toBeInTheDocument();

    await usuario.click(tabSacramentos);
    expect(tabSacramentos).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('ubicacion')).toHaveTextContent('/buscar?q=bautismo&tipo=sacramento');

    await usuario.selectOptions(screen.getByLabelText('Ordenar por'), 'reciente');
    expect(screen.getByTestId('ubicacion')).toHaveTextContent(
      '/buscar?q=bautismo&tipo=sacramento&orden=reciente',
    );
  });

  it('renderiza segmentos resaltados con <mark> sin inyectar HTML', async () => {
    server.use(
      http.get(api('/sedes/:sede/buscar'), () =>
        HttpResponse.json({
          datos: [
            {
              tipo: 'noticia',
              id: 77,
              titulo: 'Prueba segura',
              fragmento: [
                { texto: 'Texto con <img src=x onerror=alert(1)> y ', resaltado: false },
                { texto: 'bautismo', resaltado: true },
              ],
              url: '/noticias/prueba-segura',
              fecha: '2026-10-15T10:00:00-04:00',
              imagen: null,
            },
          ],
          paginacion: { pagina: 1, porPagina: 10, total: 1, totalPaginas: 1 },
          totalesPorTipo: {
            noticia: 1,
            evento: 0,
            sacramento: 0,
            grupo: 0,
            boletin: 0,
            pagina: 0,
          },
        }),
      ),
    );

    const { container } = renderBuscar('/buscar?q=bautismo');

    const marca = await screen.findByText('bautismo', { selector: 'mark' });
    expect(marca).toBeInTheDocument();
    expect(
      screen.getByText(/Texto con <img src=x onerror=alert\(1\)> y/),
    ).toBeInTheDocument();
    expect(container.querySelector('img[src="x"]')).not.toBeInTheDocument();
  });

  it('muestra sugerencias cuando no hay resultados', async () => {
    renderBuscar('/buscar?q=palabrainexistente123');

    expect(
      await screen.findByText('No encontramos resultados para «palabrainexistente123»'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Noticias' })).toHaveAttribute('href', '/noticias');
    expect(screen.getByRole('link', { name: 'Calendario' })).toHaveAttribute('href', '/calendario');
    expect(screen.getByRole('link', { name: 'Sacramentos' })).toHaveAttribute(
      'href',
      '/sacramentos',
    );
  });

  it('muestra el mensaje específico cuando responde 429', async () => {
    server.use(
      http.get(api('/sedes/:sede/buscar'), () =>
        HttpResponse.json(
          { error: { codigo: 'LIMITE_SOLICITUDES', mensaje: 'Demasiadas búsquedas.' } },
          { status: 429 },
        ),
      ),
    );

    renderBuscar('/buscar?q=bautismo');
    expect(
      await screen.findByText('Hiciste muchas búsquedas seguidas. Espera un momento.'),
    ).toBeInTheDocument();
  });

  it('muestra Reintentar cuando la API falla con 500 y recupera al reintentar', async () => {

    let fallar = true;
    server.use(
      http.get(api('/sedes/:sede/buscar'), () => {
        if (fallar) {
          return HttpResponse.json(
            { error: { codigo: 'ERROR_INTERNO', mensaje: 'Error interno' } },
            { status: 500 },
          );
        }
        return HttpResponse.json({
          datos: [
            {
              tipo: 'sacramento',
              id: 1,
              titulo: 'Bautismo',
              fragmento: [{ texto: 'Sacramento del bautismo', resaltado: true }],
              url: '/sacramentos/bautismo',
              fecha: null,
              imagen: null,
            },
          ],
          paginacion: { pagina: 1, porPagina: 10, total: 1, totalPaginas: 1 },
          totalesPorTipo: {
            noticia: 0,
            evento: 0,
            sacramento: 1,
            grupo: 0,
            boletin: 0,
            pagina: 0,
          },
        });
      }),
    );

    const usuario = userEvent.setup();
    renderBuscar('/buscar?q=misa');
    const botonReintentar = await screen.findByRole('button', { name: 'Reintentar' });
    fallar = false;
    await usuario.click(botonReintentar);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /Bautismo/i })).toBeInTheDocument();
    });
  });
});
