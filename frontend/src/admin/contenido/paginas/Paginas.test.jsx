import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

import { clienteHttp } from '../../../services/clienteHttp.js';
import { reiniciarMocksAdmin } from '../../mocks/handlers.js';
import { CONTRASENA_DESARROLLO } from '../../mocks/usuarios.js';
import { SesionProvider } from '../../sesion/SesionProvider.jsx';
import { reiniciarMocksContenido } from '../mocks/handlers.js';
import Paginas from './Paginas.jsx';

const entrar = (rol = 'secretaria') =>
  clienteHttp.post('/auth/login', {
    correo: `${rol}@parroquia.test`,
    contrasena: CONTRASENA_DESARROLLO,
  });

function Ubicacion() {
  const { pathname } = useLocation();
  return <p data-testid="ubicacion">{pathname}</p>;
}

// Páginas se monta como en AdminApp: bajo /admin/paginas/*, con sus subrutas reales.
function montar(entrada = '/admin/paginas') {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <SesionProvider>
        <MemoryRouter initialEntries={[entrada]}>
          <Routes>
            <Route path="/admin/paginas/*" element={<Paginas />} />
          </Routes>
          <Ubicacion />
        </MemoryRouter>
      </SesionProvider>
    </QueryClientProvider>,
  );
}

