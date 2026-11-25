import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router';

import { renderConRouterYQuery } from '../test/utilidadesQuery.jsx';
import Boletines from './Boletines.jsx';

describe('Boletines — miniatura de portada y respaldo', () => {
  it('muestra la miniatura con srcSet cuando tiene portada y respaldo editorial cuando no tiene', async () => {
    renderConRouterYQuery(
      <Routes>
        <Route path="/boletines" element={<Boletines />} />
        <Route path="/boletines/:periodo" element={<Boletines />} />
      </Routes>,
      ['/boletines'],
    );

    const imgPortada = await screen.findByAltText('Portada del Edición de octubre 2026');
    expect(imgPortada).toHaveAttribute(
      'srcset',
      '/media/seed/exterior-parroquia.webp 480w, /media/seed/exterior-parroquia.webp 800w',
    );

    // Las tarjetas sin portada muestran el respaldo editorial con la leyenda "Boletín parroquial"
    expect(screen.getAllByText('Boletín parroquial').length).toBeGreaterThanOrEqual(1);
  });
});
