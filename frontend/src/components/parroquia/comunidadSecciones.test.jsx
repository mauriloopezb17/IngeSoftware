import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { server } from '../../mocks/server.js';
import { api } from '../../mocks/api.js';
import { renderConQuery } from '../../test/utilidadesQuery.jsx';
import GruposPastorales from './GruposPastorales.jsx';
import Comunidades from './Comunidades.jsx';
import VideoInstitucional from './VideoInstitucional.jsx';

describe('GruposPastorales, Comunidades y VideoInstitucional desde la API', () => {
  it('renderiza los 6 grupos pastorales, las 3 comunidades y el video de respaldo', async () => {
    const { container } = renderConQuery(
      <>
        <GruposPastorales />
        <Comunidades />
        <VideoInstitucional />
      </>,
    );

    expect(await screen.findByText('Monaguillos')).toBeInTheDocument();
    expect(screen.getByText('Legión de María')).toBeInTheDocument();
    expect(screen.getByText('Pastoral social')).toBeInTheDocument();

    expect(await screen.findByText('Parroquia Señor de la Exaltación')).toBeInTheDocument();
    expect(screen.getByText('Parroquia de la Resurrección')).toBeInTheDocument();
    expect(screen.getByText('Capilla San Pablo de la Cruz')).toBeInTheDocument();

    expect(await screen.findByText('Recorrido aéreo y del templo · 0:30')).toBeInTheDocument();
    const videoEl = container.querySelector('video.video-institucional-video');
    expect(videoEl).toHaveAttribute('src', '/media/seed/portada-final.mp4');
    expect(videoEl).toHaveAttribute('poster', '/media/seed/altar.webp');
  });

  it('renderiza iframe de YouTube cuando /videos devuelve elementos', async () => {
    server.use(
      http.get(api('/sedes/:sede/videos'), () =>
        HttpResponse.json({
          datos: [
            {
              id: 1,
              titulo: 'Video parroquial YouTube',
              urlInsercion: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
            },
          ],
        }),
      ),
    );

    renderConQuery(<VideoInstitucional />);

    const iframe = await screen.findByTitle('Video parroquial YouTube');
    expect(iframe.tagName).toBe('IFRAME');
    expect(iframe).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  });

  it('muestra error con Reintentar cuando fallan con 500 y sin resultados cuando están vacíos', async () => {
    const usuario = userEvent.setup();
    let fallaGrupos = true;

    server.use(
      http.get(api('/sedes/:sede/grupos-pastorales'), () => {
        if (fallaGrupos) {
          return HttpResponse.json(
            { error: { codigo: 'ERROR_INTERNO', mensaje: 'Error' } },
            { status: 500 },
          );
        }
        return HttpResponse.json({ datos: [] });
      }),
      http.get(api('/sedes'), () => HttpResponse.json({ datos: [] })),
    );

    renderConQuery(
      <>
        <GruposPastorales />
        <Comunidades />
      </>,
    );

    expect(
      await screen.findByText('No pudimos cargar los grupos pastorales.'),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('No hay comunidades disponibles por el momento.'),
    ).toBeInTheDocument();

    fallaGrupos = false;
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }));

    await waitFor(() => {
      expect(
        screen.getByText('No hay grupos pastorales publicados por el momento.'),
      ).toBeInTheDocument();
    });
  });
});
