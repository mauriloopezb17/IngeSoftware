import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

import { api } from '../../mocks/api.js';
import { server } from '../../mocks/server.js';
import { clienteHttp } from '../../services/clienteHttp.js';
import { reiniciarMocksAdmin } from '../mocks/handlers.js';
import { CONTRASENA_DESARROLLO } from '../mocks/usuarios.js';
import { SesionProvider } from '../sesion/SesionProvider.jsx';
import Multimedia from './Multimedia.jsx';

function montar() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <SesionProvider>
        <MemoryRouter initialEntries={['/admin/multimedia']}>
          <Multimedia />
        </MemoryRouter>
      </SesionProvider>
    </QueryClientProvider>,
  );
}

// Inicia sesión con el rol indicado, abre la biblioteca y la vista previa del archivo.
async function abrir(rol, nombreArchivo) {
  await clienteHttp.post('/auth/login', { correo: `${rol}@parroquia.test`, contrasena: CONTRASENA_DESARROLLO });
  montar();
  const lista = within(await screen.findByRole('list', { name: 'Archivos' }));
  await userEvent.click(lista.getByRole('button', { name: new RegExp(nombreArchivo.replace('.', '\\.')) }));
  return screen.findByRole('dialog', { name: nombreArchivo });
}

const tarjeta = (nombre) =>
  within(screen.getByRole('list', { name: 'Archivos' })).getByRole('button', { name: new RegExp(nombre.replace('.', '\\.')) });

const error = (estado, codigo, mensaje, detalles = []) =>
  HttpResponse.json({ error: { codigo, mensaje, detalles } }, { status: estado });

