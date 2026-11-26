import { useEffect, useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { createMemoryRouter, RouterProvider } from 'react-router';

import { api } from '../../mocks/api.js';
import { server } from '../../mocks/server.js';
import { clienteHttp } from '../../services/clienteHttp.js';
import { crearQueryClient } from '../../services/queryClient.js';
import { reiniciarMocksAdmin } from '../mocks/handlers.js';
import { CONTRASENA_DESARROLLO } from '../mocks/usuarios.js';
import { SesionProvider } from '../sesion/SesionProvider.jsx';
import { ProveedorToasts } from '../ui/index.js';
import Eventos from './Eventos.jsx';

vi.mock('../publicaciones/editor/EditorContenido.jsx', () => ({
  default: function EditorLigero({ valorInicial, alIniciar, etiqueta = 'Contenido del evento' }) {
    const iniciado = useRef(false);
    useEffect(() => {
      if (iniciado.current) return;
      iniciado.current = true;
      alIniciar?.(valorInicial?.bloques ?? []);
    }, [alIniciar, valorInicial]);
    return <textarea aria-label={etiqueta} readOnly />;
  },
}));

const entrar = (usuario) =>
  clienteHttp.post('/auth/login', { correo: `${usuario}@parroquia.test`, contrasena: CONTRASENA_DESARROLLO });

function montarConRouter(entrada = '/admin/eventos/2/editar') {
  const router = createMemoryRouter(
    [
      { path: '/admin/eventos/*', element: <Eventos /> },
      { path: '/admin/eventos', element: <p data-testid="ruta-listado">Listado eventos</p> },
    ],
    { initialEntries: [entrada] },
  );

  render(
    <QueryClientProvider client={crearQueryClient()}>
      <ProveedorToasts>
        <SesionProvider>
          <RouterProvider router={router} />
        </SesionProvider>
      </ProveedorToasts>
    </QueryClientProvider>,
  );

  return router;
}

async function esperarEditorListo() {
  await waitFor(
    () => {
      expect(screen.queryByText(/Cargando el editor/)).not.toBeInTheDocument();
    },
    { timeout: 15000 },
  );
}

describe('detalle de página en el formulario de eventos', () => {
  beforeEach(reiniciarMocksAdmin);
  afterEach(reiniciarMocksAdmin);

  it('carga el detalle existente, permite editar programa y enlaces, y guarda ordenado por hora', async () => {
    await entrar('secretaria');
    montarConRouter('/admin/eventos/2/editar');
    const usuario = userEvent.setup();

    expect(await screen.findByLabelText('Dirección')).toHaveValue('Av. Héctor Ormachea N.º 167, Obrajes, La Paz');
    expect(screen.getByLabelText('Enlace de Google Maps')).toHaveValue(
      'https://www.google.com/maps/search/?api=1&query=-16.5267952%2C-68.1082157',
    );
    expect(screen.getByLabelText('Nombre del responsable')).toHaveValue('Equipo de Liturgia (ejemplo)');
    expect(screen.getByLabelText('Hora 1')).toHaveValue('08:00');
    expect(screen.getByLabelText('Actividad 1')).toHaveValue('Primera misa de sanación (ejemplo)');
    await esperarEditorListo();

    await usuario.click(screen.getByRole('button', { name: 'Agregar actividad' }));
    fireEvent.change(screen.getByLabelText('Hora 4'), { target: { value: '07:00' } });
    fireEvent.change(screen.getByLabelText('Actividad 4'), { target: { value: 'Rosario de preparación' } });

    // Mueve la actividad recién añadida hacia arriba y luego añade dos enlaces y quita uno.
    await usuario.click(screen.getByRole('button', { name: 'Subir actividad 4' }));
    expect(screen.getByLabelText('Actividad 3')).toHaveValue('Rosario de preparación');

    await usuario.click(screen.getByRole('button', { name: 'Agregar enlace' }));
    fireEvent.change(screen.getByLabelText('Texto del enlace 1'), { target: { value: 'Formulario temporal' } });
    fireEvent.change(screen.getByLabelText('URL 1'), { target: { value: 'https://parroquia.example.org/temp' } });
    await usuario.click(screen.getByRole('button', { name: 'Agregar enlace' }));
    fireEvent.change(screen.getByLabelText('Texto del enlace 2'), { target: { value: 'Inscripción oficial' } });
    fireEvent.change(screen.getByLabelText('URL 2'), { target: { value: 'https://parroquia.example.org/inscripcion' } });
    await usuario.click(screen.getByRole('button', { name: 'Quitar enlace 1' }));

    await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await screen.findByTestId('ruta-listado');
    const { datos: actualizado } = await clienteHttp.get('/admin/eventos/2');
    expect(actualizado.detalle.programa.map((p) => p.hora)).toEqual(['07:00', '08:00', '10:00', '12:00']);
    expect(actualizado.detalle.enlaces).toEqual([
      { texto: 'Inscripción oficial', url: 'https://parroquia.example.org/inscripcion' },
    ]);
  }, 20000);

  it('envía el bloque detalle al crear un evento nuevo', async () => {
    await entrar('secretaria');
    montarConRouter('/admin/eventos/nuevo');
    const usuario = userEvent.setup();

    fireEvent.change(await screen.findByLabelText('Título'), { target: { value: 'Retiro de Adviento juvenil' } });
    await usuario.selectOptions(screen.getByLabelText('Categoría'), '3');
    const inicio = screen.getByRole('group', { name: 'Inicio' });
    fireEvent.change(within(inicio).getByLabelText('Día'), { target: { value: '2026-12-12' } });
    fireEvent.change(within(inicio).getByLabelText('Hora'), { target: { value: '09:00' } });
    await esperarEditorListo();

    fireEvent.change(screen.getByLabelText('Dirección'), {
      target: { value: 'Casa de retiro Pasionistas, Calle 14' },
    });
    fireEvent.change(screen.getByLabelText('Enlace de Google Maps'), {
      target: { value: 'https://maps.app.goo.gl/ejemploRetiro' },
    });
    await usuario.click(screen.getByRole('button', { name: 'Agregar actividad' }));
    fireEvent.change(screen.getByLabelText('Hora 1'), { target: { value: '09:30' } });
    fireEvent.change(screen.getByLabelText('Actividad 1'), { target: { value: 'Bienvenida y oración' } });
    fireEvent.change(screen.getByLabelText('Nombre del responsable'), { target: { value: 'Pastoral Juvenil' } });
    fireEvent.change(screen.getByLabelText('Correo electrónico (opcional)'), {
      target: { value: 'jovenes@parroquia.example.org' },
    });

    await usuario.click(screen.getByRole('button', { name: 'Crear evento' }));

    await screen.findByTestId('ruta-listado');
    const lista = await clienteHttp.get('/admin/eventos', { parametros: { vista: 'todos' } });
    const creado = lista.datos.find((e) => e.titulo === 'Retiro de Adviento juvenil');
    expect(creado).toBeDefined();
    expect(creado.detalle).toMatchObject({
      direccion: 'Casa de retiro Pasionistas, Calle 14',
      enlaceMapa: 'https://maps.app.goo.gl/ejemploRetiro',
      programa: [{ hora: '09:30', actividad: 'Bienvenida y oración' }],
      responsable: {
        nombre: 'Pastoral Juvenil',
        rol: null,
        telefono: null,
        correo: 'jovenes@parroquia.example.org',
      },
      enlaces: [],
    });
  }, 20000);

  it('«Ver cómo queda» abre el portal cuando está publicado sin cambios y el modal si hay cambios sin guardar', async () => {
    await entrar('secretaria');
    montarConRouter('/admin/eventos/2/editar');
    const usuario = userEvent.setup();

    await screen.findByLabelText('Dirección');
    await esperarEditorListo();

    const enlacePublico = screen.getByRole('link', { name: /Ver cómo queda/ });
    expect(enlacePublico).toHaveAttribute('href', '/calendario/2');

    fireEvent.change(screen.getByLabelText('Dirección'), { target: { value: 'Atrio principal, Av. Ormachea' } });

    await usuario.click(screen.getByRole('button', { name: /Ver cómo queda/ }));
    const dialogo = await screen.findByRole('dialog', { name: 'Vista previa' });
    expect(within(dialogo).getByText('Atrio principal, Av. Ormachea')).toBeInTheDocument();
    expect(within(dialogo).getByRole('heading', { name: 'Programa' })).toBeInTheDocument();

    await usuario.click(within(dialogo).getByRole('button', { name: 'Cerrar vista previa' }));
    expect(screen.queryByRole('dialog', { name: 'Vista previa' })).not.toBeInTheDocument();
  }, 20000);

  it('muestra errores locales y agrupa errores 400 de bloques en el resumen superior', async () => {
    await entrar('secretaria');
    montarConRouter('/admin/eventos/2/editar');
    const usuario = userEvent.setup();

    const campoMapa = await screen.findByLabelText('Enlace de Google Maps');
    await esperarEditorListo();

    fireEvent.change(campoMapa, { target: { value: 'https://ejemplo.org/no-es-maps' } });
    await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('No se pudo guardar. Revisa lo siguiente:')).toBeInTheDocument();
    expect(screen.getAllByText('Debe ser una URL https:// de Google Maps.').length).toBeGreaterThanOrEqual(1);

    fireEvent.change(campoMapa, { target: { value: 'https://maps.app.goo.gl/valido' } });

    server.use(
      http.patch(api('/admin/eventos/:id'), () =>
        HttpResponse.json(
          {
            error: {
              codigo: 'VALIDACION',
              mensaje: 'Los datos del evento no son válidos.',
              detalles: [
                { campo: 'detalle.contenido.bloques.0.props.textColor', mensaje: 'Estilo no permitido.' },
                { campo: 'detalle.programa.0.hora', mensaje: 'Hora inválida en servidor.' },
              ],
            },
          },
          { status: 400 },
        ),
      ),
    );

    await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(
      await screen.findByText(/El contenido tiene formato que no se puede guardar en 1 párrafo/),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Hora inválida en servidor.').length).toBeGreaterThanOrEqual(1);
  }, 20000);

  it('advierte antes de salir si hay cambios sin guardar y permite quedarse o salir', async () => {
    await entrar('secretaria');
    const router = montarConRouter('/admin/eventos/2/editar');
    const usuario = userEvent.setup();

    const direccion = await screen.findByLabelText('Dirección');
    await esperarEditorListo();
    await usuario.type(direccion, ' - Puerta lateral');

    await usuario.click(screen.getByRole('link', { name: 'Cancelar' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Hay cambios sin guardar' });

    await usuario.click(within(dialogo).getByRole('button', { name: 'Seguir editando' }));
    expect(screen.queryByRole('dialog', { name: 'Hay cambios sin guardar' })).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/admin/eventos/2/editar');

    await usuario.click(screen.getByRole('link', { name: 'Cancelar' }));
    const dialogoSalida = await screen.findByRole('dialog', { name: 'Hay cambios sin guardar' });
    await usuario.click(within(dialogoSalida).getByRole('button', { name: 'Salir sin guardar' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/eventos'));
  }, 20000);

  it('Marketing ve la tarjeta deshabilitada y guarda solo la página mediante PATCH .../detalle', async () => {
    await entrar('marketing');
    montarConRouter('/admin/eventos/2/editar');
    const usuario = userEvent.setup();

    expect(await screen.findByRole('heading', { level: 1, name: 'Página del evento' })).toBeInTheDocument();
    expect(screen.getByText('Solo lectura · gestionado por secretaría')).toBeInTheDocument();
    expect(screen.getByLabelText('Título')).toBeDisabled();
    expect(screen.getByLabelText('Categoría')).toBeDisabled();
    expect(screen.getByLabelText('Estado')).toBeDisabled();
    expect(screen.getByLabelText('Todo el día')).toBeDisabled();
    expect(screen.getByLabelText('Lugar (opcional)')).toBeDisabled();
    expect(screen.getByLabelText('Resumen para la tarjeta del calendario')).toBeDisabled();
    await esperarEditorListo();

    const direccion = screen.getByLabelText('Dirección');
    fireEvent.change(direccion, { target: { value: 'Templo Parroquial Obrajes, Calle 1' } });

    await usuario.click(screen.getByRole('button', { name: 'Guardar página del evento' }));

    await screen.findByTestId('ruta-listado');
    const { datos: actualizado } = await clienteHttp.get('/admin/eventos/2');
    expect(actualizado.detalle.direccion).toBe('Templo Parroquial Obrajes, Calle 1');
    expect(actualizado.titulo).toBe('Misa de sanación');
  }, 20000);
});
