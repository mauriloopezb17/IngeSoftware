import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { server } from '../../mocks/server.js';
import { SesionProvider } from '../sesion/SesionProvider.jsx';
import { ProveedorToasts } from './Toasts.jsx';
import BotonExportarCsv from './BotonExportarCsv.jsx';
import { construirUrlExportacion } from './exportarCsv.js';
import { usuariosSeed } from '../mocks/usuarios.js';

function renderConUsuario(usuario, ui) {
  server.use(
    http.get('/api/auth/yo', () =>
      HttpResponse.json({
        datos: usuario
          ? {
              ...usuario,
              fechaUltimoAcceso: '2026-11-26T10:00:00-04:00',
              sesionExpiraEn: '2026-11-26T18:00:00-04:00',
            }
          : null,
      }),
    ),
  );

  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <ProveedorToasts>
        <SesionProvider>{ui}</SesionProvider>
      </ProveedorToasts>
    </QueryClientProvider>,
  );
}

describe('BotonExportarCsv', () => {
  it('arma la URL con los filtros activos y sin pagina ni porPagina', () => {
    const url = construirUrlExportacion('publicaciones', {
      pagina: 3,
      porPagina: 25,
      estado: 'PUBLICADO',
      buscar: 'misa',
      categoria: '',
    });

    const parsed = new URL(url);
    expect(parsed.pathname).toBe('/api/admin/publicaciones/exportar');
    expect(parsed.searchParams.get('estado')).toBe('PUBLICADO');
    expect(parsed.searchParams.get('buscar')).toBe('misa');
    expect(parsed.searchParams.has('pagina')).toBe(false);
    expect(parsed.searchParams.has('porPagina')).toBe(false);
    expect(parsed.searchParams.has('categoria')).toBe(false);
  });

  it('se oculta si el rol no tiene el permiso de exportación', async () => {
    const marketing = usuariosSeed.find((u) => u.rol.codigo === 'MARKETING');
    renderConUsuario(
      marketing,
      <BotonExportarCsv recurso="usuarios" permiso="usuarios.exportar" filtros={{}} />,
    );

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Exportar CSV/i })).not.toBeInTheDocument();
    });
  });

  it('muestra el botón para rol autorizado y descarga el CSV con filtros activos', async () => {
    const admin = usuariosSeed.find((u) => u.rol.codigo === 'ADMINISTRADOR');
    let urlSolicitada = null;

    const createObjectURL = vi.fn(() => 'blob:test-csv');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL = createObjectURL;
      static revokeObjectURL = revokeObjectURL;
    });

    server.use(
      http.get('/api/admin/publicaciones/exportar', ({ request }) => {
        urlSolicitada = new URL(request.url);
        return new HttpResponse('\uFEFFID;Título\r\n1;Misa\r\n', {
          status: 200,
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': 'attachment; filename="publicaciones-2026-11-26.csv"',
          },
        });
      }),
    );

    renderConUsuario(
      admin,
      <BotonExportarCsv
        recurso="publicaciones"
        permiso="publicaciones.exportar"
        filtros={{ pagina: 2, porPagina: 10, estado: 'PUBLICADO' }}
      />,
    );

    const boton = await screen.findByRole('button', { name: /Exportar CSV/i });
    expect(boton).toHaveAttribute(
      'title',
      'Se exporta lo que ves con los filtros actuales, sin límite de páginas.',
    );

    const u = userEvent.setup();
    await u.click(boton);

    await waitFor(() => {
      expect(urlSolicitada).not.toBeNull();
    });
    expect(urlSolicitada.searchParams.get('estado')).toBe('PUBLICADO');
    expect(urlSolicitada.searchParams.has('pagina')).toBe(false);
    expect(urlSolicitada.searchParams.has('porPagina')).toBe(false);
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test-csv');
    vi.unstubAllGlobals();
  });

  it('muestra el mensaje de error en toast cuando el servidor responde 422 DEMASIADOS_REGISTROS', async () => {
    const admin = usuariosSeed.find((u) => u.rol.codigo === 'ADMINISTRADOR');

    server.use(
      http.get('/api/admin/eventos/exportar', () =>
        HttpResponse.json(
          {
            error: {
              codigo: 'DEMASIADOS_REGISTROS',
              mensaje: 'Hay demasiados registros para exportar. Aplica más filtros.',
              detalles: [],
            },
          },
          { status: 422 },
        ),
      ),
    );

    renderConUsuario(
      admin,
      <BotonExportarCsv recurso="eventos" permiso="eventos.exportar" filtros={{}} />,
    );

    const boton = await screen.findByRole('button', { name: /Exportar CSV/i });
    const u = userEvent.setup();
    await u.click(boton);

    expect(
      await screen.findByText('Hay demasiados registros para exportar. Aplica más filtros.'),
    ).toBeInTheDocument();
  });
});
