import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { clienteHttp } from '../../../services/clienteHttp.js';
import { crearQueryClient } from '../../../services/queryClient.js';
import { reiniciarMocksAdmin } from '../../mocks/handlers.js';
import { CONTRASENA_DESARROLLO } from '../../mocks/usuarios.js';
import { prepararEditorEnJsdom } from '../apoyoPruebas.js';
import EditorContenido from './EditorContenido.jsx';

vi.setConfig({ testTimeout: 30000 });
const esperar = { timeout: 15000 };

// Escribe «/imagen» en el documento y confirma la primera opción del menú.
async function insertarImagen() {
  const escritura = await screen.findByRole('textbox', {}, esperar);
  await userEvent.click(escritura);
  await userEvent.keyboard('/imagen');
  await waitFor(() => expect(escritura).toHaveAttribute('aria-expanded', 'true'), esperar);
  await userEvent.keyboard('{Enter}');
}

describe('imágenes en el editor', () => {
  beforeAll(prepararEditorEnJsdom);
  beforeEach(async () => {
    reiniciarMocksAdmin();
    await clienteHttp.post('/auth/login', { correo: 'marketing@parroquia.test', contrasena: CONTRASENA_DESARROLLO });
  });

  it('el panel del bloque imagen permite subir o elegir de la biblioteca, pero no pegar un enlace externo', async () => {
    const alCambiar = vi.fn();
    render(
      <QueryClientProvider client={crearQueryClient()}>
        <EditorContenido alCambiar={alCambiar} />
      </QueryClientProvider>,
    );

    await insertarImagen();

    expect(await screen.findByText('Biblioteca', {}, esperar)).toBeInTheDocument();
    expect(screen.getByText('Subir')).toBeInTheDocument();
    expect(screen.queryByText('Incrustar')).not.toBeInTheDocument();
  });

  it('elegir una imagen de la biblioteca llena el bloque con su url, nombre y texto alternativo', async () => {
    const alCambiar = vi.fn();
    render(
      <QueryClientProvider client={crearQueryClient()}>
        <EditorContenido alCambiar={alCambiar} />
      </QueryClientProvider>,
    );

    await insertarImagen();
    await userEvent.click(await screen.findByText('Biblioteca', {}, esperar));
    await userEvent.click(await screen.findByText('Elegir de la biblioteca', {}, esperar));

    await userEvent.type(await screen.findByRole('searchbox', { name: 'Buscar imagen' }, esperar), 'exterior');
    await userEvent.click(await screen.findByRole('button', { name: /exterior-parroquia\.webp/ }, esperar));
    await userEvent.click(screen.getByRole('button', { name: 'Usar esta imagen' }));

    const ultimo = alCambiar.mock.calls.at(-1)[0];
    const bloque = ultimo.find((b) => b.type === 'image');
    expect(bloque.props.url).toMatch(/exterior-parroquia\.webp$/);
    expect(bloque.props.name).toBe('exterior-parroquia.webp');
    expect(bloque.props.caption).toEqual(expect.any(String));
  });
});
