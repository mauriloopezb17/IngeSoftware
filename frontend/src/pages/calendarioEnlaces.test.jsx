import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';

import Agenda from '../components/parroquia/Agenda.jsx';
import { renderConRouterYQuery } from '../test/utilidadesQuery.jsx';
import { hoyBoliviaIso, sumarDiasIso } from '../utils/eventosPortal.js';
import Calendario from './Calendario.jsx';
import CalendarioDia from './CalendarioDia.jsx';
import EventoDetalle from './EventoDetalle.jsx';

describe('enlaces del calendario y agenda hacia día y detalle', () => {
  it('Calendario agrupa por día con enlace a /calendario/dia/:fecha y abre /calendario/:id al pulsar una tarjeta', async () => {
    const usuario = userEvent.setup();
    const fechaMisa = sumarDiasIso(hoyBoliviaIso(), 7);

    renderConRouterYQuery(
      <Routes>
        <Route path="/calendario" element={<Calendario />} />
        <Route path="/calendario/dia/:fecha" element={<CalendarioDia />} />
        <Route path="/calendario/:id" element={<EventoDetalle />} />
      </Routes>,
      ['/calendario'],
    );

    const enlaceEvento = await screen.findByRole('link', { name: 'Misa de sanación' });
    expect(enlaceEvento).toHaveAttribute('href', '/calendario/2');

    const enlacesDia = screen.getAllByRole('link', { name: /Ver día/ });
    expect(enlacesDia.length).toBeGreaterThan(0);
    expect(enlacesDia[0].getAttribute('href')).toMatch(/^\/calendario\/dia\/\d{4}-\d{2}-\d{2}$/);

    await usuario.click(enlaceEvento);
    expect(
      await screen.findByText('Celebración comunitaria y oración por los enfermos (texto de ejemplo).'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver eventos de este día' })).toHaveAttribute(
      'href',
      `/calendario/dia/${fechaMisa}`,
    );
  });

  it('Agenda enlaza sus tarjetas al detalle /calendario/:id', async () => {
    renderConRouterYQuery(
      <Routes>
        <Route path="/" element={<Agenda />} />
        <Route path="/calendario/:id" element={<EventoDetalle />} />
      </Routes>,
      ['/'],
    );

    const enlace = await screen.findByRole('link', { name: 'Misa de sanación' });
    expect(enlace).toHaveAttribute('href', '/calendario/2');
  });
});
