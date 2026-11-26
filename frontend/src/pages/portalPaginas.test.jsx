import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';

import { renderConRouterYQuery } from '../test/utilidadesQuery.jsx';
import LayoutPortal from '../components/portal/LayoutPortal.jsx';
import HorariosPagina from './HorariosPagina.jsx';
import SacramentosPagina from './SacramentosPagina.jsx';
import SacramentoDetalle from './SacramentoDetalle.jsx';
import NosotrosPagina from './NosotrosPagina.jsx';
import ComunidadPagina from './ComunidadPagina.jsx';
import ContactoPagina from './ContactoPagina.jsx';

function renderRutaPortal(rutaInicial) {
  return renderConRouterYQuery(
    <Routes>
      <Route element={<LayoutPortal />}>
        <Route path="/horarios" element={<HorariosPagina />} />
        <Route path="/sacramentos" element={<SacramentosPagina />} />
        <Route path="/sacramentos/:slug" element={<SacramentoDetalle />} />
        <Route path="/nosotros" element={<NosotrosPagina />} />
        <Route path="/comunidad" element={<ComunidadPagina />} />
        <Route path="/contacto" element={<ContactoPagina />} />
      </Route>
    </Routes>,
    [rutaInicial],
  );
}

describe('Páginas internas del portal', () => {
  it('/horarios muestra tablas por tipo y resalta el día de hoy', async () => {
    renderRutaPortal('/horarios');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Horarios de misa y secretaría' }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 2, name: 'Santa Misa' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Confesiones' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Adoración' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Secretaría' })).toBeInTheDocument();
    expect(screen.getAllByText('Hoy').length).toBeGreaterThanOrEqual(1);
  });

  it('/sacramentos y /sacramentos/:slug muestran listado, requisitos, preguntas frecuentes y 404', async () => {
    const usuario = userEvent.setup();
    renderRutaPortal('/sacramentos');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sacramentos y catequesis' }),
    ).toBeInTheDocument();
    const enlaceBautismo = await screen.findByRole('link', { name: /Bautismo/i });
    expect(enlaceBautismo).toHaveAttribute('href', '/sacramentos/bautismo');

    await usuario.click(enlaceBautismo);

    expect(await screen.findByRole('heading', { level: 1, name: 'Bautismo' })).toBeInTheDocument();
    expect(screen.getByText('Primer sábado de cada mes')).toBeInTheDocument();
    expect(
      screen.getByText('¿Qué requisitos necesito para bautizar a mi hijo?'),
    ).toBeInTheDocument();

    renderRutaPortal('/sacramentos/no-existe');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Página no encontrada' }),
    ).toBeInTheDocument();
  });

  it('/nosotros muestra historia, párroco, comunidades y modal de video', async () => {
    const usuario = userEvent.setup();
    renderRutaPortal('/nosotros');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Quiénes somos' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Una casa de oración en el corazón de Obrajes',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('P. Gregorio, C.P.')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { level: 3, name: 'Parroquia de la Resurrección' }),
    ).toBeInTheDocument();

    const botonVideo = await screen.findByRole('button', {
      name: /Ver video completo con sonido/i,
    });
    await usuario.click(botonVideo);
    expect(await screen.findByRole('dialog', { name: 'Video institucional' })).toBeInTheDocument();
  });

  it('/comunidad muestra grupos pastorales y datos de participación', async () => {
    renderRutaPortal('/comunidad');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Grupos y pastorales' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Monaguillos')).toBeInTheDocument();
    expect(screen.getByText('Pastoral Juvenil')).toBeInTheDocument();
  });

  it('/contacto muestra dirección, teléfono, correo y enlace a Google Maps sin formulario', async () => {
    renderRutaPortal('/contacto');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Visítanos o escríbenos' }),
    ).toBeInTheDocument();
    const direcciones = await screen.findAllByText('Av. Héctor Ormachea N.º 167, Obrajes, La Paz');
    expect(direcciones.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('link', { name: /Cómo llegar/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver en Google Maps/i })).toBeInTheDocument();
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
  });
});
