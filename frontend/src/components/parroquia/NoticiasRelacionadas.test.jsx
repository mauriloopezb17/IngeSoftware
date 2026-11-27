import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { api } from '../../mocks/api.js';
import { server } from '../../mocks/server.js';
import { renderConRouterYQuery } from '../../test/utilidadesQuery.jsx';
import NoticiasRelacionadas from './NoticiasRelacionadas.jsx';

const crearNoticia = (id, titulo) => ({
  id,
  tipo: { codigo: 'NOTICIA', nombre: 'Noticia' },
  titulo,
  slug: `noticia-${id}`,
  resumen: `Resumen de ${titulo}`,
  categoria: { id: 1, nombre: 'Sacramentos', slug: 'sacramentos' },
  imagenPortada: null,
  urlExterna: null,
  abrirEnlaceDirecto: false,
  destacada: false,
  fechaPublicacion: '2026-10-18T12:00:00-04:00',
  fechaExpiracion: null,
});

describe('NoticiasRelacionadas', () => {
  it('no renderiza la sección cuando no hay noticias relacionadas', async () => {
    server.use(
      http.get(api('/sedes/:sede/servicios/:slug/noticias'), () =>
        HttpResponse.json({
          datos: [],
          paginacion: { pagina: 1, porPagina: 6, total: 0, totalPaginas: 0 },
        }),
      ),
    );

    const { container } = renderConRouterYQuery(
      <NoticiasRelacionadas tipo="servicio" slug="bautismo" />,
    );

    await new Promise((r) => setTimeout(r, 80));
    expect(container.querySelector('section')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Noticias relacionadas' })).not.toBeInTheDocument();
  });

  it('muestra la sección y permite paginar las noticias de un grupo pastoral', async () => {
    const usuario = userEvent.setup();
    server.use(
      http.get(api('/sedes/:sede/grupos-pastorales/:slug/noticias'), ({ request }) => {
        const pagina = Number(new URL(request.url).searchParams.get('pagina') ?? 1);
        return HttpResponse.json({
          datos: [crearNoticia(pagina, `Noticia página ${pagina}`)],
          paginacion: { pagina, porPagina: 6, total: 8, totalPaginas: 2 },
        });
      }),
    );

    renderConRouterYQuery(<NoticiasRelacionadas tipo="grupo" slug="coro-parroquial" />);

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Noticias relacionadas' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Noticia página 1' })).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(
      await screen.findByRole('heading', { level: 3, name: 'Noticia página 2' }),
    ).toBeInTheDocument();
  });
});
