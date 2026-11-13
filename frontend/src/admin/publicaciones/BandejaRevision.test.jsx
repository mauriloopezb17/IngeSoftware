import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';

import { clienteHttp } from '../../services/clienteHttp.js';
import { crearQueryClient } from '../../services/queryClient.js';
import { reiniciarMocksAdmin } from '../mocks/handlers.js';
import { CONTRASENA_DESARROLLO } from '../mocks/usuarios.js';
import { useSesion } from '../sesion/SesionContexto.js';
import { SesionProvider } from '../sesion/SesionProvider.jsx';
import { aCampoFecha } from './fechas.js';
import Publicaciones from './Publicaciones.jsx';

const entrar = (usuario) =>
  clienteHttp.post('/auth/login', { correo: `${usuario}@parroquia.test`, contrasena: CONTRASENA_DESARROLLO });
const leer = async (id) => (await clienteHttp.get(`/admin/publicaciones/${id}`)).datos;

// Como en el panel real, las pantallas se montan cuando ya hay sesión.
function ConSesion({ children }) {
  const { cargando } = useSesion();
  return cargando ? null : children;
}

function montar(entrada = '/admin/publicaciones/revision') {
  const router = createMemoryRouter([{ path: '/admin/publicaciones/*', element: <Publicaciones /> }], {
    initialEntries: [entrada],
  });
  render(
    <QueryClientProvider client={crearQueryClient()}>
      <SesionProvider>
        <ConSesion>
          <RouterProvider router={router} />
        </ConSesion>
      </SesionProvider>
    </QueryClientProvider>,
  );
  return router;
}

const esperar = { timeout: 4000 };
const TITULO_6 = 'Jornada de oración por las vocaciones';
const TITULO_7 = 'Solemnidad de Cristo Rey: invitación a la procesión';
const tarjeta = (titulo) => screen.getByRole('article', { name: titulo });

