import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { http, HttpResponse } from 'msw';

import { server } from '../mocks/server.js';
import { api } from '../mocks/api.js';
import { renderConRouterYQuery } from '../test/utilidadesQuery.jsx';
import Noticias from './Noticias.jsx';

function crearPublicacionPrueba(id, overrides = {}) {
  return {
    id,
    tipo: { codigo: 'NOTICIA', nombre: 'Noticia' },
    titulo: `Noticia de prueba ${id}`,
    slug: `noticia-prueba-${id}`,
    resumen: `Resumen de la noticia ${id}.`,
    categoria: { id: 1, nombre: 'Sacramentos', slug: 'sacramentos' },
    imagenPortada: {
      id: 2,
      url: '/media/seed/crucifijo.webp',
      textoAlternativo: `Imagen ${id}`,
      ancho: 1888,
      alto: 1059,
    },
    urlExterna: null,
    destacada: false,
    fechaPublicacion: '2026-10-18T12:00:00-04:00',
    fechaExpiracion: null,
    ...overrides,
  };
}

function renderNoticias(rutaInicial = '/noticias') {
  return renderConRouterYQuery(
    <Routes>
      <Route path="/noticias" element={<Noticias />} />
    </Routes>,
    [rutaInicial],
  );
}

describe('Noticias (listado con filtros y paginación)', () => {
  it('muestra las noticias sin incluir avisos y permite filtrar por categoría y tipo', async () => {
    const usuario = userEvent.setup();
    renderNoticias('/noticias');

    expect(
      await screen.findByText('Primeras comuniones: 42 niños recibieron a Jesús'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Encuentro de monaguillos de la Vicaría Sur'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Inscripciones abiertas para la catequesis de Confirmación 2027.'),
    ).not.toBeInTheDocument();

    const selectorCategoria = await screen.findByLabelText('Categoría');
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Sacramentos' })).toBeInTheDocument();
    });

    await usuario.selectOptions(selectorCategoria, 'sacramentos');

    await waitFor(() => {
      expect(
        screen.getByText('Primeras comuniones: 42 niños recibieron a Jesús'),
      ).toBeInTheDocument();
      expect(
        screen.queryByText('Encuentro de monaguillos de la Vicaría Sur'),
      ).not.toBeInTheDocument();
    });

    await usuario.click(screen.getByRole('button', { name: 'Notas de prensa' }));

    expect(
      await screen.findByText('No hay noticias que coincidan con los filtros seleccionados.'),
    ).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Limpiar filtros' }));

    expect(
      await screen.findByText('Encuentro de monaguillos de la Vicaría Sur'),
    ).toBeInTheDocument();
  });

  it('respeta los parámetros iniciales de la URL y pagina resultados', async () => {
    const usuario = userEvent.setup();

    server.use(
      http.get(api('/sedes/:sede/publicaciones'), ({ request }) => {
        const url = new URL(request.url);
        const pagina = Number(url.searchParams.get('pagina') ?? '1');
        const tipo = url.searchParams.get('tipo');

        expect(tipo).toBe('NOTA_DE_PRENSA');

        const lista =
          pagina === 2
            ? [crearPublicacionPrueba(7, { tipo: { codigo: 'NOTA_DE_PRENSA', nombre: 'Nota de prensa' } })]
            : [crearPublicacionPrueba(1, { tipo: { codigo: 'NOTA_DE_PRENSA', nombre: 'Nota de prensa' } })];

        return HttpResponse.json({
          datos: lista,
          paginacion: {
            pagina,
            porPagina: 6,
            total: 7,
            totalPaginas: 2,
          },
        });
      }),
    );

    renderNoticias('/noticias?tipo=NOTA_DE_PRENSA&pagina=1');

    expect(await screen.findByText('Noticia de prueba 1')).toBeInTheDocument();
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }));

    expect(await screen.findByText('Noticia de prueba 7')).toBeInTheDocument();
    expect(screen.getByText('Página 2 de 2')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Anterior' }));

    expect(await screen.findByText('Noticia de prueba 1')).toBeInTheDocument();
  });

  it('muestra error con Reintentar cuando la API responde 500', async () => {
    const usuario = userEvent.setup();
    let fallo = true;

    server.use(
      http.get(api('/sedes/:sede/publicaciones'), () => {
        if (fallo) {
          return HttpResponse.json(
            { error: { codigo: 'ERROR_INTERNO', mensaje: 'Error interno' } },
            { status: 500 },
          );
        }
        return HttpResponse.json({
          datos: [crearPublicacionPrueba(10)],
          paginacion: { pagina: 1, porPagina: 6, total: 1, totalPaginas: 1 },
        });
      }),
    );

    renderNoticias('/noticias');

    expect(await screen.findByText('No pudimos cargar las noticias.')).toBeInTheDocument();

    fallo = false;
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Noticia de prueba 10')).toBeInTheDocument();
  });
});
