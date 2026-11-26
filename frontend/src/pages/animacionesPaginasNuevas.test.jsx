import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import { http, HttpResponse } from 'msw';

import { api } from '../mocks/api.js';
import { server } from '../mocks/server.js';
import { renderConRouterYQuery } from '../test/utilidadesQuery.jsx';
import Agenda from '../components/parroquia/Agenda.jsx';
import ProclamasHome from '../components/parroquia/Proclamas.jsx';
import CalendarioDia from './CalendarioDia.jsx';
import EventoDetalle from './EventoDetalle.jsx';
import ProclamaDetalle from './ProclamaDetalle.jsx';

const matchMediaOriginal = window.matchMedia;
const observerOriginal = globalThis.IntersectionObserver;

afterEach(() => {
  window.matchMedia = matchMediaOriginal;
  globalThis.IntersectionObserver = observerOriginal;
});

function activarMovimientoReducido() {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: query === '(prefers-reduced-motion: reduce)',
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

function registrarEventoDePrueba() {
  server.use(
    http.get(api('/sedes/:sede/eventos/101'), () =>
      HttpResponse.json({
        datos: {
          id: 101,
          titulo: 'Vigilia Pascual Comunitaria',
          descripcion: 'Celebración de la noche santa.',
          fechaInicio: '2026-12-12T20:00:00-04:00',
          fechaFin: null,
          todoElDia: false,
          lugar: 'Templo Parroquial',
          categoria: { id: 1, nombre: 'Liturgia', colorHex: '#ECB51C' },
          imagen: {
            id: 1,
            url: '/media/seed/altar-mayor.webp',
            textoAlternativo: 'Altar mayor',
            ancho: 1200,
            alto: 800,
            variantes: [],
          },
          detalle: {
            contenido: null,
            programa: [
              { hora: '20:00', actividad: 'Bendición del fuego' },
              { hora: '20:30', actividad: 'Liturgia de la Palabra' },
            ],
            enlaces: [{ texto: 'Guía litúrgica', url: 'https://ejemplo.test/guia' }],
            direccion: null,
            enlaceMapa: null,
            responsable: null,
          },
        },
      }),
    ),
  );
}

describe('animaciones en las páginas nuevas del portal', () => {
  it('EventoDetalle monta sin errores con movimiento reducido y conserva un solo nombre accesible por título', async () => {
    activarMovimientoReducido();
    registrarEventoDePrueba();

    renderConRouterYQuery(
      <Routes>
        <Route path="/calendario/:id" element={<EventoDetalle />} />
      </Routes>,
      ['/calendario/101'],
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Vigilia Pascual Comunitaria' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Programa' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Enlaces y recursos' })).toBeInTheDocument();
    expect(screen.getByText('Bendición del fuego')).toBeInTheDocument();
  });

  it('ProclamaDetalle monta sin errores sin IntersectionObserver', async () => {
    globalThis.IntersectionObserver = undefined;

    renderConRouterYQuery(
      <Routes>
        <Route path="/proclamas/:id" element={<ProclamaDetalle />} />
      </Routes>,
      ['/proclamas/1'],
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Juan Carlos M. Q. y María Fernanda R. V.' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Fotos y videos' })).toBeInTheDocument();
  });

  it('CalendarioDia monta sin errores sin IntersectionObserver', async () => {
    globalThis.IntersectionObserver = undefined;

    renderConRouterYQuery(
      <Routes>
        <Route path="/calendario/dia/:fecha" element={<CalendarioDia />} />
      </Routes>,
      ['/calendario/dia/2026-12-12'],
    );

    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('Agenda y Proclamas de portada montan sin errores con movimiento reducido y sin IntersectionObserver', async () => {
    activarMovimientoReducido();
    globalThis.IntersectionObserver = undefined;

    renderConRouterYQuery(
      <>
        <Agenda />
        <ProclamasHome />
      </>,
      ['/'],
    );

    expect(await screen.findByRole('heading', { level: 2, name: 'Próximos eventos' })).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Quieren unirse en el sacramento del matrimonio',
      }),
    ).toBeInTheDocument();
  });
});