describe('bandeja de revisión del Párroco', () => {
  beforeEach(reiniciarMocksAdmin);
  afterEach(reiniciarMocksAdmin);

  it('lista solo las publicaciones en revisión, con sus botones según `acciones`', async () => {
    await entrar('parroco');
    montar();

    expect(await screen.findByRole('heading', { level: 1, name: 'Bandeja de revisión' })).toBeInTheDocument();
    expect(await screen.findByText('2 publicaciones en revisión')).toBeInTheDocument();
    const lista = screen.getByRole('list', { name: 'Publicaciones en revisión' });
    expect(within(lista).getAllByRole('article').map((a) => a.getAttribute('aria-label')).sort()).toEqual(
      [TITULO_6, TITULO_7].sort(),
    );

    const cristoRey = tarjeta(TITULO_7);
    expect(within(cristoRey).getByText(/Marketing \(desarrollo\)/)).toBeInTheDocument();
    expect(within(cristoRey).getByRole('button', { name: `Aprobar «${TITULO_7}»` })).toBeInTheDocument();
    expect(within(cristoRey).getByRole('button', { name: `Rechazar «${TITULO_7}»` })).toBeInTheDocument();
    expect(within(cristoRey).getByRole('link', { name: `Revisar el contenido de «${TITULO_7}»` })).toHaveAttribute(
      'href',
      '/admin/publicaciones/7/editar',
    );
  });

  it.each(['marketing', 'secretaria'])('%s no tiene acceso: «sin permiso»', async (usuario) => {
    await entrar(usuario);
    montar();

    expect(await screen.findByRole('heading', { name: 'Sin permiso' }, esperar)).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Publicaciones en revisión' })).not.toBeInTheDocument();
  });

  it('el Administrador también la ve', async () => {
    await entrar('admin');
    montar();

    expect(await screen.findByText('2 publicaciones en revisión')).toBeInTheDocument();
  });

  describe('aprobar', () => {
    it('publica la noticia, la saca de la bandeja y avisa', async () => {
      await entrar('parroco');
      montar();
      await screen.findByText('2 publicaciones en revisión');

      await userEvent.click(within(tarjeta(TITULO_7)).getByRole('button', { name: /Aprobar/ }));
      const dialogo = await screen.findByRole('dialog', { name: 'Aprobar publicación' });
      await userEvent.click(within(dialogo).getByRole('button', { name: 'Aprobar y publicar' }));

      expect(await screen.findByRole('status')).toHaveTextContent(`«${TITULO_7}» fue aprobada y publicada.`);
      await waitFor(() => expect(screen.queryByRole('article', { name: TITULO_7 })).not.toBeInTheDocument(), esperar);
      expect(screen.getByText('1 publicación en revisión')).toBeInTheDocument();
      expect((await leer(7)).estado.codigo).toBe('PUBLICADO');
    });

    // La 7 expira en 10 días: una fecha entre hoy y esa expiración es válida.
    const enDias = (dias) => aCampoFecha(new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString());
    const escribirFecha = async (dialogo, valor) => {
      const campo = within(dialogo).getByLabelText('Fecha de publicación (opcional)');
      await userEvent.clear(campo);
      await userEvent.type(campo, valor);
    };

    it('con una fecha futura la deja programada', async () => {
      await entrar('parroco');
      montar();
      await screen.findByText('2 publicaciones en revisión');

      await userEvent.click(within(tarjeta(TITULO_7)).getByRole('button', { name: /Aprobar/ }));
      const dialogo = await screen.findByRole('dialog', { name: 'Aprobar publicación' });
      const fecha = enDias(5);
      await escribirFecha(dialogo, fecha);
      await userEvent.click(within(dialogo).getByRole('button', { name: 'Aprobar y publicar' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), esperar);
      const aprobada = await leer(7);
      expect(aprobada.estado.codigo).toBe('PUBLICADO');
      expect(aCampoFecha(aprobada.fechaPublicacion)).toBe(fecha);
      expect(aprobada.visibleEnPortal).toBe(false);
    });

    it('si la fecha deja la expiración atrás, la API responde 400 y el diálogo sigue abierto', async () => {
      await entrar('parroco');
      montar();
      await screen.findByText('2 publicaciones en revisión');

      await userEvent.click(within(tarjeta(TITULO_7)).getByRole('button', { name: /Aprobar/ }));
      const dialogo = await screen.findByRole('dialog', { name: 'Aprobar publicación' });
      await escribirFecha(dialogo, enDias(30));
      await userEvent.click(within(dialogo).getByRole('button', { name: 'Aprobar y publicar' }));

      expect(await within(dialogo).findByRole('alert')).toHaveTextContent('La publicación no está lista para publicarse.');
      expect(within(dialogo).getByRole('alert')).toHaveTextContent('La expiración debe ser posterior');
      expect((await leer(7)).estado.codigo).toBe('EN_REVISION');
    });

    it('cancelar no cambia nada', async () => {
      await entrar('parroco');
      montar();
      await screen.findByText('2 publicaciones en revisión');

      await userEvent.click(within(tarjeta(TITULO_7)).getByRole('button', { name: /Aprobar/ }));
      await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancelar' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect((await leer(7)).estado.codigo).toBe('EN_REVISION');
    });
  });

  describe('rechazar', () => {
    const abrirRechazo = async (titulo) => {
      await userEvent.click(within(tarjeta(titulo)).getByRole('button', { name: /Rechazar/ }));
      return screen.findByRole('dialog', { name: 'Rechazar publicación' });
    };

    it('sin observación da error y no cambia la publicación', async () => {
      await entrar('parroco');
      montar();
      await screen.findByText('2 publicaciones en revisión');

      const dialogo = await abrirRechazo(TITULO_7);
      await userEvent.click(within(dialogo).getByRole('button', { name: 'Rechazar publicación' }));

      const campo = within(dialogo).getByRole('textbox', { name: 'Observación' });
      expect(within(dialogo).getByText('La observación es obligatoria, de 5 a 500 caracteres.')).toBeInTheDocument();
      expect(campo).toHaveAttribute('aria-invalid', 'true');
      // Con menos de 5 caracteres tampoco.
      await userEvent.type(campo, 'abc');
      await userEvent.click(within(dialogo).getByRole('button', { name: 'Rechazar publicación' }));
      expect(within(dialogo).getByText('La observación es obligatoria, de 5 a 500 caracteres.')).toBeInTheDocument();
      expect((await leer(7)).estado.codigo).toBe('EN_REVISION');
    });

    it('muestra el contador de caracteres', async () => {
      await entrar('parroco');
      montar();
      await screen.findByText('2 publicaciones en revisión');

      const dialogo = await abrirRechazo(TITULO_7);
      expect(within(dialogo).getByText('0/500 caracteres (mínimo 5)')).toBeInTheDocument();
      await userEvent.type(within(dialogo).getByRole('textbox', { name: 'Observación' }), 'Corregir la hora');
      expect(within(dialogo).getByText('16/500 caracteres (mínimo 5)')).toBeInTheDocument();
    });

    it('con observación la devuelve a borrador y el autor la ve', async () => {
      await entrar('parroco');
      montar();
      await screen.findByText('2 publicaciones en revisión');

      const dialogo = await abrirRechazo(TITULO_7);
      await userEvent.type(
        within(dialogo).getByRole('textbox', { name: 'Observación' }),
        'Corregir la hora de la procesión: es a las 11:30.',
      );
      await userEvent.click(within(dialogo).getByRole('button', { name: 'Rechazar publicación' }));

      expect(await screen.findByRole('status')).toHaveTextContent(`«${TITULO_7}» volvió a borrador con tu observación.`);
      await waitFor(() => expect(screen.queryByRole('article', { name: TITULO_7 })).not.toBeInTheDocument(), esperar);

      const rechazada = await leer(7);
      expect(rechazada.estado.codigo).toBe('BORRADOR');
      expect(rechazada.revision).toMatchObject({
        revisadoPor: { nombreCompleto: 'Párroco (desarrollo)' },
        observacion: 'Corregir la hora de la procesión: es a las 11:30.',
      });

      // El autor la encuentra en su borrador.
      await entrar('marketing');
      expect((await leer(7)).revision.observacion).toBe('Corregir la hora de la procesión: es a las 11:30.');
    });

    it('si otra persona ya la resolvió, la API responde 409 y el diálogo lo explica', async () => {
      await entrar('parroco');
      montar();
      await screen.findByText('2 publicaciones en revisión');

      const dialogo = await abrirRechazo(TITULO_7);
      // Mientras tanto, otra sesión la aprobó.
      await clienteHttp.post('/admin/publicaciones/7/aprobar', {});
      await userEvent.type(within(dialogo).getByRole('textbox', { name: 'Observación' }), 'Falta una foto del acto.');
      await userEvent.click(within(dialogo).getByRole('button', { name: 'Rechazar publicación' }));

      expect(await within(dialogo).findByRole('alert')).toHaveTextContent(/Solo se pueden rechazar publicaciones en revisión/);
      expect((await leer(7)).estado.codigo).toBe('PUBLICADO');
    });
  });

  it('después de aprobar, el listado también se actualiza (no muestra «En revisión»)', async () => {
    await entrar('parroco');
    const router = montar('/admin/publicaciones');

    const filaDe = () => screen.getByRole('row', { name: new RegExp(TITULO_7) });
    expect(await screen.findByRole('table')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: 'Bandeja de revisión' }));
    await screen.findByRole('heading', { level: 1, name: 'Bandeja de revisión' });

    await userEvent.click(within(await screen.findByRole('article', { name: TITULO_7 })).getByRole('button', { name: /Aprobar/ }));
    await userEvent.click(
      within(await screen.findByRole('dialog', { name: 'Aprobar publicación' })).getByRole('button', {
        name: 'Aprobar y publicar',
      }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), esperar);

    await userEvent.click(screen.getByRole('link', { name: 'Volver a publicaciones' }));
    await screen.findByRole('table');
    // El listado ya no pone en revisión a la que se acaba de aprobar (la clave de ambas está invalidada).
    await waitFor(() => expect(within(filaDe()).queryByText('En revisión')).not.toBeInTheDocument(), esperar);
    expect(router.state.location.pathname).toBe('/admin/publicaciones');
  });

  it('sin nada en revisión lo dice', async () => {
    await entrar('parroco');
    await clienteHttp.post('/admin/publicaciones/6/aprobar', {});
    await clienteHttp.post('/admin/publicaciones/7/aprobar', {});
    montar();

    expect(await screen.findByText('No hay publicaciones esperando revisión.')).toBeInTheDocument();
    expect(screen.getByText('0 publicaciones en revisión')).toBeInTheDocument();
  });
});
