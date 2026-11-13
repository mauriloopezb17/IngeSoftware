import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { http, HttpResponse } from 'msw';

import { server } from '../mocks/server.js';
import { api } from '../mocks/api.js';
import { renderConRouterYQuery } from '../test/utilidadesQuery.jsx';
import VidaParroquial from '../components/parroquia/VidaParroquial.jsx';
import NoticiaDetalle from './NoticiaDetalle.jsx';

function renderDetalle(ruta = '/noticias/primeras-comuniones-42-ninos') {
  return renderConRouterYQuery(
    <Routes>
      <Route path="/" element={<VidaParroquial />} />
      <Route path="/noticias/:slug" element={<NoticiaDetalle />} />
    </Routes>,
    [ruta],
  );
}

describe('NoticiaDetalle', () => {
  it('muestra el detalle completo de una noticia con portada, metadatos y contenido BlockNote', async () => {
    renderDetalle('/noticias/primeras-comuniones-42-ninos');

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Primeras comuniones: 42 niños recibieron a Jesús',
      }),
    ).toBeInTheDocument();

    expect(document.title).toBe(
      'Primeras comuniones: 42 niños recibieron a Jesús | Parroquia Señor de la Exaltación',
    );
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
      'Una jornada de fiesta para toda la comunidad, acompañada por catequistas y familias.',
    );
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe(
      'Primeras comuniones: 42 niños recibieron a Jesús',
    );
    expect(document.querySelector('meta[property="og:description"]')?.getAttribute('content')).toBe(
      'Una jornada de fiesta para toda la comunidad, acompañada por catequistas y familias.',
    );
    expect(document.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe(
      '/media/seed/crucifijo.webp',
    );

    const articulo = screen.getByRole('article');
    expect(within(articulo).getByText('Sacramentos')).toBeInTheDocument();
    expect(within(articulo).getByText('18 OCT 2026')).toBeInTheDocument();

    const imagen = screen.getByAltText('Crucifijo en el interior del templo parroquial');
    expect(imagen).toHaveAttribute('src', '/media/seed/crucifijo.webp');
    expect(imagen).toHaveAttribute('width', '1888');
    expect(imagen).toHaveAttribute('height', '1059');

    expect(
      screen.getAllByText(
        'Una jornada de fiesta para toda la comunidad, acompañada por catequistas y familias.',
      ).length,
    ).toBeGreaterThanOrEqual(1);

    expect(screen.getByRole('link', { name: 'Ver todas las noticias' })).toHaveAttribute(
      'href',
      '/noticias',
    );
    const enlacesInicio = screen.getAllByRole('link', { name: 'Volver al inicio' });
    expect(enlacesInicio.some((enlace) => enlace.getAttribute('href') === '/')).toBe(true);
  });

  it('muestra el enlace externo cuando la publicación tiene urlExterna', async () => {
    renderDetalle('/noticias/encuentro-pastoral-familiar-duelo');

    const enlaceExterno = await screen.findByRole('link', {
      name: /Ver publicación original/,
    });
    expect(enlaceExterno).toHaveAttribute(
      'href',
      'https://www.facebook.com/photo.php?fbid=1568791201958754&set=pb.100064836665037.-2207520000&type=3',
    );
    expect(enlaceExterno).toHaveAttribute('target', '_blank');
    expect(enlaceExterno).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('muestra «No encontramos esta noticia» cuando la API devuelve 404', async () => {
    renderDetalle('/noticias/slug-que-no-existe');

    expect(
      await screen.findByRole('heading', { name: 'No encontramos esta noticia' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver todas las noticias' })).toHaveAttribute(
      'href',
      '/noticias',
    );
  });

  it('muestra error con Reintentar cuando la API falla con 500', async () => {
    const usuario = userEvent.setup();
    let fallo = true;

    server.use(
      http.get(api('/sedes/:sede/publicaciones/:slug'), () => {
        if (fallo) {
          return HttpResponse.json(
            { error: { codigo: 'ERROR_INTERNO', mensaje: 'Error interno' } },
            { status: 500 },
          );
        }
        return HttpResponse.json({
          datos: {
            id: 99,
            tipo: { codigo: 'NOTICIA', nombre: 'Noticia' },
            titulo: 'Noticia recuperada',
            slug: 'noticia-recuperada',
            resumen: 'Resumen recuperado.',
            categoria: null,
            imagenPortada: null,
            urlExterna: null,
            destacada: false,
            fechaPublicacion: '2026-10-18T12:00:00-04:00',
            fechaExpiracion: null,
            contenido: { formato: 'blocknote', version: 1, bloques: [] },
          },
        });
      }),
    );

    renderDetalle('/noticias/noticia-recuperada');

    expect(await screen.findByText('No pudimos cargar esta noticia.')).toBeInTheDocument();

    fallo = false;
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(
      await screen.findByRole('heading', { name: 'Noticia recuperada' }),
    ).toBeInTheDocument();
  });

  it('permite navegar desde VidaParroquial al detalle de la noticia y volver al inicio', async () => {
    const usuario = userEvent.setup();
    renderDetalle('/');

    const enlace = await screen.findByRole('link', {
      name: 'Leer publicación: Primeras comuniones: 42 niños recibieron a Jesús',
    });
    await usuario.click(enlace);

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Primeras comuniones: 42 niños recibieron a Jesús',
      }),
    ).toBeInTheDocument();

    expect(document.title).toBe(
      'Primeras comuniones: 42 niños recibieron a Jesús | Parroquia Señor de la Exaltación',
    );
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
      'Una jornada de fiesta para toda la comunidad, acompañada por catequistas y familias.',
    );
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe(
      'Primeras comuniones: 42 niños recibieron a Jesús',
    );
    expect(document.querySelector('meta[property="og:description"]')?.getAttribute('content')).toBe(
      'Una jornada de fiesta para toda la comunidad, acompañada por catequistas y familias.',
    );
    expect(document.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe(
      '/media/seed/crucifijo.webp',
    );

    const enlaceInicio = screen
      .getAllByRole('link', { name: 'Volver al inicio' })
      .find((item) => item.getAttribute('href') === '/');
    await usuario.click(enlaceInicio);

    expect(await screen.findByRole('heading', { name: 'Vida parroquial' })).toBeInTheDocument();
  });
});
