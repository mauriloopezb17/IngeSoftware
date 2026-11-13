import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router';

import { api } from '../../mocks/api.js';
import { server } from '../../mocks/server.js';
import { clienteHttp } from '../../services/clienteHttp.js';
import { crearQueryClient } from '../../services/queryClient.js';
import { reiniciarMocksAdmin } from '../mocks/handlers.js';
import { CONTRASENA_DESARROLLO } from '../mocks/usuarios.js';
import { useSesion } from '../sesion/SesionContexto.js';
import { SesionProvider } from '../sesion/SesionProvider.jsx';
import { prepararEditorEnJsdom } from './apoyoPruebas.js';
import Publicaciones from './Publicaciones.jsx';

const entrar = (usuario) =>
  clienteHttp.post('/auth/login', { correo: `${usuario}@parroquia.test`, contrasena: CONTRASENA_DESARROLLO });
const leer = async (id) => (await clienteHttp.get(`/admin/publicaciones/${id}`)).datos;

function Ubicacion() {
  const { pathname } = useLocation();
  return <p data-testid="ubicacion">{pathname}</p>;
}

// Como en el panel real, las pantallas se montan cuando ya hay sesión.
function ConSesion({ children }) {
  const { cargando } = useSesion();
  return cargando ? null : children;
}

