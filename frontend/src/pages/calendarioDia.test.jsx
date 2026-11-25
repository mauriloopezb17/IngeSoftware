import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router';

import { renderConRouterYQuery } from '../test/utilidadesQuery.jsx';
import { claveDiaBolivia, esEventoPasado, hoyBoliviaIso, sumarDiasIso } from '../utils/eventosPortal.js';
import CalendarioDia from './CalendarioDia.jsx';

function renderDia(fecha) {
  return renderConRouterYQuery(
    <Routes>
      <Route path="/calendario/dia/:fecha" element={<CalendarioDia />} />
      <Route path="/calendario/:id" element={<p data-testid="detalle-destino">Detalle</p>} />
      <Route path="/calendario" element={<p data-testid="calendario-destino">Calendario</p>} />
    </Routes>,
    [`/calendario/dia/${fecha}`],
  );
}

describe('CalendarioDia (/calendario/dia/:fecha)', () => {
  it('lista los eventos del día con enlace único al detalle y navegación entre días', async () => {
    const fechaMisa = sumarDiasIso(hoyBoliviaIso(), 7);
    const fechaSiguiente = sumarDiasIso(fechaMisa, 1);
    renderDia(fechaMisa);

    const enlaceMisa = await screen.findByRole('link', { name: 'Misa de sanación' });
    expect(enlaceMisa).toHaveAttribute('href', '/calendario/2');
    expect(screen.getByRole('link', { name: /Día siguiente/ })).toHaveAttribute(
      'href',
      `/calendario/dia/${fechaSiguiente}`,
    );
    expect(screen.getByRole('link', { name: /Volver al calendario/ })).toHaveAttribute('href', '/calendario');
  });

  it('muestra estado vacío cuando no hay eventos ese día', async () => {
    const fechaVacia = sumarDiasIso(hoyBoliviaIso(), 45);
    renderDia(fechaVacia);

    expect(await screen.findByText('No hay eventos programados para este día.')).toBeInTheDocument();
  });

  it('informa cuando se consulta un día anterior a hoy sin mostrar eventos pasados', () => {
    renderDia('2020-05-10');

    expect(
      screen.getByText('Los eventos de días anteriores ya no se muestran en el calendario público.'),
    ).toBeInTheDocument();
  });

  it('devuelve Página no encontrada para fechas inválidas', () => {
    renderDia('2026-02-30');
    expect(screen.getByRole('heading', { level: 1, name: 'Página no encontrada' })).toBeInTheDocument();
  });

  it('calcula días y finalización en hora de Bolivia (UTC-4) aunque el proceso esté en otra zona', () => {
    // 2026-12-06T22:00:00-04:00 es 2026-12-07T02:00:00Z en UTC, pero sigue siendo 6 de diciembre en Bolivia.
    expect(claveDiaBolivia('2026-12-06T22:00:00-04:00')).toBe('2026-12-06');
    expect(
      esEventoPasado(
        { fechaInicio: '2026-12-06T19:00:00-04:00', fechaFin: null, todoElDia: false },
        new Date('2026-12-07T02:30:00Z'),
      ),
    ).toBe(false);
  });
});
