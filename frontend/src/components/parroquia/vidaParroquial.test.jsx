import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { server } from '../../mocks/server.js';
import { api } from '../../mocks/api.js';
import { renderConRouterYQuery } from '../../test/utilidadesQuery.jsx';
import VidaParroquial from './VidaParroquial.jsx';

describe('VidaParroquial desde la API', () => {
  it('renderiza noticias con imágenes por URL, dimensiones, alt de respaldo y enlaces', async () => {
    renderConRouterYQuery(<VidaParroquial />);

    expect(
      await screen.findByText('Primeras comuniones: 42 niños recibieron a Jesús'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Encuentro de Pastoral Familiar: Cuando la muerte llega a la familia'),
    ).toBeInTheDocument();

    const imgCrucifijo = screen.getByAltText('Crucifijo en el interior del templo parroquial');
    expect(imgCrucifijo).toHaveAttribute('src', '/media/seed/crucifijo.webp');
    expect(imgCrucifijo).toHaveAttribute('width', '1888');
    expect(imgCrucifijo).toHaveAttribute('height', '1059');

    const enlaceInterno = screen.getByRole('link', {
      name: 'Leer publicación: Primeras comuniones: 42 niños recibieron a Jesús',
    });
    expect(enlaceInterno).toHaveAttribute('href', '/noticias/primeras-comuniones-42-ninos');

    const enlaceExterno = screen.getByRole('link', {
      name: 'Leer publicación: Encuentro de Pastoral Familiar: Cuando la muerte llega a la familia',
    });
    expect(enlaceExterno).toHaveAttribute('target', '_blank');
  });

  it('usa el título como alt cuando textoAlternativo es null', async () => {
    server.use(
      http.get(api('/sedes/:sede/publicaciones'), () =>
        HttpResponse.json({
          datos: [
            {
              id: 99,
              tipo: { codigo: 'NOTA_DE_PRENSA', nombre: 'Nota de prensa' },
              titulo: 'Nota sin alt explícito',
              slug: 'nota-sin-alt',
              resumen: 'Resumen de prueba.',
              categoria: null,
              imagenPortada: {
                id: 1,
                url: '/media/seed/exterior-parroquia.webp',
                textoAlternativo: null,
                ancho: 1878,
                alto: 1057,
              },
              urlExterna: null,
              destacada: false,
              fechaPublicacion: '2026-10-15T12:00:00-04:00',
              fechaExpiracion: null,
            },
          ],
          paginacion: { pagina: 1, porPagina: 3, total: 1, totalPaginas: 1 },
        }),
      ),
    );

    renderConRouterYQuery(<VidaParroquial />);

    const img = await screen.findByAltText('Nota sin alt explícito');
    expect(img).toHaveAttribute('src', '/media/seed/exterior-parroquia.webp');
  });

  it('muestra error con Reintentar cuando falla con 500 y sin resultados cuando viene vacía', async () => {
    const usuario = userEvent.setup();
    let fallo = true;

    server.use(
      http.get(api('/sedes/:sede/publicaciones'), () => {
        if (fallo) {
          return HttpResponse.json(
            { error: { codigo: 'ERROR_INTERNO', mensaje: 'Error' } },
            { status: 500 },
          );
        }
        return HttpResponse.json({
          datos: [],
          paginacion: { pagina: 1, porPagina: 3, total: 0, totalPaginas: 0 },
        });
      }),
    );

    renderConRouterYQuery(<VidaParroquial />);

    expect(
      await screen.findByText('No pudimos cargar las noticias de vida parroquial.'),
    ).toBeInTheDocument();

    fallo = false;
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }));

    await waitFor(() => {
      expect(
        screen.getByText('No hay noticias publicadas por el momento.'),
      ).toBeInTheDocument();
    });
  });
});