// useBlocker exige un enrutador de datos, igual que la aplicación (createBrowserRouter).
function montar(entrada) {
  const router = createMemoryRouter(
    [
      {
        path: '/admin/publicaciones/*',
        element: (
          <>
            <Publicaciones />
            <Ubicacion />
          </>
        ),
      },
    ],
    { initialEntries: [entrada] },
  );
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

// La primera prueba descarga BlockNote en frío (React.lazy) y monta el editor real: con toda la suite en
// paralelo puede tardar varios segundos.
vi.setConfig({ testTimeout: 30000 });
const esperar = { timeout: 15000 };
// El editor es BlockNote real: se descarga con React.lazy y se monta en jsdom.
const esperarEditor = () => screen.findByRole('group', { name: 'Contenido de la publicación' }, esperar);

describe('formulario de publicación', () => {
  beforeAll(prepararEditorEnJsdom);
  beforeEach(reiniciarMocksAdmin);
  afterEach(reiniciarMocksAdmin);

  describe('nueva publicación', () => {
    it('carga el editor de forma diferida y las categorías del catálogo', async () => {
      await entrar('marketing');
      montar('/admin/publicaciones/nueva');

      expect(await screen.findByRole('heading', { level: 1, name: 'Nueva publicación' })).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Cargando el editor…');
      await esperarEditor();

      const categoria = screen.getByRole('combobox', { name: 'Categoría' });
      await within(categoria).findByRole('option', { name: 'Sacramentos' });
      expect(within(categoria).getAllByRole('option').map((o) => o.textContent)).toEqual([
        'Sin categoría',
        'Sacramentos',
        'Comunidad',
        'Pasionistas',
        'Pastoral Familiar',
      ]);
      expect(screen.getByRole('combobox', { name: 'Tipo' })).toBeEnabled();
    });

    it('guarda un borrador con el envoltorio BlockNote y abre su edición', async () => {
      await entrar('marketing');
      const router = montar('/admin/publicaciones/nueva');
      await esperarEditor();

      await userEvent.type(screen.getByRole('textbox', { name: /Título/ }), 'Misa de Navidad');
      await userEvent.type(screen.getByRole('textbox', { name: 'Resumen' }), 'Horarios de las misas de Navidad.');
      await userEvent.selectOptions(await screen.findByRole('combobox', { name: 'Categoría' }), 'Comunidad');
      await userEvent.click(screen.getByRole('checkbox', { name: 'Destacada en el portal' }));
      await userEvent.click(screen.getByRole('button', { name: 'Guardar borrador' }));

      await screen.findByRole('heading', { level: 1, name: 'Editar publicación' }, esperar);
      expect(router.state.location.pathname).toBe('/admin/publicaciones/12/editar');
      expect(await screen.findByRole('status')).toHaveTextContent('Borrador guardado.');

      const guardada = await leer(12);
      expect(guardada).toMatchObject({
        titulo: 'Misa de Navidad',
        resumen: 'Horarios de las misas de Navidad.',
        categoria: { nombre: 'Comunidad' },
        destacada: true,
        tipo: { codigo: 'NOTICIA' },
        estado: { codigo: 'BORRADOR' },
        autor: { id: 4 },
      });
      // Exactamente el envoltorio del contrato: lo que entrega editor.document.
      expect(guardada.contenido).toMatchObject({ formato: 'blocknote', version: 1 });
      expect(Array.isArray(guardada.contenido.bloques)).toBe(true);
    });

    it('permite crear una nota de prensa', async () => {
      await entrar('parroco');
      montar('/admin/publicaciones/nueva');
      await esperarEditor();

      await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Tipo' }), 'NOTA_DE_PRENSA');
      await userEvent.type(screen.getByRole('textbox', { name: /Título/ }), 'Comunicado oficial');
      await userEvent.click(screen.getByRole('button', { name: 'Guardar borrador' }));

      await screen.findByRole('heading', { name: 'Editar publicación' }, esperar);
      expect((await leer(12)).tipo.codigo).toBe('NOTA_DE_PRENSA');
    });

    it('con un título muy corto avisa sin enviar nada', async () => {
      await entrar('marketing');
      montar('/admin/publicaciones/nueva');
      await esperarEditor();

      await userEvent.type(screen.getByRole('textbox', { name: /Título/ }), 'ab');
      await userEvent.click(screen.getByRole('button', { name: 'Guardar borrador' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('El título debe tener entre 3 y 200 caracteres.');
      expect(screen.getByRole('textbox', { name: /Título/ })).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByTestId('ubicacion')).toHaveTextContent('/admin/publicaciones/nueva');
      expect((await clienteHttp.get('/admin/publicaciones')).paginacion.total).toBe(11);
    });

    it('valida la expiración y el enlace externo antes de enviar', async () => {
      await entrar('marketing');
      montar('/admin/publicaciones/nueva');
      await esperarEditor();

      await userEvent.type(screen.getByRole('textbox', { name: /Título/ }), 'Título válido');
      await userEvent.type(screen.getByLabelText('Enlace externo (opcional)'), 'http://sin-https.com');
      await userEvent.type(screen.getByLabelText('Fecha de publicación'), '2026-12-10T08:00');
      await userEvent.type(screen.getByLabelText('Fecha de expiración (opcional)'), '2026-12-01T08:00');
      await userEvent.click(screen.getByRole('button', { name: 'Guardar borrador' }));

      const alerta = await screen.findByRole('alert');
      expect(alerta).toHaveTextContent('Debe ser una URL que empiece con https://.');
      expect(alerta).toHaveTextContent('La expiración debe ser posterior a la fecha de publicación.');
    });

    it('muestra los errores 400 de la API junto a su campo y en el resumen', async () => {
      await entrar('marketing');
      server.use(
        http.post(api('/admin/publicaciones'), () =>
          HttpResponse.json(
            {
              error: {
                codigo: 'VALIDACION',
                mensaje: 'Los datos enviados no son válidos.',
                detalles: [
                  { campo: 'imagenPortadaId', mensaje: 'La imagen de portada necesita un texto alternativo.' },
                  { campo: 'contenido.bloques', mensaje: 'Agrega contenido o un enlace externo.' },
                ],
              },
            },
            { status: 400 },
          ),
        ),
      );
      montar('/admin/publicaciones/nueva');
      await esperarEditor();

      await userEvent.type(screen.getByRole('textbox', { name: /Título/ }), 'Título válido');
      await userEvent.click(screen.getByRole('button', { name: 'Guardar borrador' }));

      const alerta = await screen.findByRole('alert');
      expect(alerta).toHaveTextContent('La imagen de portada necesita un texto alternativo.');
      expect(alerta).toHaveTextContent('Agrega contenido o un enlace externo.');
      expect(screen.getByRole('group', { name: 'Contenido' })).toHaveAccessibleDescription('Agrega contenido o un enlace externo.');
    });

    it('elige la imagen de portada de la biblioteca y permite quitarla', async () => {
      await entrar('marketing');
      montar('/admin/publicaciones/nueva');
      await esperarEditor();

      await userEvent.click(screen.getByRole('button', { name: 'Elegir imagen' }));
      const dialogo = await screen.findByRole('dialog', { name: 'Imagen de portada' });
      await within(dialogo).findByRole('list', { name: 'Imágenes' });
      // La biblioteca va de lo más reciente a lo más antiguo: se busca la imagen del seed.
      await userEvent.type(within(dialogo).getByRole('searchbox', { name: 'Buscar imagen' }), 'exterior');
      await userEvent.click(await within(dialogo).findByRole('button', { name: /exterior-parroquia\.webp/ }, esperar));
      await userEvent.click(within(dialogo).getByRole('button', { name: 'Usar esta imagen' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByRole('img', { name: 'Vista exterior de la Parroquia Señor de la Exaltación' })).toBeInTheDocument();

      await userEvent.type(screen.getByRole('textbox', { name: /Título/ }), 'Con portada');
      await userEvent.click(screen.getByRole('button', { name: 'Guardar borrador' }));
      await screen.findByRole('heading', { name: 'Editar publicación' }, esperar);
      expect((await leer(12)).imagenPortada).toMatchObject({ id: 1 });

      await userEvent.click(await screen.findByRole('button', { name: 'Quitar imagen' }));
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
      expect(screen.getByText('Sin imagen de portada.')).toBeInTheDocument();
    });

    it('Secretaría no puede crear noticias: ve «sin permiso»', async () => {
      await entrar('secretaria');
      montar('/admin/publicaciones/nueva');

      expect(await screen.findByRole('heading', { name: 'Sin permiso' })).toBeInTheDocument();
    });
  });

  describe('editar una publicación', () => {
    it('Marketing edita su borrador: el formulario viene con sus datos y el contenido en el editor', async () => {
      await entrar('marketing');
      montar('/admin/publicaciones/4/editar');

      expect(await screen.findByRole('heading', { level: 1, name: 'Editar publicación' })).toBeInTheDocument();
      expect(await screen.findByRole('textbox', { name: /Título/ })).toHaveValue('Retiro de Adviento: inscripciones abiertas');
      expect(screen.getByRole('textbox', { name: 'Resumen' })).toHaveValue(
        'Un fin de semana de oración y silencio para preparar la Navidad.',
      );
      expect(screen.getByRole('combobox', { name: 'Tipo' })).toBeDisabled();
      expect(await screen.findByRole('combobox', { name: 'Categoría' })).toHaveValue('2');
      await esperarEditor();
      expect(await screen.findByText('Abrimos las inscripciones para el retiro de Adviento.', {}, esperar)).toBeInTheDocument();
    });

    it('guarda los cambios sin cambiar de pantalla', async () => {
      await entrar('marketing');
      montar('/admin/publicaciones/4/editar');
      await esperarEditor();

      const titulo = screen.getByRole('textbox', { name: /Título/ });
      await userEvent.clear(titulo);
      await userEvent.type(titulo, 'Retiro de Adviento 2026');
      await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

      expect(await screen.findByText('Cambios guardados.', {}, esperar)).toBeInTheDocument();
      expect(screen.getByTestId('ubicacion')).toHaveTextContent('/admin/publicaciones/4/editar');
      expect((await leer(4)).titulo).toBe('Retiro de Adviento 2026');
      expect(screen.queryByText('Hay cambios sin guardar.')).not.toBeInTheDocument();
    });

    it('el Párroco corrige una publicación en revisión sin cambiar su estado', async () => {
      await entrar('parroco');
      montar('/admin/publicaciones/7/editar');
      await esperarEditor();

      const resumen = screen.getByRole('textbox', { name: 'Resumen' });
      await userEvent.clear(resumen);
      await userEvent.type(resumen, 'Resumen corregido.');
      await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

      expect(await screen.findByText('Cambios guardados.', {}, esperar)).toBeInTheDocument();
      expect(await leer(7)).toMatchObject({ resumen: 'Resumen corregido.', estado: { codigo: 'EN_REVISION' } });
    });

    it.each([
      ['marketing', 7, /Está en revisión/],
      ['marketing', 11, /Solo puedes editar tus propios borradores/],
      ['parroco', 10, /Está archivada\. Restáurala/],
    ])('%s no puede editar la publicación %i: lo explica en lugar de mostrar el formulario', async (usuario, id, motivo) => {
      await entrar(usuario);
      montar(`/admin/publicaciones/${id}/editar`);

      expect(await screen.findByRole('heading', { name: 'No se puede editar' })).toBeInTheDocument();
      expect(screen.getByText(motivo)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Volver a publicaciones' })).toBeInTheDocument();
    });

    it('una publicación inexistente o un id inválido muestran «página no encontrada»', async () => {
      await entrar('parroco');
      montar('/admin/publicaciones/999/editar');
      expect(await screen.findByRole('heading', { name: 'Página no encontrada' })).toBeInTheDocument();
    });

    it('un id que no es un número muestra «página no encontrada»', async () => {
      await entrar('parroco');
      montar('/admin/publicaciones/abc/editar');
      expect(await screen.findByRole('heading', { name: 'Página no encontrada' })).toBeInTheDocument();
    });
  });

  describe('enviar a revisión (Marketing)', () => {
    async function elegirPortada() {
      await userEvent.click(screen.getByRole('button', { name: 'Elegir imagen' }));
      const dialogo = await screen.findByRole('dialog', { name: 'Imagen de portada' });
      await within(dialogo).findByRole('list', { name: 'Imágenes' });
      await userEvent.type(within(dialogo).getByRole('searchbox', { name: 'Buscar imagen' }), 'exterior');
      await userEvent.click(await within(dialogo).findByRole('button', { name: /exterior-parroquia\.webp/ }, esperar));
      await userEvent.click(within(dialogo).getByRole('button', { name: 'Usar esta imagen' }));
    }

    it('guarda lo que hay en pantalla, envía a revisión y después ya no puede editarla', async () => {
      await entrar('marketing');
      const router = montar('/admin/publicaciones/4/editar');
      await esperarEditor();
      await elegirPortada();

      await userEvent.click(screen.getByRole('button', { name: 'Enviar a revisión' }));
      const confirmacion = await screen.findByRole('dialog', { name: 'Enviar a revisión' });
      expect(confirmacion).toHaveTextContent('Mientras esté en revisión no podrás editarla.');
      expect(confirmacion).toHaveTextContent('Se guardarán antes los cambios');
      // Aún no se envió nada.
      expect((await leer(4)).estado.codigo).toBe('BORRADOR');

      await userEvent.click(within(confirmacion).getByRole('button', { name: 'Enviar a revisión' }));

      await waitFor(() => expect(router.state.location.pathname).toBe('/admin/publicaciones'), esperar);
      expect(await screen.findByRole('status')).toHaveTextContent(
        '«Retiro de Adviento: inscripciones abiertas» se envió a revisión.',
      );
      const enviada = await leer(4);
      expect(enviada.estado.codigo).toBe('EN_REVISION');
      expect(enviada.imagenPortada).toMatchObject({ id: 1 });

      await router.navigate('/admin/publicaciones/4/editar');
      expect(await screen.findByRole('heading', { name: 'No se puede editar' })).toBeInTheDocument();
      expect(screen.getByText(/Está en revisión/)).toBeInTheDocument();
    });

    it('si la publicación no está lista, la API responde 400 y sigue en borrador', async () => {
      await entrar('marketing');
      const router = montar('/admin/publicaciones/4/editar');
      await esperarEditor();

      // Una expiración ya pasada: el borrador se guarda, pero no está lista para salir de borrador.
      await userEvent.type(screen.getByLabelText('Fecha de expiración (opcional)'), '2026-01-01T08:00');
      await userEvent.click(screen.getByRole('button', { name: 'Enviar a revisión' }));
      await userEvent.click(
        within(await screen.findByRole('dialog', { name: 'Enviar a revisión' })).getByRole('button', {
          name: 'Enviar a revisión',
        }),
      );

      const alerta = await screen.findByRole('alert', {}, esperar);
      expect(alerta).toHaveTextContent('La expiración debe ser posterior a la fecha de publicación y a este momento.');
      expect(screen.getByLabelText('Fecha de expiración (opcional)')).toHaveAttribute('aria-invalid', 'true');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(router.state.location.pathname).toBe('/admin/publicaciones/4/editar');
      expect((await leer(4)).estado.codigo).toBe('BORRADOR');
    });

    it('valida el título antes de pedir confirmación', async () => {
      await entrar('marketing');
      montar('/admin/publicaciones/4/editar');
      await esperarEditor();

      await userEvent.clear(screen.getByRole('textbox', { name: /Título/ }));
      await userEvent.type(screen.getByRole('textbox', { name: /Título/ }), 'ab');
      await userEvent.click(screen.getByRole('button', { name: 'Enviar a revisión' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('El título debe tener entre 3 y 200 caracteres.');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('cancelar la confirmación no envía nada', async () => {
      await entrar('marketing');
      montar('/admin/publicaciones/4/editar');
      await esperarEditor();

      await userEvent.click(screen.getByRole('button', { name: 'Enviar a revisión' }));
      await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancelar' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect((await leer(4)).estado.codigo).toBe('BORRADOR');
    });

    it('el Párroco no ve el botón: él publica directamente (acciones de la API)', async () => {
      await entrar('parroco');
      montar('/admin/publicaciones/11/editar');
      await esperarEditor();

      expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Enviar a revisión' })).not.toBeInTheDocument();
    });

    it('Marketing no puede editar una publicación en revisión', async () => {
      await entrar('marketing');
      montar('/admin/publicaciones/6/editar');

      expect(await screen.findByRole('heading', { name: 'No se puede editar' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Enviar a revisión' })).not.toBeInTheDocument();
    });
  });

  describe('observación de una revisión rechazada', () => {
    it('el autor ve la observación del Párroco en su borrador', async () => {
      await entrar('marketing');
      montar('/admin/publicaciones/5/editar');

      const nota = await screen.findByRole('region', { name: 'Observación de la revisión' });
      expect(nota).toHaveTextContent('Agregar el nombre de la parroquia anfitriona y una foto del encuentro.');
      expect(nota).toHaveTextContent('Párroco (desarrollo)');
    });

    it('un borrador que nunca se revisó no muestra ninguna observación', async () => {
      await entrar('marketing');
      montar('/admin/publicaciones/4/editar');
      await screen.findByRole('heading', { level: 1, name: 'Editar publicación' });

      expect(screen.queryByRole('region', { name: 'Observación de la revisión' })).not.toBeInTheDocument();
    });
  });

  describe('vista previa', () => {
    it('muestra el borrador actual (aunque no esté guardado): título, categoría, fechas y contenido en solo lectura', async () => {
      await entrar('marketing');
      montar('/admin/publicaciones/4/editar');
      await esperarEditor();
      await screen.findByText('Abrimos las inscripciones para el retiro de Adviento.', {}, esperar);

      // Un cambio sin guardar también aparece en la vista previa.
      await userEvent.type(screen.getByRole('textbox', { name: /Título/ }), ' (nuevo)');
      await userEvent.type(screen.getByLabelText('Fecha de publicación'), '2026-12-10T08:00');
      await userEvent.click(screen.getByRole('button', { name: 'Vista previa' }));

      const previa = await screen.findByRole('dialog', { name: 'Vista previa' });
      expect(within(within(previa).getByRole('article')).getByRole('heading', { level: 2 })).toHaveTextContent('Retiro de Adviento: inscripciones abiertas (nuevo)');
      expect(within(previa).getByText('Comunidad')).toBeInTheDocument();
      expect(within(previa).getByText('Noticia')).toBeInTheDocument();
      expect(within(previa).getByText('10/12/2026 08:00')).toBeInTheDocument();
      expect(within(previa).queryByRole('img')).not.toBeInTheDocument();
      const contenido = await within(previa).findByTestId('contenido-solo-lectura', {}, esperar);
      expect(within(contenido).getByText('Abrimos las inscripciones para el retiro de Adviento.')).toBeInTheDocument();
      expect(within(contenido).queryByRole('textbox')).not.toHaveAttribute('contenteditable', 'true');
      // No guardó nada.
      expect((await leer(4)).titulo).toBe('Retiro de Adviento: inscripciones abiertas');

      await userEvent.click(within(previa).getByRole('button', { name: 'Cerrar vista previa' }));
      expect(screen.queryByRole('dialog', { name: 'Vista previa' })).not.toBeInTheDocument();
    });

    it('muestra la imagen de portada con su texto alternativo', async () => {
      await entrar('parroco');
      montar('/admin/publicaciones/7/editar');
      await esperarEditor();

      await userEvent.click(screen.getByRole('button', { name: 'Vista previa' }));

      const previa = await screen.findByRole('dialog', { name: 'Vista previa' });
      expect(within(previa).getByRole('img')).toHaveAccessibleName(expect.stringMatching(/\S/));
    });

    it('en una publicación nueva y vacía avisa que falta el título y el contenido', async () => {
      await entrar('marketing');
      montar('/admin/publicaciones/nueva');
      await esperarEditor();

      await userEvent.click(screen.getByRole('button', { name: 'Vista previa' }));

      const previa = await screen.findByRole('dialog', { name: 'Vista previa' });
      expect(within(previa).getByText('(Sin título)')).toBeInTheDocument();
      expect(within(previa).getByText('se fijará al publicar')).toBeInTheDocument();
      expect(within(previa).getByText('Esta publicación todavía no tiene contenido.')).toBeInTheDocument();
    });
  });

  describe('cambios sin guardar', () => {
    it('sin cambios, salir de la pantalla no pregunta nada', async () => {
      await entrar('marketing');
      const router = montar('/admin/publicaciones/4/editar');
      await esperarEditor();

      await userEvent.click(screen.getByRole('link', { name: 'Volver a publicaciones' }));

      await waitFor(() => expect(router.state.location.pathname).toBe('/admin/publicaciones'));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('con cambios, pide confirmación: «Seguir editando» se queda y «Salir sin guardar» sale', async () => {
      await entrar('marketing');
      const router = montar('/admin/publicaciones/4/editar');
      await esperarEditor();

      await userEvent.type(screen.getByRole('textbox', { name: /Título/ }), ' (borrador)');
      expect(screen.getByText('Hay cambios sin guardar.')).toBeInTheDocument();
      await userEvent.click(screen.getByRole('link', { name: 'Volver a publicaciones' }));

      const dialogo = await screen.findByRole('dialog', { name: 'Hay cambios sin guardar' });
      await userEvent.click(within(dialogo).getByRole('button', { name: 'Seguir editando' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(router.state.location.pathname).toBe('/admin/publicaciones/4/editar');
      expect(screen.getByRole('textbox', { name: /Título/ })).toHaveValue('Retiro de Adviento: inscripciones abiertas (borrador)');

      await userEvent.click(screen.getByRole('link', { name: 'Volver a publicaciones' }));
      await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Salir sin guardar' }));

      await waitFor(() => expect(router.state.location.pathname).toBe('/admin/publicaciones'));
      expect((await leer(4)).titulo).toBe('Retiro de Adviento: inscripciones abiertas'); // no se guardó
    });

    it('después de guardar ya no hay cambios pendientes y se puede salir', async () => {
      await entrar('marketing');
      const router = montar('/admin/publicaciones/4/editar');
      await esperarEditor();

      await userEvent.type(screen.getByRole('textbox', { name: /Título/ }), ' 2026');
      await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
      await screen.findByText('Cambios guardados.', {}, esperar);

      await userEvent.click(screen.getByRole('link', { name: 'Volver a publicaciones' }));
      await waitFor(() => expect(router.state.location.pathname).toBe('/admin/publicaciones'));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
