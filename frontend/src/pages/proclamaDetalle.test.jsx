import { describe, it, expect } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { http, HttpResponse } from 'msw';

import { server } from '../mocks/server.js';
import { api } from '../mocks/api.js';
import { renderConRouterYQuery } from '../test/utilidadesQuery.jsx';
import ProclamasHome from '../components/parroquia/Proclamas.jsx';
import ProclamaDetalle from './ProclamaDetalle.jsx';
import Proclamas from './Proclamas.jsx';

function renderDetalle(ruta = '/proclamas/1') {
  return renderConRouterYQuery(
    <Routes>
      <Route path="/proclamas" element={<Proclamas />} />
      <Route path="/proclamas/:id" element={<ProclamaDetalle />} />
    </Routes>,
    [ruta],
  );
}

describe('ProclamaDetalle y tarjetas clicables', () => {
  it('muestra datos, foto, descripción, galería con visor accesible y lugar propio', async () => {
    const usuario = userEvent.setup();
    renderDetalle('/proclamas/1');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Juan Carlos M. Q. y María Fernanda R. V.' }),
    ).toBeInTheDocument();
    expect(document.title).toContain('Juan Carlos M. Q. y María Fernanda R. V.');
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toContain(
      'Juan Carlos M. Q.',
    );

    expect(screen.getByText('3.ª proclama')).toBeInTheDocument();
    expect(screen.getByText('Parroquia Señor de la Exaltación')).toBeInTheDocument();
    expect(
      screen.getByText('Con alegría compartimos el anuncio de nuestro matrimonio religioso (texto de ejemplo).'),
    ).toBeInTheDocument();

    // Abrir visor ampliado de la galería, navegar con flechas y cerrar con Esc
    const botonAmpliar = screen.getByRole('button', {
      name: /Ampliar imagen: Templo de la Parroquia Señor de la Exaltación/,
    });
    await usuario.click(botonAmpliar);

    const visor = await screen.findByRole('dialog', { name: 'Visor de galería' });
    expect(within(visor).getByText('1 de 2')).toBeInTheDocument();

    await usuario.keyboard('{ArrowRight}');
    expect(within(visor).getByText('2 de 2')).toBeInTheDocument();

    await usuario.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Visor de galería' })).not.toBeInTheDocument();
    });
    expect(botonAmpliar).toHaveFocus();
  });

  it('muestra lugar externo con enlace Cómo llegar y videos sin autoplay', async () => {
    server.use(
      http.get(api('/sedes/:sede/proclamas/99'), () =>
        HttpResponse.json({
          datos: {
            id: 99,
            contrayente1: 'Pedro A.',
            contrayente2: 'Lucía B.',
            fechaMatrimonio: '2026-12-12T15:00:00-04:00',
            numeroProclama: 2,
            publicaciones: [{ numero: 1, fecha: '2026-11-22' }],
            tieneDetalle: true,
            imagen: null,
            galeria: [
              {
                id: 55,
                url: 'https://cdn.ejemplo.test/video.mp4',
                textoAlternativo: 'Video de invitación',
                ancho: null,
                alto: null,
                variantes: [],
                tipoMime: 'video/mp4',
              },
            ],
            detalle: {
              contenido: null,
              galeria: [55],
              lugar: {
                templo: 'Capilla San Pablo',
                direccion: 'Av. Costanera 456',
                enlaceMapa: 'https://maps.app.goo.gl/xyz',
              },
            },
          },
        }),
      ),
    );

    renderDetalle('/proclamas/99');

    expect(await screen.findByRole('heading', { level: 1, name: 'Pedro A. y Lucía B.' })).toBeInTheDocument();
    expect(screen.getByText('Capilla San Pablo')).toBeInTheDocument();
    expect(screen.getByText('Av. Costanera 456')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Cómo llegar/ })).toHaveAttribute('href', 'https://maps.app.goo.gl/xyz');

    const video = screen.getByLabelText('Video de invitación');
    expect(video.tagName).toBe('VIDEO');
    expect(video).toHaveAttribute('controls');
    expect(video).not.toHaveAttribute('autoplay');
  });

  it('muestra 404 cuando la proclama no existe o no es visible', async () => {
    renderDetalle('/proclamas/999');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'No encontramos esta proclama' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Volver a proclamas/ })).toHaveAttribute('href', '/proclamas');
  });

  it('las tarjetas de /proclamas y portada tienen un solo enlace al detalle y «Ver proclama →»', async () => {
    renderConRouterYQuery(
      <>
        <ProclamasHome />
        <Proclamas />
      </>,
      ['/proclamas'],
    );

    const enlacesJuan = await screen.findAllByRole('link', {
      name: 'Juan Carlos M. Q. & María Fernanda R. V.',
    });
    expect(enlacesJuan.length).toBeGreaterThanOrEqual(2);
    for (const enlace of enlacesJuan) {
      expect(enlace).toHaveAttribute('href', '/proclamas/1');
    }
    expect(screen.getAllByText('Ver proclama →').length).toBeGreaterThanOrEqual(2);
  });
});
