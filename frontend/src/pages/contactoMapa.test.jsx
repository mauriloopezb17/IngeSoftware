import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router';

import { renderConRouterYQuery } from '../test/utilidadesQuery.jsx';
import LayoutPortal from '../components/portal/LayoutPortal.jsx';
import ContactoPagina from './ContactoPagina.jsx';

describe('ContactoPagina — mapa y enlaces de ubicación', () => {
  it('muestra el mapa incrustado, los dos enlaces y la nota discreta', async () => {
    renderConRouterYQuery(
      <Routes>
        <Route element={<LayoutPortal />}>
          <Route path="/contacto" element={<ContactoPagina />} />
        </Route>
      </Routes>,
      ['/contacto'],
    );

    const mapa = await screen.findByTitle('Mapa de Parroquia Señor de la Exaltación');
    expect(mapa.tagName).toBe('IFRAME');
    expect(mapa).toHaveAttribute('loading', 'lazy');
    expect(mapa).toHaveAttribute(
      'src',
      'https://maps.google.com/maps?q=-16.526795,-68.108216&z=17&hl=es&output=embed',
    );

    const enlaceRuta = screen.getByRole('link', { name: 'Cómo llegar' });
    expect(enlaceRuta).toHaveAttribute(
      'href',
      'https://www.google.com/maps/dir/?api=1&destination=-16.526795,-68.108216',
    );
    expect(enlaceRuta.getAttribute('href')).not.toContain('origin=');

    const enlaceMapa = screen.getByRole('link', { name: 'Ver en Google Maps' });
    expect(enlaceMapa).toHaveAttribute(
      'href',
      'https://www.google.com/maps/search/?api=1&query=-16.526795,-68.108216',
    );

    expect(
      screen.getByText(
        'Google Maps usará tu ubicación actual como punto de partida; si no la compartes, te pedirá desde dónde sales.',
      ),
    ).toBeInTheDocument();
  });
});