describe('gestión de páginas y bloques', () => {
  beforeEach(() => {
    reiniciarMocksAdmin();
    reiniciarMocksContenido();
  });

  afterEach(() => {
    reiniciarMocksAdmin();
    reiniciarMocksContenido();
  });

  it('lista las páginas, permite crear una nueva y protege inicio/nosotros contra eliminación', async () => {
    await entrar('secretaria');
    montar();
    const u = userEvent.setup({ delay: null });

    const lista = await screen.findByRole('list', { name: 'Páginas' });
    expect(within(lista).getByText('Inicio')).toBeInTheDocument();
    expect(within(lista).getByText('Quiénes somos')).toBeInTheDocument();
    expect(within(lista).getByText('Nuestra historia')).toBeInTheDocument();

    // Crear nueva página
    await u.click(screen.getByRole('button', { name: /Nueva página/ }));
    const dialogo = await screen.findByRole('dialog', { name: 'Nueva página' });
    await u.type(within(dialogo).getByLabelText('Título'), 'Comunidades');
    expect(within(dialogo).getByLabelText('Slug (URL)')).toHaveValue('comunidades');
    await u.selectOptions(within(dialogo).getByLabelText('Estado'), 'PUBLICADO');
    await u.click(within(dialogo).getByRole('button', { name: 'Crear página' }));

    expect(await screen.findByText('Comunidades')).toBeInTheDocument();

    // Las páginas inicio y nosotros devuelven 409 CONFLICTO al intentar eliminarlas
    await u.click(screen.getByRole('button', { name: 'Eliminar «Inicio»' }));
    const dialogoEliminarInicio = await screen.findByRole('dialog', { name: 'Eliminar «Inicio»' });
    await u.click(within(dialogoEliminarInicio).getByRole('button', { name: 'Eliminar' }));
    expect(await within(dialogoEliminarInicio).findByRole('alert')).toHaveTextContent(
      /no se puede eliminar/i,
    );
    await u.click(within(dialogoEliminarInicio).getByRole('button', { name: 'Cancelar' }));

    // Una página hija sí puede eliminarse
    await u.click(screen.getByRole('button', { name: 'Eliminar «Nuestra historia»' }));
    const dialogoEliminarHija = await screen.findByRole('dialog', {
      name: 'Eliminar «Nuestra historia»',
    });
    await u.click(within(dialogoEliminarHija).getByRole('button', { name: 'Eliminar' }));
    await waitFor(() =>
      expect(screen.queryByText('Nuestra historia')).not.toBeInTheDocument(),
    );
  }, 15000);

  it('gestiona bloques en «Quiénes somos»: agrega cita, youtube, texto_imagen y reordena', async () => {
    await entrar('secretaria');
    montar();
    const u = userEvent.setup({ delay: null });

    const lista = await screen.findByRole('list', { name: 'Páginas' });
    const filaNosotros = within(lista).getByText('Quiénes somos').closest('li');
    await u.click(within(filaNosotros).getByRole('link', { name: 'Bloques de «Quiénes somos»' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Quiénes somos' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('ubicacion')).toHaveTextContent('/admin/paginas/2');
    const listaBloques = await screen.findByRole('list', { name: 'Bloques de la página' });
    expect(within(listaBloques).getByText('Texto con imagen')).toBeInTheDocument();
    expect(within(listaBloques).getByText('Cita destacada')).toBeInTheDocument();
    expect(within(listaBloques).getByText('Grilla de tarjetas')).toBeInTheDocument();

    // Validación 400 al agregar una cita vacía
    await u.click(screen.getByRole('button', { name: /Agregar bloque/ }));
    let dialogoBloque = await screen.findByRole('dialog', { name: 'Nuevo bloque de página' });
    await u.selectOptions(within(dialogoBloque).getByLabelText('Tipo de bloque'), 'cita');
    await u.click(within(dialogoBloque).getByRole('button', { name: 'Agregar bloque' }));
    expect(
      await within(dialogoBloque).findByText(/El texto de la cita es obligatorio/i),
    ).toBeInTheDocument();

    // Completar la cita y guardar
    await u.type(within(dialogoBloque).getByLabelText('Texto de la cita'), 'Cristo vive en Obrajes.');
    await u.type(within(dialogoBloque).getByLabelText('Autor o referencia (opcional)'), 'Comunidad');
    await u.click(within(dialogoBloque).getByRole('button', { name: 'Agregar bloque' }));

    expect(await screen.findByText(/«Cristo vive en Obrajes\.» — Comunidad/)).toBeInTheDocument();

    // Agregar bloque video_youtube extrayendo el id desde la URL
    await u.click(screen.getByRole('button', { name: /Agregar bloque/ }));
    dialogoBloque = await screen.findByRole('dialog', { name: 'Nuevo bloque de página' });
    await u.selectOptions(within(dialogoBloque).getByLabelText('Tipo de bloque'), 'video_youtube');
    await u.type(
      within(dialogoBloque).getByLabelText('Enlace o identificador de YouTube'),
      'https://www.youtube.com/watch?v=pX7aQm3kR2c',
    );
    await u.type(
      within(dialogoBloque).getByLabelText('Título accesible del video (opcional)'),
      'Recorrido del templo',
    );
    await u.click(within(dialogoBloque).getByRole('button', { name: 'Agregar bloque' }));

    expect(
      await screen.findByText('Recorrido del templo (pX7aQm3kR2c)'),
    ).toBeInTheDocument();

    // Reordenar bloques (subir el segundo bloque al primer lugar)
    await u.click(screen.getByRole('button', { name: /Subir bloque 2:/ }));
    await waitFor(() => {
      const itemsActualizados = within(
        screen.getByRole('list', { name: 'Bloques de la página' }),
      ).getAllByRole('listitem');
      expect(within(itemsActualizados[0]).getByText('Cita destacada')).toBeInTheDocument();
    });

    // Editar y eliminar el bloque recién agregado
    await u.click(screen.getByRole('button', { name: /Editar bloque 5: Video de YouTube/ }));
    const dialogoEdicion = await screen.findByRole('dialog', {
      name: 'Editar bloque: Video de YouTube',
    });
    await u.click(within(dialogoEdicion).getByLabelText('Visible en el portal'));
    await u.click(within(dialogoEdicion).getByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByText('Oculto')).toBeInTheDocument();

    await u.click(screen.getByRole('button', { name: /Eliminar bloque 5: Video de YouTube/ }));
    const dialogoBorrado = await screen.findByRole('dialog', {
      name: 'Eliminar bloque «Video de YouTube»',
    });
    await u.click(within(dialogoBorrado).getByRole('button', { name: 'Eliminar' }));
    await waitFor(() =>
      expect(screen.queryByText('Recorrido del templo (pX7aQm3kR2c)')).not.toBeInTheDocument(),
    );
  }, 15000);

  it('soporta formularios hero_video, tarjetas y galeria con SelectorImagenes', async () => {
    await entrar('admin');
    montar();
    const u = userEvent.setup({ delay: null });

    const lista = await screen.findByRole('list', { name: 'Páginas' });
    const filaHistoria = within(lista).getByText('Nuestra historia').closest('li');
    await u.click(within(filaHistoria).getByRole('link', { name: 'Bloques de «Nuestra historia»' }));

    // Bloque galeria usando SelectorImagenes
    await u.click(await screen.findByRole('button', { name: /Agregar bloque/ }));
    const dialogo = await screen.findByRole('dialog', { name: 'Nuevo bloque de página' });
    await u.selectOptions(within(dialogo).getByLabelText('Tipo de bloque'), 'galeria');
    await u.type(within(dialogo).getByLabelText('Título de la galería (opcional)'), 'Fotos');
    await u.click(within(dialogo).getByRole('button', { name: 'Agregar desde biblioteca' }));

    const selector = await screen.findByRole('dialog', { name: 'Elegir imagen de la biblioteca' });
    await u.click(await within(selector).findByRole('button', { name: /crucifijo\.webp/i }));
    await u.click(within(selector).getByRole('button', { name: 'Usar esta imagen' }));

    await u.click(within(dialogo).getByRole('button', { name: 'Agregar bloque' }));
    expect(await screen.findByText('Fotos · 1 imagen')).toBeInTheDocument();

    // Bloque tarjetas con ícono y tarjeta adicional
    await u.click(screen.getByRole('button', { name: /Agregar bloque/ }));
    const dialogoTarjetas = await screen.findByRole('dialog', { name: 'Nuevo bloque de página' });
    await u.selectOptions(within(dialogoTarjetas).getByLabelText('Tipo de bloque'), 'tarjetas');
    await u.type(within(dialogoTarjetas).getByLabelText('Título de tarjeta 1'), 'Horarios');
    await u.click(within(dialogoTarjetas).getByRole('button', { name: 'Agregar bloque' }));
    expect(await screen.findByText('1 tarjeta')).toBeInTheDocument();
  }, 15000);

  it('Marketing solo ve en modo lectura sin botones de edición o reordenamiento', async () => {
    await entrar('marketing');
    montar();
    const u = userEvent.setup({ delay: null });

    expect(await screen.findByText(/solo lectura/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Nueva página/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Eliminar/ })).not.toBeInTheDocument();

    const lista = await screen.findByRole('list', { name: 'Páginas' });
    const filaInicio = within(lista).getByText('Inicio').closest('li');
    await u.click(within(filaInicio).getByRole('link', { name: 'Ver bloques de «Inicio»' }));

    expect(await screen.findByText(/solo lectura/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Agregar bloque/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Subir bloque/ })).not.toBeInTheDocument();
  });

  it('cada página tiene su ruta: /admin/paginas/:id se abre directo y se puede volver al listado', async () => {
    await entrar('secretaria');
    montar('/admin/paginas/2');
    const u = userEvent.setup({ delay: null });

    expect(await screen.findByRole('heading', { level: 1, name: 'Quiénes somos' })).toBeInTheDocument();
    await u.click(screen.getByRole('link', { name: 'Volver a páginas' }));

    const titulo = await screen.findByRole('heading', { level: 1, name: 'Páginas' });
    expect(screen.getByTestId('ubicacion')).toHaveTextContent(/^\/admin\/paginas$/);
    // El foco vuelve al título del listado.
    expect(titulo).toHaveFocus();
  });

  it('una página que no existe, un id inválido o una subruta desconocida dan «página no encontrada»', async () => {
    await entrar('secretaria');
    for (const ruta of ['/admin/paginas/999', '/admin/paginas/abc', '/admin/paginas/2/otra']) {
      const { unmount } = montar(ruta);
      expect(await screen.findByRole('heading', { name: 'Página no encontrada' })).toBeInTheDocument();
      unmount();
    }
  });
});
