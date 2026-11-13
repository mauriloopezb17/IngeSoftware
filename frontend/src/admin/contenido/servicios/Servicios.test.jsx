import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

import { clienteHttp } from '../../../services/clienteHttp.js';
import { reiniciarMocksAdmin } from '../../mocks/handlers.js';
import { CONTRASENA_DESARROLLO } from '../../mocks/usuarios.js';
import { SesionProvider } from '../../sesion/SesionProvider.jsx';
import { reiniciarMocksContenido } from '../mocks/handlers.js';
import Servicios from './Servicios.jsx';

const entrar = (rol = 'secretaria') =>
  clienteHttp.post('/auth/login', {
    correo: `${rol}@parroquia.test`,
    contrasena: CONTRASENA_DESARROLLO,
  });

function montar() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <SesionProvider>
        <MemoryRouter initialEntries={['/admin/servicios']}>
          <Servicios />
        </MemoryRouter>
      </SesionProvider>
    </QueryClientProvider>,
  );
}

describe('gestión de servicios y preguntas frecuentes', () => {
  beforeEach(() => {
    reiniciarMocksAdmin();
    reiniciarMocksContenido();
  });

  afterEach(() => {
    reiniciarMocksAdmin();
    reiniciarMocksContenido();
  });

  it('lista los servicios del seed y permite crear uno con requisitos e ícono', async () => {
    await entrar('secretaria');
    montar();
    const usuario = userEvent.setup({ delay: null });

    expect(await screen.findByRole('heading', { level: 2, name: 'Bautismo' })).toBeInTheDocument();
    expect(screen.getByText('2 requisitos · 1 pregunta frecuente')).toBeInTheDocument();
    expect(screen.getByText('1 requisito · 0 preguntas frecuentes')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Nuevo servicio' }));

    const dialogo = await screen.findByRole('dialog', { name: 'Nuevo servicio' });
    await usuario.type(within(dialogo).getByLabelText('Nombre'), 'Dirección espiritual');
    await usuario.type(
      within(dialogo).getByLabelText('Descripción corta'),
      'Acompañamiento pastoral personalizado.',
    );
    await usuario.selectOptions(within(dialogo).getByLabelText('Ícono (opcional)'), 'heart-handshake');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Agregar requisito' }));
    await usuario.type(within(dialogo).getByLabelText('Etiqueta 1'), 'Cita');
    await usuario.type(within(dialogo).getByLabelText('Valor 1'), 'Coordinar en secretaría');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Crear servicio' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Se creó el servicio «Dirección espiritual».')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Dirección espiritual' })).toBeInTheDocument();
  }, 15000);

  it('edita un servicio existente con éxito', async () => {
    await entrar('secretaria');
    montar();
    const usuario = userEvent.setup();

    await screen.findByRole('heading', { level: 2, name: 'Bautismo' });
    await usuario.click(screen.getByRole('button', { name: 'Editar Bautismo' }));

    const dialogo = await screen.findByRole('dialog', { name: 'Editar servicio' });
    const campoNombre = within(dialogo).getByLabelText('Nombre');
    await usuario.clear(campoNombre);
    await usuario.type(campoNombre, 'Sacramento del Bautismo');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Se actualizó el servicio «Sacramento del Bautismo».')).toBeInTheDocument();
  });

  it('muestra errores de validación (400 VALIDACION) junto al campo', async () => {
    await entrar('secretaria');
    montar();
    const usuario = userEvent.setup();

    await screen.findByRole('heading', { level: 2, name: 'Bautismo' });
    await usuario.click(screen.getByRole('button', { name: 'Nuevo servicio' }));

    const dialogo = await screen.findByRole('dialog', { name: 'Nuevo servicio' });
    await usuario.click(within(dialogo).getByRole('button', { name: 'Crear servicio' }));

    const nombre = await within(dialogo).findByLabelText('Nombre');
    await waitFor(() => expect(nombre).toBeInvalid());
    expect(nombre).toHaveAccessibleDescription(/El nombre es obligatorio/);
  });

  it('elimina un servicio con confirmación', async () => {
    await entrar('secretaria');
    montar();
    const usuario = userEvent.setup();

    await screen.findByRole('heading', { level: 2, name: 'Matrimonio' });
    await usuario.click(screen.getByRole('button', { name: 'Eliminar Matrimonio' }));

    const confirmacion = await screen.findByRole('dialog', { name: '¿Eliminar «Matrimonio»?' });
    await usuario.click(within(confirmacion).getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Se eliminó el servicio «Matrimonio».')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: 'Matrimonio' })).not.toBeInTheDocument();
  });

  it('crea, reordena y elimina preguntas frecuentes de un servicio', async () => {
    await entrar('secretaria');
    montar();
    const usuario = userEvent.setup();

    await screen.findByRole('heading', { level: 2, name: 'Bautismo' });
    const lista = screen.getByRole('list', { name: 'Servicios y sacramentos' });
    const itemBautismo = within(lista).getAllByRole('listitem')[0];
    await usuario.click(within(itemBautismo).getByRole('button', { name: 'Preguntas frecuentes' }));

    const dialogo = await screen.findByRole('dialog', { name: 'Preguntas frecuentes · Bautismo' });
    expect(await within(dialogo).findByText('¿Qué requisitos necesito para bautizar a mi hijo?')).toBeInTheDocument();

    await usuario.click(within(dialogo).getByRole('button', { name: 'Nueva pregunta' }));
    await usuario.type(within(dialogo).getByLabelText('Pregunta'), '¿Qué edad máxima tiene el bautismo de niños?');
    await usuario.type(within(dialogo).getByLabelText('Respuesta'), 'Hasta los 7 años.');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Agregar pregunta' }));

    expect(await within(dialogo).findByText('¿Qué edad máxima tiene el bautismo de niños?')).toBeInTheDocument();

    // Reordenar subiendo la segunda pregunta
    await usuario.click(within(dialogo).getByRole('button', { name: 'Subir pregunta 2' }));
    await waitFor(() => {
      const items = within(within(dialogo).getByRole('list', { name: 'Lista de preguntas frecuentes' })).getAllByRole('listitem');
      expect(items[0]).toHaveTextContent('¿Qué edad máxima tiene el bautismo de niños?');
    });

    // Eliminar la primera pregunta
    await usuario.click(within(dialogo).getByRole('button', { name: 'Eliminar pregunta 1' }));
    const confirmacion = await screen.findByRole('dialog', { name: '¿Eliminar pregunta frecuente?' });
    await usuario.click(within(confirmacion).getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => expect(screen.queryByRole('dialog', { name: '¿Eliminar pregunta frecuente?' })).not.toBeInTheDocument());
    expect(within(dialogo).queryByText('¿Qué edad máxima tiene el bautismo de niños?')).not.toBeInTheDocument();
  });

  it('muestra la vista en solo lectura para Marketing', async () => {
    await entrar('marketing');
    montar();

    expect(await screen.findByRole('heading', { level: 2, name: 'Bautismo' })).toBeInTheDocument();
    expect(screen.getByText(/Solo lectura:/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nuevo servicio' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Editar / })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Eliminar / })).not.toBeInTheDocument();
  });
});

