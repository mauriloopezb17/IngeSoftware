import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

import { clienteHttp } from '../../services/clienteHttp.js';
import { crearQueryClient } from '../../services/queryClient.js';
import { reiniciarMocksAdmin } from '../mocks/handlers.js';
import { CONTRASENA_DESARROLLO } from '../mocks/usuarios.js';
import { SesionProvider } from '../sesion/SesionProvider.jsx';
import Boletines from './Boletines.jsx';

const entrar = (usuario) =>
  clienteHttp.post('/auth/login', { correo: `${usuario}@parroquia.test`, contrasena: CONTRASENA_DESARROLLO });

function Ubicacion() {
  const { pathname, search } = useLocation();
  return <p data-testid="ubicacion">{pathname + search}</p>;
}

function montar(entrada = '/admin/boletines') {
  return render(
    <QueryClientProvider client={crearQueryClient()}>
      <SesionProvider>
        <MemoryRouter initialEntries={[entrada]}>
          <Routes>
            <Route path="/admin/boletines/*" element={<Boletines />} />
          </Routes>
          <Ubicacion />
        </MemoryRouter>
      </SesionProvider>
    </QueryClientProvider>,
  );
}

const pdf = (nombre = 'boletin-noviembre.pdf') => new File(['%PDF-1.4 contenido'], nombre, { type: 'application/pdf' });

// Escribe título y mes, y elige un PDF de la biblioteca por su nombre.
async function completar(usuario, { titulo, periodo, archivo }) {
  await usuario.type(await screen.findByLabelText('Título'), titulo);
  fireEvent.change(screen.getByLabelText('Mes del boletín'), { target: { value: periodo } });
  await usuario.click(screen.getByRole('button', { name: 'Elegir PDF' }));
  const dialogo = await screen.findByRole('dialog', { name: 'PDF del boletín' });
  await usuario.click(await within(dialogo).findByRole('button', { name: new RegExp(archivo) }));
}

