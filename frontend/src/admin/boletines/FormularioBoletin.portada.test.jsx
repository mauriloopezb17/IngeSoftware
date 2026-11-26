import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { http, HttpResponse } from 'msw';

import { api } from '../../mocks/api.js';
import { server } from '../../mocks/server.js';
import { clienteHttp } from '../../services/clienteHttp.js';
import { crearQueryClient } from '../../services/queryClient.js';
import { reiniciarMocksAdmin } from '../mocks/handlers.js';
import { CONTRASENA_DESARROLLO } from '../mocks/usuarios.js';
import { SesionProvider } from '../sesion/SesionProvider.jsx';
import { ProveedorToasts } from '../ui/index.js';
import Boletines from './Boletines.jsx';

const mockGetDocument = vi.fn();

vi.mock('../../utils/pdfJs.js', () => ({
  cargarPdfJs: vi.fn(async () => ({
    getDocument: mockGetDocument,
  })),
}));

function montar(entrada = '/admin/boletines/nuevo') {
  return render(
    <QueryClientProvider client={crearQueryClient()}>
      <ProveedorToasts>
        <SesionProvider>
          <MemoryRouter initialEntries={[entrada]}>
            <Routes>
              <Route path="/admin/boletines/*" element={<Boletines />} />
            </Routes>
          </MemoryRouter>
        </SesionProvider>
      </ProveedorToasts>
    </QueryClientProvider>,
  );
}

describe('FormularioBoletin — generación de portada', () => {
  beforeEach(() => {
    reiniciarMocksAdmin();
    mockGetDocument.mockReset();
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({}));
    HTMLCanvasElement.prototype.toBlob = vi.fn((cb) =>
      cb(new Blob(['webp-data'], { type: 'image/webp' })),
    );
  });

  afterEach(() => {
    reiniciarMocksAdmin();
    vi.restoreAllMocks();
  });

  it('genera la portada de la primera página y envía portadaId al publicar', async () => {
    const usuario = userEvent.setup();
    let cuerpoEnviado = null;

    mockGetDocument.mockReturnValue({
      promise: Promise.resolve({
        destroy: vi.fn(),
        getPage: async () => ({
          getViewport: ({ scale }) => ({ width: 595 * scale, height: 842 * scale }),
          render: () => ({ promise: Promise.resolve() }),
        }),
      }),
      destroy: vi.fn(),
    });

    server.use(
      http.post(api('/admin/boletines'), async ({ request }) => {
        cuerpoEnviado = await request.json();
        return HttpResponse.json(
          {
            datos: {
              id: 99,
              titulo: cuerpoEnviado.titulo,
              periodo: `${cuerpoEnviado.periodo}-01`,
              fechaPublicacion: '2026-11-25T12:00:00-04:00',
              archivo: {
                id: cuerpoEnviado.archivoId,
                url: '/media/seed/boletin-ejemplo.pdf',
                nombreOriginal: 'estatutos-pastoral-juvenil.pdf',
                tipoMime: 'application/pdf',
                tamanoBytes: 1200,
              },
              portada: {
                id: cuerpoEnviado.portadaId,
                url: 'https://cdn.pasionistas.org.bo/portada.webp',
                textoAlternativo: `Portada del ${cuerpoEnviado.titulo}`,
                ancho: 800,
                alto: 1131,
                variantes: [],
              },
              sede: { id: 1, nombre: 'Parroquia Señor de la Exaltación', slug: 'senor-de-la-exaltacion' },
              publicadoPor: { id: 3, nombreCompleto: 'Secretaría (desarrollo)' },
            },
          },
          { status: 201 },
        );
      }),
    );

    await clienteHttp.post('/auth/login', {
      correo: 'secretaria@parroquia.test',
      contrasena: CONTRASENA_DESARROLLO,
    });
    montar();

    await usuario.type(await screen.findByLabelText('Título'), 'Edición de noviembre 2026');
    fireEvent.change(screen.getByLabelText('Mes del boletín'), { target: { value: '2026-11' } });

    await usuario.click(screen.getByRole('button', { name: 'Elegir PDF' }));
    const dialogo = await screen.findByRole('dialog', { name: 'PDF del boletín' });
    await usuario.click(await within(dialogo).findByRole('button', { name: /estatutos-pastoral-juvenil/ }));

    expect(
      await screen.findByAltText('Portada del Edición de noviembre 2026'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cambiar portada' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Volver a generar' })).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Publicar boletín' }));

    await waitFor(() => {
      expect(cuerpoEnviado).not.toBeNull();
    });
    expect(cuerpoEnviado.portadaId).toEqual(expect.any(Number));
  });
});
