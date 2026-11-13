import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

import { api } from '../../mocks/api.js';
import { server } from '../../mocks/server.js';
import { clienteHttp } from '../../services/clienteHttp.js';
import { reiniciarMocksAdmin } from '../mocks/handlers.js';
import { CONTRASENA_DESARROLLO } from '../mocks/usuarios.js';
import Multimedia from './Multimedia.jsx';

const entrar = (usuario = 'marketing') =>
  clienteHttp.post('/auth/login', { correo: `${usuario}@parroquia.test`, contrasena: CONTRASENA_DESARROLLO });

function montar(entrada = '/admin/multimedia') {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={[entrada]}>
        <Multimedia />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const lista = async () => within(await screen.findByRole('list', { name: 'Archivos' }));
const tarjetas = async () => (await lista()).getAllByRole('listitem');
const nombresDeTarjetas = async () =>
  (await tarjetas()).map((t) => within(t).getByRole('button').querySelector('span[title]').textContent);
const tarjeta = async (nombre) => (await lista()).getByRole('button', { name: new RegExp(nombre.replace('.', '\\.')) });

describe('biblioteca de medios', () => {
  beforeEach(async () => {
    reiniciarMocksAdmin();
    await entrar();
  });
  afterEach(reiniciarMocksAdmin);

  describe('listado', () => {
    it('muestra la primera página con el total y la paginación', async () => {
      montar();

      expect(await screen.findByRole('heading', { level: 1, name: 'Multimedia' })).toBeInTheDocument();
      expect(await tarjetas()).toHaveLength(12);
      expect(screen.getByText('14 archivos')).toBeInTheDocument();
      expect(screen.getByText(/Página 1 de 2 · 14 en total/)).toBeInTheDocument();
    });

    it('cada tarjeta indica nombre, tipo, tamaño y si está en uso', async () => {
      montar();

      const comuniones = await tarjeta('primeras comuniones 2026.webp');
      expect(comuniones).toHaveTextContent('WebP · 403,2 KB');
      expect(comuniones).toHaveTextContent('En uso');
    });

    it('avisa de las imágenes sin texto alternativo', async () => {
      montar();
      await tarjetas();

      expect(await tarjeta('catequesis-confirmacion.png')).toHaveTextContent('Sin texto alternativo');
      expect(await tarjeta('retiro-juvenil.jpg')).toHaveTextContent('Sin texto alternativo');
      expect(await tarjeta('crucifijo.webp')).not.toHaveTextContent('Sin texto alternativo');
      // Un PDF sin texto alternativo no genera el aviso: solo importa en las imágenes.
      expect(await tarjeta('boletin-octubre-2026.pdf')).not.toHaveTextContent('Sin texto alternativo');
    });

    it('pasa de página con los botones Anterior y Siguiente', async () => {
      montar();
      const usuario = userEvent.setup();
      await tarjetas();
      expect(screen.getByRole('button', { name: /Anterior/ })).toBeDisabled();

      await usuario.click(screen.getByRole('button', { name: /Siguiente/ }));

      expect(await screen.findByText(/Página 2 de 2/)).toBeInTheDocument();
      expect(await nombresDeTarjetas()).toEqual(['saludo-del-parroco.mp4', 'estatutos-pastoral-juvenil.pdf']);
      expect(screen.getByRole('button', { name: /Siguiente/ })).toBeDisabled();

      await usuario.click(screen.getByRole('button', { name: /Anterior/ }));
      expect(await screen.findByText(/Página 1 de 2/)).toBeInTheDocument();
    });

    it('muestra un marcador si la imagen no se puede cargar', async () => {
      montar();
      const botonComuniones = await tarjeta('primeras comuniones 2026.webp');
      const imagen = botonComuniones.querySelector('img');

      fireEvent.error(imagen);

      expect(within(botonComuniones).getByTestId('miniatura-sustituta')).toBeInTheDocument();
      expect(botonComuniones.querySelector('img')).toBeNull();
    });

    it('si falla la carga muestra el error y permite reintentar', async () => {
      server.use(
        http.get(
          api('/admin/multimedia'),
          () =>
            HttpResponse.json(
              { error: { codigo: 'ERROR_INTERNO', mensaje: 'Error interno del servidor.', detalles: [] } },
              { status: 500 },
            ),
          { once: true },
        ),
      );
      montar();

      expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar la biblioteca: Error interno del servidor.');
      await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

      expect(await tarjetas()).toHaveLength(12);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('filtros', () => {
    it('filtra por tipo', async () => {
      montar();
      await tarjetas();

      await userEvent.selectOptions(screen.getByLabelText('Tipo'), 'VIDEO');

      expect(await screen.findByText('2 archivos con estos filtros')).toBeInTheDocument();
      expect((await nombresDeTarjetas()).sort()).toEqual(['portada-final.mp4', 'saludo-del-parroco.mp4']);
    });

    it('filtra por uso', async () => {
      montar();
      await tarjetas();

      await userEvent.selectOptions(screen.getByLabelText('Uso'), 'false');

      expect(await screen.findByText('6 archivos con estos filtros')).toBeInTheDocument();
      for (const t of await tarjetas()) expect(t).not.toHaveTextContent('En uso');
    });

    it('busca por nombre mientras se escribe', async () => {
      montar();
      await tarjetas();

      await userEvent.type(screen.getByLabelText('Buscar'), 'procesion');

      expect(await screen.findByText('1 archivo con estos filtros')).toBeInTheDocument();
      expect(await nombresDeTarjetas()).toEqual(['procesion-semana-santa.jpg']);
    });

    it('ordena por tamaño', async () => {
      montar();
      await tarjetas();

      await userEvent.selectOptions(screen.getByLabelText('Ordenar por'), 'tamanoBytes');

      expect((await screen.findAllByRole('listitem'))[0]).toHaveTextContent('crucifijo.webp');
    });

    it('sin resultados ofrece quitar los filtros', async () => {
      montar();
      await tarjetas();
      const usuario = userEvent.setup();

      await usuario.type(screen.getByLabelText('Buscar'), 'zzzz');
      expect(await screen.findByText('No hay archivos que coincidan con los filtros.')).toBeInTheDocument();

      await usuario.click(screen.getByRole('button', { name: 'Quitar los filtros' }));

      expect(await tarjetas()).toHaveLength(12);
      expect(screen.getByLabelText('Buscar')).toHaveValue('');
    });

    it('«Limpiar filtros» restablece todos los controles', async () => {
      montar('/admin/multimedia?clase=DOCUMENTO&enUso=true');
      expect(await screen.findByText('1 archivo con estos filtros')).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));

      expect(await screen.findByText('14 archivos')).toBeInTheDocument();
      expect(screen.getByLabelText('Tipo')).toHaveValue('');
      expect(screen.getByLabelText('Uso')).toHaveValue('');
    });

    it('lee los filtros de la dirección (se conservan al recargar)', async () => {
      montar('/admin/multimedia?clase=DOCUMENTO&orden=tamanoBytes');

      expect(await screen.findByText('2 archivos con estos filtros')).toBeInTheDocument();
      expect(screen.getByLabelText('Tipo')).toHaveValue('DOCUMENTO');
      expect(screen.getByLabelText('Ordenar por')).toHaveValue('tamanoBytes');
      expect(await nombresDeTarjetas()).toEqual(['estatutos-pastoral-juvenil.pdf', 'boletin-octubre-2026.pdf']);
    });

    it('descarta los valores desconocidos de la dirección', async () => {
      montar('/admin/multimedia?clase=FOTO&enUso=quizas&orden=nombre&pagina=-3');

      expect(await screen.findByText('14 archivos')).toBeInTheDocument();
      expect(screen.getByLabelText('Tipo')).toHaveValue('');
    });
  });

  describe('vista previa', () => {
    it('abre un diálogo con la imagen y sus datos', async () => {
      montar();
      await userEvent.click(await tarjeta('primeras comuniones 2026.webp'));

      const dialogo = await screen.findByRole('dialog', { name: 'primeras comuniones 2026.webp' });
      expect(within(dialogo).getByRole('img', { name: 'Niños de primera comunión frente al altar' })).toHaveAttribute(
        'src',
        'https://cdn.pasionistas.org.bo/sedes/senor-de-la-exaltacion/2026/11/4b1e9c2a-7d3f-4e8a-9c61-2f0d8a5b3e17.webp',
      );
      expect(dialogo).toHaveTextContent('WebP (image/webp)');
      expect(dialogo).toHaveTextContent('403,2 KB');
      expect(dialogo).toHaveTextContent('1600 × 1067 px');
      expect(dialogo).toHaveTextContent('Marketing (desarrollo)');
      expect(dialogo).toHaveTextContent('Parroquia Señor de la Exaltación');
      expect(dialogo).toHaveTextContent('En uso en el portal');
    });

    it('la imagen sin texto alternativo lo advierte', async () => {
      montar();
      await userEvent.click(await tarjeta('catequesis-confirmacion.png'));

      expect(await screen.findByRole('dialog')).toHaveTextContent('Sin texto alternativo: es necesario para publicar la imagen');
    });

    it('reproduce los videos', async () => {
      montar();
      await userEvent.click(await tarjeta('portada-final.mp4'));

      const dialogo = await screen.findByRole('dialog');
      const video = dialogo.querySelector('video');
      expect(video).toHaveAttribute('src', '/media/seed/portada-final.mp4');
      expect(video).toHaveAttribute('controls');
    });

    it('ofrece abrir los PDF en otra pestaña', async () => {
      montar();
      await userEvent.click(await tarjeta('boletin-octubre-2026.pdf'));

      const enlace = await screen.findByRole('link', { name: /Abrir el PDF/ });
      expect(enlace).toHaveAttribute('target', '_blank');
      expect(enlace).toHaveAttribute('rel', expect.stringContaining('noopener'));
    });

    it('se cierra con Escape y el foco vuelve a la tarjeta', async () => {
      montar();
      const boton = await tarjeta('crucifijo.webp');
      await userEvent.click(boton);
      await screen.findByRole('dialog');

      await userEvent.keyboard('{Escape}');

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(boton).toHaveFocus();
    });

    it('se cierra con el botón Cerrar', async () => {
      montar();
      await userEvent.click(await tarjeta('crucifijo.webp'));

      await userEvent.click(await screen.findByRole('button', { name: 'Cerrar' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
