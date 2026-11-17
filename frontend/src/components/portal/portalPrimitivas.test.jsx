import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';

import {
  Boton,
  BotonEnlace,
  Contenedor,
  EncabezadoPagina,
  EncabezadoSeccion,
  EnlaceFlecha,
  Eyebrow,
  Reveal,
  Seccion,
} from './index.js';
import EnlacePortal from './EnlacePortal.jsx';
import { renderConRouterYQuery } from '../../test/utilidadesQuery.jsx';

describe('Primitivas del portal', () => {
  it('renderiza Contenedor, Seccion, Eyebrow y EncabezadoSeccion con sus roles y estilos', () => {
    const { container } = render(
      <Seccion id="prueba" fondo="tinta">
        <EncabezadoSeccion
          oscuro
          eyebrow="Celebraciones"
          titulo="Horarios de misa"
          bajada="Consulta los horarios vigentes."
        />
      </Seccion>,
    );

    const seccion = container.querySelector('#prueba');
    expect(seccion).toHaveClass('bg-ink', 'text-white', 'py-16', 'md:py-28');
    expect(screen.getByText('Celebraciones')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Horarios de misa' })).toBeInTheDocument();
    expect(screen.getByText('Consulta los horarios vigentes.')).toBeInTheDocument();
  });

  it('renderiza EncabezadoPagina con migas de pan y único h1', () => {
    renderConRouterYQuery(
      <EncabezadoPagina
        migas={[{ texto: 'Inicio', enlace: '/' }, { texto: 'Horarios' }]}
        eyebrow="Parroquia"
        titulo="Horarios"
        bajada="Misas y secretaría."
      />,
    );

    const nav = screen.getByRole('navigation', { name: 'Ruta de navegación' });
    expect(within(nav).getByRole('link', { name: 'Inicio' })).toHaveAttribute('href', '/');
    expect(within(nav).getByText('Horarios')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('heading', { level: 1, name: 'Horarios' })).toBeInTheDocument();
  });

  it('renderiza Boton, BotonEnlace, EnlaceFlecha, Contenedor y Reveal', () => {
    renderConRouterYQuery(
      <Contenedor>
        <Reveal variante="arriba">
          <Boton>Acción</Boton>
          <BotonEnlace to="/horarios" variante="secundario">
            Horarios
          </BotonEnlace>
          <EnlaceFlecha to="/sacramentos">Ver sacramentos</EnlaceFlecha>
        </Reveal>
      </Contenedor>,
    );

    expect(screen.getByRole('button', { name: 'Acción' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Horarios' })).toHaveAttribute('href', '/horarios');
    expect(screen.getByRole('link', { name: 'Ver sacramentos' })).toHaveAttribute(
      'href',
      '/sacramentos',
    );
  });

  it('EnlacePortal traduce anclas heredadas del CMS a rutas multipágina y abre externos en nueva pestaña', async () => {
    const usuario = userEvent.setup();
    renderConRouterYQuery(
      <Routes>
        <Route
          path="/"
          element={
            <div>
              <EnlacePortal to="#horarios">Ir a horarios</EnlacePortal>
              <EnlacePortal to="/#nosotros">Ir a nosotros</EnlacePortal>
              <EnlacePortal to="#proclamas">Ir a proclamas</EnlacePortal>
              <EnlacePortal to="https://pasionistas.org.bo">Sitio externo</EnlacePortal>
              <EnlacePortal to="tel:+59122784937">Llamar</EnlacePortal>
            </div>
          }
        />
        <Route path="/horarios" element={<h1>Ruta horarios</h1>} />
      </Routes>,
    );

    expect(screen.getByRole('link', { name: 'Ir a nosotros' })).toHaveAttribute('href', '/nosotros');
    expect(screen.getByRole('link', { name: 'Ir a proclamas' })).toHaveAttribute(
      'href',
      '/proclamas',
    );
    const externo = screen.getByRole('link', { name: 'Sitio externo' });
    expect(externo).toHaveAttribute('target', '_blank');
    expect(externo).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByRole('link', { name: 'Llamar' })).not.toHaveAttribute('target');

    await usuario.click(screen.getByRole('link', { name: 'Ir a horarios' }));
    expect(await screen.findByRole('heading', { name: 'Ruta horarios' })).toBeInTheDocument();
  });

  it('Eyebrow omite renderizado si no tiene texto', () => {
    const { container } = render(<Eyebrow />);
    expect(container).toBeEmptyDOMElement();
  });
});
