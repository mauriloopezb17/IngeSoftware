import { useEffect, useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

import { clienteHttp } from '../../../services/clienteHttp.js';
import { reiniciarMocksAdmin } from '../../mocks/handlers.js';
import { CONTRASENA_DESARROLLO } from '../../mocks/usuarios.js';
import { SesionProvider } from '../../sesion/SesionProvider.jsx';
import { ProveedorToasts } from '../../ui/index.js';
import { reiniciarMocksContenido } from '../mocks/handlers.js';
import Grupos from './Grupos.jsx';

vi.mock('../../publicaciones/editor/EditorContenido.jsx', () => ({
  default: function EditorLigero({ valorInicial, alIniciar, etiqueta = 'Contenido de la página del grupo' }) {
    const iniciado = useRef(false);
    useEffect(() => {
      if (iniciado.current) return;
      iniciado.current = true;
      alIniciar?.(valorInicial?.bloques ?? []);
    }, [alIniciar, valorInicial]);
    return <textarea aria-label={etiqueta} readOnly />;
  },
}));

const entrar = (rol = 'secretaria') =>
  clienteHttp.post('/auth/login', {
    correo: `${rol}@parroquia.test`,
    contrasena: CONTRASENA_DESARROLLO,
  });

function montar() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <ProveedorToasts>
        <SesionProvider>
          <MemoryRouter initialEntries={['/admin/grupos']}>
            <Grupos />
          </MemoryRouter>
        </SesionProvider>
      </ProveedorToasts>
    </QueryClientProvider>,
  );
}

