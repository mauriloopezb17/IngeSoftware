import { describe, it, expect } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { http, HttpResponse } from 'msw';

import { server } from '../mocks/server.js';
import { api } from '../mocks/api.js';
import { renderConRouterYQuery } from '../test/utilidadesQuery.jsx';
import PaginaPublica from './PaginaPublica.jsx';

function renderPagina(rutaInicial = '/paginas/historia') {
  return renderConRouterYQuery(
    <Routes>
      <Route path="/paginas/:slug" element={<PaginaPublica />} />
    </Routes>,
    [rutaInicial],
  );
}

describe('PaginaPublica (/paginas/:slug)', () => {
  it('renderiza la página creada en el panel con sus bloques y la agrega al menú', async () => {
    renderPagina('/paginas/historia');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Nuestra historia' }),
    ).toBeInTheDocument();
    expect(document.title).toBe('Nuestra historia | Parroquia Señor de la Exaltación');
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toContain(
      'Obrajes, La Paz',
    );
    expect(
      screen.getByText('Acompañando a Obrajes desde hace décadas'),
    ).toBeInTheDocument();
    expect(screen.getByText(/San Pablo de la Cruz/)).toBeInTheDocument();
    expect(screen.getByText('Fachada sobre la Av. Héctor Ormachea')).toBeInTheDocument();

    // El menú dinámico incluye la página publicada con mostrarEnMenu=true.
    const navegacion = screen.getByRole('navigation', { name: 'Navegación principal' });
    await waitFor(() => {
      expect(
        within(navegacion).getByRole('link', { name: 'Nuestra historia' }),
      ).toHaveAttribute('href', '/paginas/historia');
    });
  });

  it('soporta hero_video, tarjetas, video_youtube e ignora tipos desconocidos', async () => {
    server.use(
      http.get(api('/sedes/:sede/paginas/:slug'), () =>
        HttpResponse.json({
          datos: {
            id: 20,
            slug: 'comunidad-viva',
            titulo: 'Comunidad viva',
            descripcionSeo: null,
            paginaPadre: null,
            bloques: [
              {
                id: 1,
                tipo: 'hero_video',
                orden: 1,
                contenido: {
                  titulo: 'Bienvenidos a la comunidad',
                  url_video: '/media/seed/portada-final.mp4',
                  botones: [{ texto: 'Ver calendario', enlace: '/calendario' }],
                },
              },
              {
                id: 2,
                tipo: 'tarjetas',
                orden: 2,
                contenido: {
                  titulo: 'Áreas pastorales',
                  items: [
                    {
                      titulo: 'Catequesis',
                      subtitulo: 'Formación continua',
                      icono: 'book-open',
                      enlace: '/paginas/historia',
                    },
                  ],
                },
              },
              {
                id: 3,
                tipo: 'video_youtube',
                orden: 3,
                contenido: {
                  youtube_video_id: 'pX7aQm3kR2c',
                  titulo: 'Recorrido parroquial',
                },
              },
              {
                id: 4,
                tipo: 'bloque_futuro_desconocido',
                orden: 4,
                contenido: { foo: 'bar' },
              },
            ],
          },
        }),
      ),
    );

    renderPagina('/paginas/comunidad-viva');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Comunidad viva' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Bienvenidos a la comunidad')).toBeInTheDocument();
    expect(screen.getByText('Áreas pastorales')).toBeInTheDocument();
    expect(screen.getByTitle('Recorrido parroquial')).toHaveAttribute(
      'src',
      'https://www.youtube-nocookie.com/embed/pX7aQm3kR2c',
    );
  });

  it('muestra 404 propio cuando el slug no existe y Reintentar ante error 500', async () => {
    const usuario = userEvent.setup();
    renderPagina('/paginas/no-existe');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Página no encontrada' }),
    ).toBeInTheDocument();

    let fallo = true;
    server.use(
      http.get(api('/sedes/:sede/paginas/:slug'), () => {
        if (fallo) {
          return HttpResponse.json(
            { error: { codigo: 'ERROR_INTERNO', mensaje: 'Error interno' } },
            { status: 500 },
          );
        }
        return HttpResponse.json({
          datos: {
            id: 3,
            slug: 'recuperada',
            titulo: 'Página recuperada',
            descripcionSeo: null,
            paginaPadre: null,
            bloques: [],
          },
        });
      }),
    );

    renderPagina('/paginas/recuperada');

    expect(await screen.findByText('No pudimos cargar esta página.')).toBeInTheDocument();

    fallo = false;
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Página recuperada' }),
    ).toBeInTheDocument();
  });
});

