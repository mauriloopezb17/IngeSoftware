import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router';

import { api } from '../mocks/api.js';
import { server } from '../mocks/server.js';
import { renderConRouterYQuery } from '../test/utilidadesQuery.jsx';
import SacramentoDetalle from './SacramentoDetalle.jsx';

describe('SacramentoDetalle (/sacramentos/:slug)', () => {
  it('muestra imagen, contenido enriquecido, galería con visor, video, datos prácticos y preguntas frecuentes', async () => {
    server.use(
      http.get(api('/sedes/:sede/servicios/:slug'), ({ params }) =>
        HttpResponse.json({
          datos: {
            id: 1,
            slug: params.slug,
            nombre: 'Bautismo',
            descripcionCorta: 'Celebración del bautismo.',
            icono: 'droplet',
            orden: 1,
            imagen: {
              id: 10,
              url: '/media/seed/altar.webp',
              textoAlternativo: 'Pila bautismal',
              ancho: 1200,
              alto: 800,
              variantes: [],
            },
            contenido: {
              datos: [{ etiqueta: 'Charla', valor: 'Primer sábado del mes' }],
            },
            galeria: [
              {
                id: 11,
                url: '/media/seed/exterior-parroquia.webp',
                textoAlternativo: 'Foto galería bautismo',
                ancho: 1200,
                alto: 800,
                variantes: [],
                tipoMime: 'image/webp',
              },
            ],
            detalle: {
              contenido: {
                formato: 'blocknote',
                version: 1,
                bloques: [
                  {
                    id: 'b1',
                    type: 'paragraph',
                    props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
                    content: [{ type: 'text', text: 'Texto enriquecido del bautismo.', styles: {} }],
                    children: [],
                  },
                ],
              },
              galeria: [11],
              videoYoutubeId: 'dQw4w9WgXcQ',
            },
            preguntasFrecuentes: [
              {
                id: 1,
                pregunta: '¿Qué documentos se piden?',
                respuesta: 'Certificado de nacimiento.',
              },
            ],
          },
        }),
      ),
    );

    const usuario = userEvent.setup();
    renderConRouterYQuery(
      <Routes>
        <Route path="/sacramentos/:slug" element={<SacramentoDetalle />} />
      </Routes>,
      ['/sacramentos/bautismo'],
    );

    expect(await screen.findByRole('heading', { level: 1, name: 'Bautismo' })).toBeInTheDocument();
    expect(screen.getByAltText('Pila bautismal')).toBeInTheDocument();
    expect(screen.getByText('Texto enriquecido del bautismo.')).toBeInTheDocument();
    expect(screen.getByTitle('Video de Bautismo')).toBeInTheDocument();
    expect(screen.getByText('Primer sábado del mes')).toBeInTheDocument();
    expect(screen.getByText('¿Qué documentos se piden?')).toBeInTheDocument();

    const btnAmpliar = screen.getByRole('button', { name: /Ampliar imagen: Foto galería bautismo/ });
    await usuario.click(btnAmpliar);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});