describe('gestión de grupos pastorales', () => {
  beforeEach(() => {
    reiniciarMocksAdmin();
    reiniciarMocksContenido();
  });

  afterEach(() => {
    reiniciarMocksAdmin();
    reiniciarMocksContenido();
  });

  it('crea un grupo pastoral eligiendo ícono e imagen con SelectorImagenes', async () => {
    await entrar('secretaria');
    montar();
    const usuario = userEvent.setup();

    expect(await within(await screen.findByRole('table')).findByText('Monaguillos')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Nuevo grupo' }));

    const dialogo = await screen.findByRole('dialog', { name: 'Nuevo grupo pastoral' });
    await usuario.type(within(dialogo).getByLabelText('Nombre'), 'Pastoral Familiar');
    await usuario.type(within(dialogo).getByLabelText('Horario de reunión (opcional)'), 'Sábados · 17:00');
    await usuario.selectOptions(within(dialogo).getByLabelText('Ícono (opcional)'), 'users');

    await usuario.click(within(dialogo).getByRole('button', { name: 'Elegir imagen' }));
    const selector = await screen.findByRole('dialog', { name: 'Elegir imagen del grupo' });
    const lista = await within(selector).findByRole('list', { name: 'Imágenes' });
    await usuario.click(within(lista).getByRole('button', { name: /pastoral-familiar\.jpg/ }));
    await usuario.click(within(selector).getByRole('button', { name: 'Usar esta imagen' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Elegir imagen del grupo' })).not.toBeInTheDocument(),
    );

    await usuario.click(within(dialogo).getByRole('button', { name: 'Crear grupo' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    expect(screen.getByText('Se creó el grupo «Pastoral Familiar».')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getByText('Pastoral Familiar')).toBeInTheDocument();
  });

  it('edita un grupo pastoral existente con contacto y galería', async () => {
    await entrar('secretaria');
    montar();
    const usuario = userEvent.setup();

    await within(await screen.findByRole('table')).findByText('Monaguillos');
    await usuario.click(screen.getByRole('button', { name: 'Editar «Monaguillos»' }));

    const dialogo = await screen.findByRole('dialog', { name: 'Editar grupo pastoral' });
    const horario = within(dialogo).getByLabelText('Horario de reunión (opcional)');
    await usuario.clear(horario);
    await usuario.type(horario, 'Sábados · 10:30');
    await usuario.type(within(dialogo).getByLabelText('Responsable (opcional)'), 'Juan Pérez (de ejemplo)');
    await usuario.type(within(dialogo).getByLabelText('WhatsApp (opcional)'), '+591 71234567');
    await usuario.type(within(dialogo).getByLabelText('Correo electrónico (opcional)'), 'monaguillos@parroquia.test');

    await usuario.click(within(dialogo).getByRole('button', { name: 'Agregar a la galería' }));
    const selGaleria = await screen.findByRole('dialog', { name: 'Agregar foto o video a la galería' });
    const lista = await within(selGaleria).findByRole('list', { name: 'Archivos disponibles' });
    await usuario.click(within(lista).getByRole('button', { name: /pastoral-familiar\.jpg/ }));
    await usuario.click(within(selGaleria).getByRole('button', { name: 'Agregar a la galería' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Agregar foto o video a la galería' })).not.toBeInTheDocument(),
    );
    expect(within(dialogo).getByText('Galería de fotos y videos (1/24)')).toBeInTheDocument();

    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Se actualizó el grupo «Monaguillos».')).toBeInTheDocument();
    expect(screen.getByText(/Sábados · 10:30/)).toBeInTheDocument();
  });

  it('muestra error de validación (400 VALIDACION) junto al campo', async () => {
    await entrar('secretaria');
    montar();
    const usuario = userEvent.setup();

    await screen.findByRole('table');
    await usuario.click(await screen.findByRole('button', { name: 'Nuevo grupo' }));

    const dialogo = await screen.findByRole('dialog', { name: 'Nuevo grupo pastoral' });
    await usuario.click(within(dialogo).getByRole('button', { name: 'Crear grupo' }));

    const nombre = await within(dialogo).findByLabelText('Nombre');
    await waitFor(() => expect(nombre).toBeInvalid());
    expect(nombre).toHaveAccessibleDescription(/El nombre es obligatorio/);
  });

  it('elimina un grupo pastoral tras confirmación', async () => {
    await entrar('secretaria');
    montar();
    const usuario = userEvent.setup();

    await within(await screen.findByRole('table')).findByText('Catequistas');
    await usuario.click(screen.getByRole('button', { name: 'Eliminar «Catequistas»' }));

    const confirmacion = await screen.findByRole('dialog', { name: '¿Eliminar «Catequistas»?' });
    await usuario.click(within(confirmacion).getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Se eliminó el grupo «Catequistas».')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).queryByText('Catequistas')).not.toBeInTheDocument();
  });

  it('deshabilita el reordenamiento al filtrar grupos', async () => {
    await entrar('secretaria');
    montar();
    const usuario = userEvent.setup();

    await screen.findByRole('table');
    await usuario.selectOptions(screen.getByLabelText('Visibilidad'), 'true');

    expect(
      await screen.findByText(/Para reordenar los grupos, quita los filtros y asegúrate de ver todos en una sola página/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Subir «Monaguillos»' })).not.toBeInTheDocument();
  });

  it('permite a Marketing editar solo la página y el contacto de cada grupo', async () => {
    await entrar('marketing');
    montar();
    const usuario = userEvent.setup();

    expect(await within(await screen.findByRole('table')).findByText('Monaguillos')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nuevo grupo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Eliminar / })).not.toBeInTheDocument();

    const btnEditar = await screen.findByRole('button', { name: 'Editar página de «Monaguillos»' });
    await usuario.click(btnEditar);

    const dialogo = await screen.findByRole('dialog', { name: 'Editar grupo pastoral' });
    expect(within(dialogo).getByLabelText('Nombre')).toBeDisabled();
    expect(within(dialogo).getByLabelText('Enlace (slug)')).toBeDisabled();
    expect(within(dialogo).getByLabelText('Visible en el portal público')).toBeDisabled();

    const resp = within(dialogo).getByLabelText('Responsable (opcional)');
    await usuario.type(resp, 'Carlos López (de ejemplo)');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Se actualizó el grupo «Monaguillos».')).toBeInTheDocument();
  });

  it('advierte si hay cambios sin guardar al intentar cerrar', async () => {
    await entrar('secretaria');
    montar();
    const usuario = userEvent.setup();

    await within(await screen.findByRole('table')).findByText('Monaguillos');
    await usuario.click(screen.getByRole('button', { name: 'Nuevo grupo' }));

    const dialogo = await screen.findByRole('dialog', { name: 'Nuevo grupo pastoral' });
    await usuario.type(within(dialogo).getByLabelText('Nombre'), 'Grupo sin guardar');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));

    const alerta = await screen.findByRole('dialog', { name: 'Hay cambios sin guardar' });
    await usuario.click(within(alerta).getByRole('button', { name: 'Salir sin guardar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
