import { useEffect, useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';

import { clienteHttp } from '../../services/clienteHttp.js';
import { crearQueryClient } from '../../services/queryClient.js';
import { reiniciarMocksAdmin } from '../mocks/handlers.js';
import { CONTRASENA_DESARROLLO } from '../mocks/usuarios.js';
import { SesionProvider } from '../sesion/SesionProvider.jsx';
import { ProveedorToasts } from '../ui/index.js';
import Proclamas from './Proclamas.jsx';

vi.mock('../publicaciones/editor/EditorContenido.jsx', () => ({
  default: function EditorSimulado({ alIniciar, alCambiar, etiqueta = 'Descripción de la proclama' }) {
    const iniciado = useRef(false);
    useEffect(() => {
      if (iniciado.current) return;
      iniciado.current = true;
      alIniciar?.([]);
    }, [alIniciar]);
    return (
      <textarea
        aria-label={etiqueta}
        onChange={(e) => {
          const texto = e.target.value;
          alCambiar?.(
            texto
              ? [
                  {
                    id: 'bloque-1',
                    type: 'paragraph',
                    props: {},
                    content: [{ type: 'text', text: texto, styles: {} }],
                    children: [],
                  },
                ]
              : [],
          );
        }}
      />
    );
  },
}));

const entrar = (usuario) =>
  clienteHttp.post('/auth/login', { correo: `${usuario}@parroquia.test`, contrasena: CONTRASENA_DESARROLLO });

function montar(entrada = '/admin/proclamas/1/editar') {
  return render(
    <QueryClientProvider client={crearQueryClient()}>
      <ProveedorToasts>
        <SesionProvider>
          <MemoryRouter initialEntries={[entrada]}>
            <Routes>
              <Route path="/admin/proclamas/*" element={<Proclamas />} />
            </Routes>
          </MemoryRouter>
        </SesionProvider>
      </ProveedorToasts>
    </QueryClientProvider>,
  );
}

describe('SeccionDetalleProclama (página de la proclama)', () => {
  beforeEach(reiniciarMocksAdmin);
  afterEach(reiniciarMocksAdmin);

  it('Marketing edita foto, galería, descripción y lugar con PATCH .../detalle', async () => {
    await entrar('marketing');
    montar('/admin/proclamas/1/editar');
    const usuario = userEvent.setup();

    await screen.findByRole('heading', { name: 'Página de la proclama' });
    expect(screen.getByText('Publícala solo con la autorización de los novios.')).toBeInTheDocument();

    // Elegir foto de los novios
    await usuario.click(screen.getByRole('button', { name: 'Elegir foto' }));
    const dialogoFoto = await screen.findByRole('dialog', { name: 'Elegir foto de los novios' });
    const opcionesFoto = await within(dialogoFoto).findAllByRole('button', { pressed: false });
    const primeraImagen = opcionesFoto.find((b) => !b.textContent.includes('Cancelar') && !b.textContent.includes('Usar'));
    await usuario.click(primeraImagen);
    await usuario.click(within(dialogoFoto).getByRole('button', { name: 'Usar esta imagen' }));

    // Agregar a la galería
    await usuario.click(screen.getByRole('button', { name: 'Agregar a la galería' }));
    const dialogoGal = await screen.findByRole('dialog', { name: 'Agregar foto o video a la galería' });
    const listaGal = await within(dialogoGal).findByRole('list', { name: 'Archivos disponibles' });
    const primerItemGal = within(listaGal).getAllByRole('button')[0];
    await usuario.click(primerItemGal);
    await usuario.click(within(dialogoGal).getByRole('button', { name: 'Agregar a la galería' }));

    expect(await screen.findByRole('list', { name: 'Archivos de la galería' })).toBeInTheDocument();

    // Descripción
    const editor = await screen.findByLabelText('Descripción de la proclama');
    await usuario.type(editor, 'Celebración con toda la comunidad.');

    // Lugar externo
    const casilla = screen.getByLabelText('Se celebra en esta parroquia');
    expect(casilla).toBeChecked();
    await usuario.click(casilla);
    await usuario.type(screen.getByLabelText(/Templo o capilla/), 'Capilla San Pablo');
    await usuario.type(screen.getByLabelText(/Dirección/), 'Av. Costanera 123');
    await usuario.type(screen.getByLabelText(/Enlace de Google Maps/), 'https://maps.app.goo.gl/ejemplo');

    await usuario.click(screen.getByRole('button', { name: 'Guardar página' }));

    expect(await screen.findByText('Página de la proclama guardada.')).toBeInTheDocument();

    const actualizada = (await clienteHttp.get('/admin/proclamas/1')).datos;
    expect(actualizada.imagenId).toBeTypeOf('number');
    expect(actualizada.detalle.galeria).toHaveLength(1);
    expect(actualizada.detalle.contenido.bloques[0].content[0].text).toBe('Celebración con toda la comunidad.');
    expect(actualizada.detalle.lugar).toEqual({
      templo: 'Capilla San Pablo',
      direccion: 'Av. Costanera 123',
      enlaceMapa: 'https://maps.app.goo.gl/ejemplo',
    });
  });

  it('valida enlace de Google Maps antes de enviar', async () => {
    await entrar('secretaria');
    montar('/admin/proclamas/1/editar');
    const usuario = userEvent.setup();

    await screen.findByRole('heading', { name: 'Página de la proclama' });
    await usuario.click(screen.getByLabelText('Se celebra en esta parroquia'));
    await usuario.type(screen.getByLabelText(/Templo o capilla/), 'Capilla');
    await usuario.type(screen.getByLabelText(/Enlace de Google Maps/), 'https://ejemplo.com/no-es-maps');
    await usuario.click(screen.getByRole('button', { name: 'Guardar página' }));

    await waitFor(() => {
      expect(screen.getByText('No se pudo guardar la página. Revisa lo siguiente:')).toBeInTheDocument();
    });
    expect(screen.getAllByText('Debe ser un enlace https:// de Google Maps.').length).toBeGreaterThanOrEqual(1);
  });
});
