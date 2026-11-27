import { describe, expect, it } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router';

import GruposPastorales from '../components/parroquia/GruposPastorales.jsx';
import { api } from '../mocks/api.js';
import { server } from '../mocks/server.js';
import { crearQueryClient } from '../services/queryClient.js';
import ComunidadPagina from './ComunidadPagina.jsx';
import { normalizarTelefonoWhatsApp } from './grupoContacto.js';
import GrupoDetalle from './GrupoDetalle.jsx';

function montarDetalle(slug = 'pastoral-juvenil') {
  return render(
    <QueryClientProvider client={crearQueryClient()}>
      <MemoryRouter initialEntries={[`/comunidad/grupos/${slug}`]}>
        <Routes>
          <Route path="/comunidad/grupos/:slug" element={<GrupoDetalle />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('normalizarTelefonoWhatsApp', () => {
  it('agrega 591 a celulares bolivianos de 8 dígitos y limpia símbolos', () => {
    expect(normalizarTelefonoWhatsApp('71234567')).toBe('59171234567');
    expect(normalizarTelefonoWhatsApp('698-765-43')).toBe('59169876543');
    expect(normalizarTelefonoWhatsApp('+591 7123 4567')).toBe('59171234567');
    expect(normalizarTelefonoWhatsApp('')).toBeNull();
  });
});

describe('GrupoDetalle (/comunidad/grupos/:slug)', () => {
  it('muestra datos, galería, responsable y enlaces directos de WhatsApp y correo', async () => {
    montarDetalle('pastoral-juvenil');

    expect(await screen.findByRole('heading', { level: 1, name: 'Pastoral Juvenil' })).toBeInTheDocument();
    expect(screen.getByText(/Viernes · 18:30/)).toBeInTheDocument();
    expect(screen.getByText('Coordinación juvenil (de ejemplo)')).toBeInTheDocument();

    const btnWhatsapp = screen.getByRole('link', { name: 'Escribir por WhatsApp' });
    expect(btnWhatsapp).toHaveAttribute('target', '_blank');
    expect(btnWhatsapp.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/59171234567\?text=/);

    const btnCorreo = screen.getByRole('link', { name: 'Enviar correo' });
    expect(btnCorreo.getAttribute('href')).toBe(
      'mailto:juvenil@parroquia.test?subject=Quiero%20participar%20en%20Pastoral%20Juvenil',
    );

    expect(screen.getByRole('heading', { name: 'Fotos y videos' })).toBeInTheDocument();
  });

  it('muestra el contacto de secretaría si el grupo no tiene WhatsApp ni correo', async () => {
    montarDetalle('monaguillos');

    expect(await screen.findByRole('heading', { level: 1, name: 'Monaguillos' })).toBeInTheDocument();
    expect(
      screen.getByText(/Escríbele a la secretaría para recibir información y sumarte al grupo/),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Enviar correo' })).toHaveAttribute(
      'href',
      expect.stringContaining('mailto:parroquia.exaltacion.obrajes@gmail.com'),
    );
    expect(screen.getByRole('link', { name: /Llamar:/ })).toBeInTheDocument();
  });

  it('muestra pantalla 404 cuando el grupo no existe', async () => {
    server.use(
      http.get(api('/sedes/:sede/grupos-pastorales/:slug'), () =>
        HttpResponse.json(
          { error: { codigo: 'NO_ENCONTRADO', mensaje: 'No existe.', detalles: [] } },
          { status: 404 },
        ),
      ),
    );

    montarDetalle('inexistente');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'No encontramos este grupo pastoral' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver a comunidad' })).toHaveAttribute(
      'href',
      '/comunidad',
    );
  });
});

describe('Tarjetas de grupos con enlace a su página', () => {
  it('ComunidadPagina enlaza cada grupo a /comunidad/grupos/:slug', async () => {
    render(
      <QueryClientProvider client={crearQueryClient()}>
        <MemoryRouter initialEntries={['/comunidad']}>
          <ComunidadPagina />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const enlace = await screen.findByRole('link', { name: 'Pastoral Juvenil' });
    expect(enlace).toHaveAttribute('href', '/comunidad/grupos/pastoral-juvenil');
  });

  it('GruposPastorales enlaza cada grupo a /comunidad/grupos/:slug', async () => {
    render(
      <QueryClientProvider client={crearQueryClient()}>
        <MemoryRouter initialEntries={['/']}>
          <GruposPastorales />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const enlace = await screen.findByRole('link', { name: 'Monaguillos' });
    expect(enlace).toHaveAttribute('href', '/comunidad/grupos/monaguillos');
  });
});
