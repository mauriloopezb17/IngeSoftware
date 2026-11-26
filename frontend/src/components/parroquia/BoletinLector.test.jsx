import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';

import { renderConRouterYQuery } from '../../test/utilidadesQuery.jsx';
import Boletines from '../../pages/Boletines.jsx';
import BoletinLector from './BoletinLector.jsx';

const mockGetDocument = vi.fn();

vi.mock('../../utils/pdfJs.js', () => ({
  cargarPdfJs: vi.fn(async () => ({
    getDocument: mockGetDocument,
    TextLayer: class MockTextLayer {
      render() {
        return Promise.resolve();
      }
      cancel() {}
    },
  })),
}));

function crearDocumentoPdfMock(numPages = 3) {
  return {
    numPages,
    destroy: vi.fn(),
    getPage: vi.fn(async () => ({
      getViewport: ({ scale }) => ({
        width: 600 * scale,
        height: 800 * scale,
        scale,
        convertToViewportRectangle: (r) => r,
      }),
      render: () => ({ promise: Promise.resolve(), cancel: vi.fn() }),
      streamTextContent: () => new ReadableStream(),
      getAnnotations: async () => [],
    })),
  };
}

const boletinEjemplo = {
  id: 1,
  titulo: 'Edición de octubre 2026',
  periodo: '2026-10-01',
  fechaPublicacion: '2026-10-03T10:00:00-04:00',
  archivo: {
    id: 7,
    url: '/media/seed/boletin-ejemplo.pdf',
    nombreOriginal: 'Boletín octubre 2026.pdf',
    tipoMime: 'application/pdf',
    tamanoBytes: 2516582,
  },
};

describe('BoletinLector', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockGetDocument.mockReset();
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      setTransform: vi.fn(),
    }));
  });

  it('se monta en document.body aunque la página esté dentro de un contenedor animado', async () => {
    mockGetDocument.mockReturnValue({
      promise: Promise.resolve(crearDocumentoPdfMock(1)),
      destroy: vi.fn(),
    });

    const { container } = render(
      <div style={{ transform: 'translateY(16px)' }}>
        <BoletinLector boletin={boletinEjemplo} alCerrar={vi.fn()} />
      </div>,
    );

    const dialogo = screen.getByRole('dialog');
    expect(container.contains(dialogo)).toBe(false);
    expect(document.body.contains(dialogo)).toBe(true);
    expect(await screen.findByText('Página 1 de 1')).toBeInTheDocument();
  });

  it('muestra la barra, indicador de página, zoom y se cierra con botón, Esc y clic fuera', async () => {
    const usuario = userEvent.setup();
    const alCerrar = vi.fn();
    mockGetDocument.mockReturnValue({
      promise: Promise.resolve(crearDocumentoPdfMock(4)),
      destroy: vi.fn(),
    });

    const botonDisparador = document.createElement('button');
    botonDisparador.textContent = 'Abrir';
    document.body.appendChild(botonDisparador);
    botonDisparador.focus();

    render(<BoletinLector boletin={boletinEjemplo} alCerrar={alCerrar} />);

    const dialogo = screen.getByRole('dialog');
    expect(dialogo).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Edición de octubre 2026')).toBeInTheDocument();
    expect(screen.getByLabelText('Cerrar el lector')).toHaveFocus();

    expect(await screen.findByText('Página 1 de 4')).toBeInTheDocument();

    // Controles de zoom
    const btnAcercar = screen.getByRole('button', { name: 'Acercar' });
    await usuario.click(btnAcercar);
    expect(screen.getByText('125 %')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Alejar' }));
    expect(screen.getByText('100 %')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Ajustar al ancho' }));
    expect(screen.getByRole('button', { name: 'Ajustar al ancho' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    // Cierre por Escape
    await usuario.keyboard('{Escape}');
    expect(alCerrar).toHaveBeenCalledTimes(1);

    // Cierre por botón
    await usuario.click(screen.getByRole('button', { name: 'Cerrar el lector' }));
    expect(alCerrar).toHaveBeenCalledTimes(2);

    // Cierre por clic fuera (fondo)
    fireEvent.click(dialogo.parentElement);
    expect(alCerrar).toHaveBeenCalledTimes(3);

    botonDisparador.remove();
  });

  it('atrapa el foco dentro del diálogo y lo devuelve al elemento previo al cerrar', async () => {
    const usuario = userEvent.setup();
    mockGetDocument.mockReturnValue({
      promise: Promise.resolve(crearDocumentoPdfMock(1)),
      destroy: vi.fn(),
    });

    const disparador = document.createElement('button');
    disparador.textContent = 'Tarjeta';
    document.body.appendChild(disparador);
    disparador.focus();

    const { unmount } = render(<BoletinLector boletin={boletinEjemplo} alCerrar={vi.fn()} />);

    const btnCerrar = screen.getByRole('button', { name: 'Cerrar el lector' });
    expect(btnCerrar).toHaveFocus();

    // Shift+Tab desde el primer botón salta al último elemento focable (Descargar)
    await usuario.tab({ shift: true });
    expect(screen.getByRole('button', { name: /Descargar/i })).toHaveFocus();

    // Tab desde el último vuelve al botón cerrar
    await usuario.tab();
    expect(btnCerrar).toHaveFocus();

    unmount();
    expect(disparador).toHaveFocus();
    disparador.remove();
  });

  it('muestra estado Descargando… durante la descarga y evita doble clic', async () => {
    const usuario = userEvent.setup();
    mockGetDocument.mockReturnValue({
      promise: Promise.resolve(crearDocumentoPdfMock(1)),
      destroy: vi.fn(),
    });

    let resolverFetch;
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolverFetch = resolve;
        }),
    );
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<BoletinLector boletin={boletinEjemplo} alCerrar={vi.fn()} />);

    const btnDescargar = screen.getByRole('button', { name: 'Descargar' });
    await usuario.click(btnDescargar);

    expect(screen.getByRole('button', { name: 'Descargando…' })).toBeDisabled();

    resolverFetch({ ok: true, blob: async () => new Blob(['%PDF']) });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Descargar' })).toBeEnabled();
    });
  });

  it('muestra estado de error con Reintentar, Abrir en una pestaña nueva y Descargar', async () => {
    mockGetDocument.mockReturnValue({
      promise: Promise.reject(new Error('Fallo al cargar PDF')),
      destroy: vi.fn(),
    });

    render(<BoletinLector boletin={boletinEjemplo} alCerrar={vi.fn()} />);

    expect(await screen.findByText('No pudimos mostrar el boletín.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
    const enlacePestana = screen.getByRole('link', { name: /Abrir en una pestaña nueva/i });
    expect(enlacePestana).toHaveAttribute('href', '/media/seed/boletin-ejemplo.pdf');
    expect(enlacePestana).toHaveAttribute('target', '_blank');
    expect(screen.getAllByRole('button', { name: 'Descargar' }).length).toBeGreaterThanOrEqual(1);
  });

  it('muestra 404 (NoEncontrado) cuando el periodo de la ruta no existe', async () => {
    renderConRouterYQuery(
      <Routes>
        <Route path="/boletines" element={<Boletines />} />
        <Route path="/boletines/:periodo" element={<Boletines />} />
      </Routes>,
      ['/boletines/2020-01'],
    );

    expect(await screen.findByRole('heading', { level: 1, name: /Página no encontrada/i })).toBeInTheDocument();
  });
});
