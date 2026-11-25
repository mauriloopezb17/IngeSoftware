import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router';

import { api } from '../mocks/api.js';
import { server } from '../mocks/server.js';
import { renderConRouterYQuery } from '../test/utilidadesQuery.jsx';
import EventoDetalle from './EventoDetalle.jsx';

function renderDetalle(rutaInicial = '/calendario/2') {
  return renderConRouterYQuery(
    <Routes>
      <Route path="/calendario/:id" element={<EventoDetalle />} />
      <Route path="/calendario/dia/:fecha" element={<p data-testid="vista-dia">Vista día</p>} />
      <Route path="/calendario" element={<p data-testid="vista-calendario">Calendario</p>} />
    </Routes>,
    [rutaInicial],
  );
}

describe('EventoDetalle (/calendario/:id)', () => {
  it('renderiza contenido, programa, dirección, Google Maps, responsable y enlace al día', async () => {
    const usuario = userEvent.setup();
    renderDetalle('/calendario/2');

    expect(await screen.findByRole('heading', { level: 1, name: 'Misa de sanación' })).toBeInTheDocument();
    expect(document.title).toBe('Misa de sanación | Parroquia Señor de la Exaltación');
    expect(
      screen.getByText('Celebración comunitaria y oración por los enfermos (texto de ejemplo).'),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Programa' })).toBeInTheDocument();
    expect(screen.getByText('Primera misa de sanación (ejemplo)')).toBeInTheDocument();
    expect(screen.getByText('Av. Héctor Ormachea N.º 167, Obrajes, La Paz')).toBeInTheDocument();
    expect(screen.getByText('Equipo de Liturgia (ejemplo)')).toBeInTheDocument();

    const mapa = screen.getByRole('link', { name: /Cómo llegar en Google Maps/ });
    expect(mapa).toHaveAttribute('target', '_blank');
    expect(mapa).toHaveAttribute('rel', 'noopener noreferrer');

    await usuario.click(screen.getByRole('link', { name: 'Ver eventos de este día' }));
    expect(await screen.findByTestId('vista-dia')).toBeInTheDocument();
  });

  it('muestra la tarjeta limpia sin secciones vacías cuando el evento no tiene detalle', async () => {
    renderDetalle('/calendario/1');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Adoración eucarística comunitaria' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Templo parroquial')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Programa' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Enlaces y recursos' })).not.toBeInTheDocument();
    expect(screen.queryByText('Responsable y contacto')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Google Maps/ })).not.toBeInTheDocument();
  });

  it('muestra el aviso «Este evento ya se realizó.» en eventos publicados pasados', async () => {
    server.use(
      http.get(api('/sedes/:sede/eventos/:id'), () =>
        HttpResponse.json({
          datos: {
            id: 77,
            titulo: 'Concierto sacro de Cuaresma',
            descripcion: 'Edición pasada ya realizada.',
            lugar: 'Templo parroquial',
            fechaInicio: '2024-03-15T19:30:00-04:00',
            fechaFin: null,
            todoElDia: false,
            categoria: { id: 1, nombre: 'Liturgia', colorHex: '#ECB51C' },
            imagen: null,
            tieneDetalle: true,
            detalle: {
              contenido: null,
              direccion: 'Av. Ormachea 167',
              enlaceMapa: null,
              programa: [{ hora: '19:30', actividad: 'Apertura musical' }],
              responsable: null,
              enlaces: [{ texto: 'Reseña histórica', url: 'https://parroquia.example.org/resena' }],
            },
          },
        }),
      ),
    );

    renderDetalle('/calendario/77');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Concierto sacro de Cuaresma' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Este evento ya se realizó.');
    expect(screen.queryByRole('link', { name: 'Ver eventos de este día' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Reseña histórica/ })).toHaveAttribute(
      'href',
      'https://parroquia.example.org/resena',
    );
  });

  it('muestra Página no encontrada cuando el id es inválido o la API responde 404', async () => {
    renderDetalle('/calendario/no-numerico');
    expect(await screen.findByRole('heading', { level: 1, name: 'Página no encontrada' })).toBeInTheDocument();

    renderDetalle('/calendario/9999');
    await waitFor(() => {
      expect(screen.getAllByRole('heading', { level: 1, name: 'Página no encontrada' }).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('muestra error con Reintentar si el servidor responde 500', async () => {
    const usuario = userEvent.setup();
    let fallar = true;

    server.use(
      http.get(api('/sedes/:sede/eventos/:id'), () => {
        if (fallar) {
          return HttpResponse.json(
            { error: { codigo: 'ERROR_INTERNO', mensaje: 'Error interno' } },
            { status: 500 },
          );
        }
        return HttpResponse.json({
          datos: {
            id: 2,
            titulo: 'Misa recuperada',
            descripcion: null,
            lugar: 'Templo parroquial',
            fechaInicio: '2027-01-10T10:00:00-04:00',
            fechaFin: null,
            todoElDia: false,
            categoria: { id: 2, nombre: 'Solemnidad', colorHex: '#8E1E1E' },
            imagen: null,
            tieneDetalle: false,
            detalle: null,
          },
        });
      }),
    );

    renderDetalle('/calendario/2');
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    fallar = false;
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Misa recuperada' })).toBeInTheDocument();
  });
});
