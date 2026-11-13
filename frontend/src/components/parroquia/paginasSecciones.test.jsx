import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { server } from '../../mocks/server.js';
import { api } from '../../mocks/api.js';
import { renderConQuery } from '../../test/utilidadesQuery.jsx';
import Portada from './Portada.jsx';
import Nosotros from './Nosotros.jsx';

describe('Portada y Nosotros desde páginas y bloques', () => {
  it('renderiza Portada y Nosotros con sus bloques desde la API', async () => {
    renderConQuery(
      <>
        <Portada />
        <Nosotros />
      </>,
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Señor de la Exaltación' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Horarios de Misa')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Una casa de oración en el corazón de Obrajes',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('P. Gregorio, C.P.')).toBeInTheDocument();
    expect(screen.getByText('Conoce nuestra historia')).toBeInTheDocument();
  });

  it('muestra error con Reintentar cuando /paginas/:slug devuelve 500', async () => {
    const usuario = userEvent.setup();
    let fallo = true;

    server.use(
      http.get(api('/sedes/:sede/paginas/:slug'), ({ params }) => {
        if (fallo) {
          return HttpResponse.json(
            { error: { codigo: 'ERROR_INTERNO', mensaje: 'Fallo al cargar página' } },
            { status: 500 },
          );
        }
        return HttpResponse.json({
          datos: {
            id: 2,
            slug: params.slug,
            titulo: 'Quiénes somos',
            bloques: [
              {
                id: 3,
                tipo: 'texto_imagen',
                orden: 1,
                contenido: {
                  etiqueta: 'Quiénes somos',
                  titulo: 'Título recuperado',
                  texto: 'Texto recuperado.',
                },
              },
            ],
          },
        });
      }),
    );

    renderConQuery(<Nosotros />);

    expect(
      await screen.findByText('No pudimos cargar la información de nuestra parroquia.'),
    ).toBeInTheDocument();

    fallo = false;
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }));

    await waitFor(() => {
      expect(screen.getByText('Título recuperado')).toBeInTheDocument();
    });
  });

  it('ignora bloques de tipo desconocido y muestra sin resultados cuando bloques está vacío', async () => {
    server.use(
      http.get(api('/sedes/:sede/paginas/:slug'), ({ params }) =>
        HttpResponse.json({
          datos: {
            id: 1,
            slug: params.slug,
            titulo: 'Inicio',
            bloques: [{ id: 99, tipo: 'bloque_futuro', orden: 1, contenido: {} }],
          },
        }),
      ),
    );

    renderConQuery(<Portada />);

    expect(
      await screen.findByText('No hay contenido publicado para la portada.'),
    ).toBeInTheDocument();
  });
});