describe('edición y eliminación de archivos', () => {
  beforeEach(reiniciarMocksAdmin);
  afterEach(reiniciarMocksAdmin);

  describe('texto alternativo', () => {
    it('se edita desde la vista previa y la biblioteca se actualiza', async () => {
      const dialogo = await abrir('marketing', 'catequesis-confirmacion.png');
      const usuario = userEvent.setup();
      expect(dialogo).toHaveTextContent('Sin texto alternativo: es necesario para publicar la imagen');

      await usuario.click(within(dialogo).getByRole('button', { name: 'Editar texto alternativo' }));
      const campo = within(dialogo).getByLabelText('Texto alternativo');
      expect(campo).toHaveFocus();
      await usuario.type(campo, 'Catequesis de confirmación en el salón parroquial');
      await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar' }));

      expect(await within(dialogo).findByText('Catequesis de confirmación en el salón parroquial')).toBeInTheDocument();
      expect(within(dialogo).queryByLabelText('Texto alternativo')).not.toBeInTheDocument();
      expect(within(dialogo).getByRole('img')).toHaveAccessibleName('Catequesis de confirmación en el salón parroquial');
      expect(within(dialogo).getByRole('button', { name: 'Editar texto alternativo' })).toHaveFocus();

      // La tarjeta ya no avisa de que falta el texto.
      await waitFor(() => expect(tarjeta('catequesis-confirmacion.png')).not.toHaveTextContent('Sin texto alternativo'));
    });

    it('cancelar deja el texto como estaba y devuelve el foco al botón', async () => {
      const dialogo = await abrir('marketing', 'primeras comuniones 2026.webp');
      const usuario = userEvent.setup();

      await usuario.click(within(dialogo).getByRole('button', { name: 'Editar texto alternativo' }));
      await usuario.type(within(dialogo).getByLabelText('Texto alternativo'), ' (cambio descartado)');
      await usuario.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));

      expect(within(dialogo).getByText('Niños de primera comunión frente al altar')).toBeInTheDocument();
      expect(within(dialogo).getByRole('button', { name: 'Editar texto alternativo' })).toHaveFocus();
    });

    it('dejarlo vacío borra el texto alternativo', async () => {
      const dialogo = await abrir('secretaria', 'primeras comuniones 2026.webp');
      const usuario = userEvent.setup();

      await usuario.click(within(dialogo).getByRole('button', { name: 'Editar texto alternativo' }));
      await usuario.clear(within(dialogo).getByLabelText('Texto alternativo'));
      await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar' }));

      expect(await within(dialogo).findByText(/Sin texto alternativo: es necesario/)).toBeInTheDocument();
    });

    it('si no hay cambios no llama a la API', async () => {
      let llamadas = 0;
      server.use(
        http.patch(api('/admin/multimedia/:id'), () => {
          llamadas++;
          return error(500, 'ERROR_INTERNO', 'No debería llamarse.');
        }),
      );
      const dialogo = await abrir('marketing', 'primeras comuniones 2026.webp');
      const usuario = userEvent.setup();

      await usuario.click(within(dialogo).getByRole('button', { name: 'Editar texto alternativo' }));
      await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar' }));

      expect(within(dialogo).queryByLabelText('Texto alternativo')).not.toBeInTheDocument();
      expect(llamadas).toBe(0);
    });

    it('limita el texto a 255 caracteres y lo indica', async () => {
      const dialogo = await abrir('marketing', 'catequesis-confirmacion.png');
      const usuario = userEvent.setup();

      await usuario.click(within(dialogo).getByRole('button', { name: 'Editar texto alternativo' }));
      const campo = within(dialogo).getByLabelText('Texto alternativo');
      expect(campo).toHaveAttribute('maxlength', '255');
      await usuario.click(campo);
      await usuario.paste('a'.repeat(300));

      expect(campo).toHaveValue('a'.repeat(255));
      expect(within(dialogo).getByText('255/255')).toBeInTheDocument();
    });

    it('muestra el error de validación del servidor asociado al campo', async () => {
      server.use(
        http.patch(api('/admin/multimedia/:id'), () =>
          error(400, 'VALIDACION', 'Los datos enviados no son válidos.', [
            { campo: 'textoAlternativo', mensaje: 'El texto alternativo no es válido.' },
          ]),
        ),
      );
      const dialogo = await abrir('marketing', 'catequesis-confirmacion.png');
      const usuario = userEvent.setup();

      await usuario.click(within(dialogo).getByRole('button', { name: 'Editar texto alternativo' }));
      await usuario.type(within(dialogo).getByLabelText('Texto alternativo'), 'Algo');
      await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar' }));

      const campo = await within(dialogo).findByLabelText('Texto alternativo');
      await waitFor(() => expect(campo).toBeInvalid());
      expect(campo).toHaveAccessibleDescription(/El texto alternativo no es válido\./);
      expect(campo).toHaveValue('Algo'); // no se pierde lo escrito
    });

    it('muestra otros errores del servidor (por ejemplo, 404) y permite seguir editando', async () => {
      server.use(http.patch(api('/admin/multimedia/:id'), () => error(404, 'NO_ENCONTRADO', 'El archivo no existe.')));
      const dialogo = await abrir('marketing', 'catequesis-confirmacion.png');
      const usuario = userEvent.setup();

      await usuario.click(within(dialogo).getByRole('button', { name: 'Editar texto alternativo' }));
      await usuario.type(within(dialogo).getByLabelText('Texto alternativo'), 'Algo');
      await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar' }));

      expect(await within(dialogo).findByRole('alert')).toHaveTextContent('El archivo no existe.');
      expect(within(dialogo).getByRole('button', { name: 'Guardar' })).toBeEnabled();
    });
  });

  describe('eliminar', () => {
    it('pide confirmación, elimina el archivo, avisa y devuelve el foco al título', async () => {
      const dialogo = await abrir('admin', 'procesion-semana-santa.jpg');
      const usuario = userEvent.setup();
      expect(await screen.findByText('14 archivos')).toBeInTheDocument();

      await usuario.click(within(dialogo).getByRole('button', { name: 'Eliminar archivo' }));
      const confirmacion = await screen.findByRole('dialog', { name: '¿Eliminar «procesion-semana-santa.jpg»?' });
      expect(confirmacion).toHaveTextContent('Esta acción no se puede deshacer.');
      await usuario.click(within(confirmacion).getByRole('button', { name: 'Eliminar' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(screen.getByText('Se eliminó «procesion-semana-santa.jpg».')).toBeInTheDocument();
      expect(await screen.findByText('13 archivos')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /procesion-semana-santa\.jpg/ })).not.toBeInTheDocument();
      await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Multimedia' })).toHaveFocus());
    });

    it('cancelar la confirmación no elimina nada y deja abierta la vista previa', async () => {
      const dialogo = await abrir('admin', 'procesion-semana-santa.jpg');
      const usuario = userEvent.setup();
      const eliminar = within(dialogo).getByRole('button', { name: 'Eliminar archivo' });

      await usuario.click(eliminar);
      await usuario.click(within(await screen.findByRole('dialog', { name: /¿Eliminar/ })).getByRole('button', { name: 'Cancelar' }));

      expect(screen.queryByRole('dialog', { name: /¿Eliminar/ })).not.toBeInTheDocument();
      expect(screen.getByRole('dialog', { name: 'procesion-semana-santa.jpg' })).toBeInTheDocument();
      expect(eliminar).toHaveFocus();
      expect(screen.getByText('14 archivos')).toBeInTheDocument();
    });

    it('Escape cierra solo la confirmación, no la vista previa', async () => {
      const dialogo = await abrir('admin', 'procesion-semana-santa.jpg');
      const usuario = userEvent.setup();

      await usuario.click(within(dialogo).getByRole('button', { name: 'Eliminar archivo' }));
      await screen.findByRole('dialog', { name: /¿Eliminar/ });
      await usuario.keyboard('{Escape}');

      expect(screen.queryByRole('dialog', { name: /¿Eliminar/ })).not.toBeInTheDocument();
      expect(screen.getByRole('dialog', { name: 'procesion-semana-santa.jpg' })).toBeInTheDocument();
    });

    it('un archivo en uso no se puede eliminar y se explica por qué', async () => {
      const dialogo = await abrir('admin', 'primeras comuniones 2026.webp');

      const boton = within(dialogo).getByRole('button', { name: 'Eliminar archivo' });
      expect(boton).toBeDisabled();
      expect(boton).toHaveAccessibleDescription('Este archivo está en uso y no se puede eliminar.');
    });

    it('fuera del Administrador, solo se eliminan los archivos propios', async () => {
      // El archivo 10 lo subió Secretaría.
      const ajeno = await abrir('marketing', 'catequesis-confirmacion.png');

      const boton = within(ajeno).getByRole('button', { name: 'Eliminar archivo' });
      expect(boton).toBeDisabled();
      expect(boton).toHaveAccessibleDescription('Solo puedes eliminar los archivos que subiste.');
    });

    it('un rol sí puede eliminar lo que él mismo subió', async () => {
      // El archivo 9 lo subió Marketing.
      const propio = await abrir('marketing', 'procesion-semana-santa.jpg');

      expect(within(propio).getByRole('button', { name: 'Eliminar archivo' })).toBeEnabled();
    });

    it('el Administrador puede eliminar archivos de otros usuarios', async () => {
      const ajeno = await abrir('admin', 'catequesis-confirmacion.png');

      expect(within(ajeno).getByRole('button', { name: 'Eliminar archivo' })).toBeEnabled();
    });

    it('si el servidor responde 409, muestra el motivo y no cierra nada', async () => {
      // Pasó a estar en uso después de cargar la lista.
      server.use(
        http.delete(api('/admin/multimedia/:id'), () =>
          error(409, 'CONFLICTO', 'El archivo está en uso y no se puede eliminar.', [
            { campo: 'id', mensaje: 'Usado como portada de la publicación «Procesión de Semana Santa».' },
          ]),
        ),
      );
      const dialogo = await abrir('admin', 'procesion-semana-santa.jpg');
      const usuario = userEvent.setup();

      await usuario.click(within(dialogo).getByRole('button', { name: 'Eliminar archivo' }));
      const confirmacion = await screen.findByRole('dialog', { name: /¿Eliminar/ });
      await usuario.click(within(confirmacion).getByRole('button', { name: 'Eliminar' }));

      const alerta = await within(confirmacion).findByRole('alert');
      expect(alerta).toHaveTextContent('El archivo está en uso y no se puede eliminar.');
      expect(alerta).toHaveTextContent('Usado como portada de la publicación «Procesión de Semana Santa».');
      expect(screen.getByRole('dialog', { name: 'procesion-semana-santa.jpg' })).toBeInTheDocument();
      expect(screen.queryByText(/Se eliminó/)).not.toBeInTheDocument();
    });

    it('si el servidor responde 403, muestra su mensaje', async () => {
      server.use(
        http.delete(api('/admin/multimedia/:id'), () => error(403, 'SIN_PERMISO', 'Solo puedes eliminar los archivos que subiste.')),
      );
      const dialogo = await abrir('admin', 'procesion-semana-santa.jpg');
      const usuario = userEvent.setup();

      await usuario.click(within(dialogo).getByRole('button', { name: 'Eliminar archivo' }));
      const confirmacion = await screen.findByRole('dialog', { name: /¿Eliminar/ });
      await usuario.click(within(confirmacion).getByRole('button', { name: 'Eliminar' }));

      expect(await within(confirmacion).findByRole('alert')).toHaveTextContent('Solo puedes eliminar los archivos que subiste.');
    });
  });
});