describe('boletines del panel', () => {
  beforeEach(reiniciarMocksAdmin);
  afterEach(reiniciarMocksAdmin);

  it('lista los boletines con su mes, PDF y quién lo publicó', async () => {
    await entrar('secretaria');
    montar();

    const lista = await screen.findByRole('list', { name: 'Boletines' });
    const boletin = within(lista).getByRole('article', { name: 'Edición de octubre 2026' });
    expect(within(boletin).getByText('octubre de 2026')).toBeInTheDocument();
    expect(within(boletin).getByText(/boletin-octubre-2026\.pdf · 2,4 MB/)).toBeInTheDocument();
    expect(within(boletin).getByText(/por Secretaría \(desarrollo\)/)).toBeInTheDocument();
    const abrir = within(boletin).getByRole('link', { name: /Abrir el PDF de «Edición de octubre 2026»/ });
    expect(abrir).toHaveAttribute('target', '_blank');
    expect(abrir).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('Marketing puede gestionar boletines (permiso boletines.gestionar)', async () => {
    await entrar('marketing');
    montar();

    expect(await screen.findByRole('link', { name: /Nuevo boletín/ })).toBeInTheDocument();
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('publica un boletín eligiendo un PDF de la biblioteca', async () => {
    await entrar('secretaria');
    montar('/admin/boletines/nuevo');
    const usuario = userEvent.setup();

    await usuario.click(await screen.findByRole('button', { name: 'Publicar boletín' }));
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('El título es obligatorio.');
    expect(alerta).toHaveTextContent('Elige el mes y el año del boletín.');
    expect(alerta).toHaveTextContent('Elige o sube el PDF del boletín.');

    await completar(usuario, { titulo: 'Edición de noviembre 2026', periodo: '2026-11', archivo: 'estatutos-pastoral-juvenil' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('estatutos-pastoral-juvenil.pdf')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Publicar boletín' }));

    expect(await screen.findByText('Se publicó el boletín «Edición de noviembre 2026».')).toBeInTheDocument();
    const lista = await screen.findByRole('list', { name: 'Boletines' });
    expect(within(lista).getAllByRole('article').map((a) => within(a).getByRole('heading').textContent)).toEqual([
      'Edición de noviembre 2026',
      'Edición de octubre 2026',
    ]);
  });

  it('sube un PDF nuevo desde el selector y queda elegido', async () => {
    await entrar('secretaria');
    montar('/admin/boletines/nuevo');
    const usuario = userEvent.setup();

    await usuario.type(await screen.findByLabelText('Título'), 'Edición de diciembre 2026');
    fireEvent.change(screen.getByLabelText('Mes del boletín'), { target: { value: '2026-12' } });
    await usuario.click(screen.getByRole('button', { name: 'Elegir PDF' }));
    const dialogo = await screen.findByRole('dialog', { name: 'PDF del boletín' });
    await usuario.upload(within(dialogo).getByLabelText('Archivo PDF'), pdf('boletin-diciembre.pdf'));

    // El PDF subido queda elegido (se ofrece cambiarlo) y el diálogo se cierra.
    expect(await screen.findByRole('button', { name: 'Cambiar PDF' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Publicar boletín' }));
    expect(await screen.findByText('Se publicó el boletín «Edición de diciembre 2026».')).toBeInTheDocument();
  });

  it('rechaza en el selector un archivo que no es PDF', async () => {
    await entrar('secretaria');
    montar('/admin/boletines/nuevo');
    const usuario = userEvent.setup({ applyAccept: false });

    await usuario.click(await screen.findByRole('button', { name: 'Elegir PDF' }));
    const dialogo = await screen.findByRole('dialog', { name: 'PDF del boletín' });
    await usuario.upload(within(dialogo).getByLabelText('Archivo PDF'), new File(['x'], 'foto.png', { type: 'image/png' }));

    expect(await within(dialogo).findByRole('alert')).toHaveTextContent('El boletín debe ser un archivo PDF.');
  });

  it('muestra el 409 si ya hay un boletín de ese mes', async () => {
    await entrar('secretaria');
    montar('/admin/boletines/nuevo');
    const usuario = userEvent.setup();

    await completar(usuario, { titulo: 'Otro de octubre', periodo: '2026-10', archivo: 'estatutos-pastoral-juvenil' });
    await usuario.click(screen.getByRole('button', { name: 'Publicar boletín' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Ya existe un boletín de ese mes en la sede.');
    expect(screen.getByTestId('ubicacion')).toHaveTextContent('/admin/boletines/nuevo');
  });

  it('edita un boletín y reemplaza su PDF', async () => {
    await entrar('secretaria');
    montar();
    const usuario = userEvent.setup();

    await usuario.click(await screen.findByRole('link', { name: 'Editar «Edición de octubre 2026»' }));
    const titulo = await screen.findByLabelText('Título');
    expect(titulo).toHaveValue('Edición de octubre 2026');
    expect(screen.getByLabelText('Mes del boletín')).toHaveValue('2026-10');

    await usuario.clear(titulo);
    await usuario.type(titulo, 'Octubre 2026 (corregido)');
    await usuario.click(screen.getByRole('button', { name: 'Reemplazar PDF' }));
    const dialogo = await screen.findByRole('dialog', { name: 'PDF del boletín' });
    await usuario.click(await within(dialogo).findByRole('button', { name: /estatutos-pastoral-juvenil/ }));
    await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Se guardaron los cambios de «Octubre 2026 (corregido)».')).toBeInTheDocument();
    const boletin = await screen.findByRole('article', { name: 'Octubre 2026 (corregido)' });
    expect(within(boletin).getByText(/estatutos-pastoral-juvenil\.pdf/)).toBeInTheDocument();
  });

  it('elimina un boletín y avisa que su PDF sigue en la biblioteca', async () => {
    await entrar('secretaria');
    montar();
    const usuario = userEvent.setup();

    await usuario.click(await screen.findByRole('button', { name: 'Eliminar «Edición de octubre 2026»' }));
    const dialogo = screen.getByRole('dialog', { name: '¿Eliminar «Edición de octubre 2026»?' });
    await usuario.click(within(dialogo).getByRole('button', { name: 'Eliminar' }));

    expect(await screen.findByText(/Su PDF sigue en la biblioteca multimedia/)).toBeInTheDocument();
    expect(await screen.findByText('Todavía no hay boletines.')).toBeInTheDocument();
  });

  it('una subruta desconocida muestra «página no encontrada»', async () => {
    await entrar('secretaria');
    montar('/admin/boletines/nueva');

    expect(await screen.findByRole('heading', { name: 'Página no encontrada' })).toBeInTheDocument();
  });
});
