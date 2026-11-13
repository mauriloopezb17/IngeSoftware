import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { api } from '../../mocks/api.js';
import { server } from '../../mocks/server.js';
import { clienteHttp } from '../../services/clienteHttp.js';
import { reiniciarMocksAdmin } from '../mocks/handlers.js';
import { CONTRASENA_DESARROLLO } from '../mocks/usuarios.js';
import { aImagenEstandar } from './imagen.js';
import SelectorImagenes from './SelectorImagenes.jsx';

// Quien usa el selector lo abre, recibe la imagen y lo cierra (como hará el editor de noticias).
function Ejemplo({ alElegir = () => {}, ...propiedades }) {
  const [abierto, setAbierto] = useState(false);
  const [elegida, setElegida] = useState(null);

  return (
    <>
      <button onClick={() => setAbierto(true)}>Elegir portada</button>
      <output aria-label="Imagen elegida">{elegida ? JSON.stringify(elegida) : 'ninguna'}</output>
      {abierto && (
        <SelectorImagenes
          {...propiedades}
          onCerrar={() => setAbierto(false)}
          onSeleccionar={(imagen) => {
            alElegir(imagen);
            setElegida(imagen);
            setAbierto(false);
          }}
        />
      )}
    </>
  );
}

function montar(propiedades) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={cliente}>
      <Ejemplo {...propiedades} />
    </QueryClientProvider>,
  );
}

async function abrir(propiedades) {
  montar(propiedades);
  const usuario = userEvent.setup();
  await usuario.click(screen.getByRole('button', { name: 'Elegir portada' }));
  const dialogo = await screen.findByRole('dialog', { name: 'Seleccionar imagen' });
  await within(dialogo).findByRole('list', { name: 'Imágenes' });
  return { usuario, dialogo };
}

const opcion = (dialogo, nombre) => within(dialogo).getByRole('button', { name: new RegExp(nombre.replace('.', '\\.')) });
const usar = (dialogo) => within(dialogo).getByRole('button', { name: 'Usar esta imagen' });
const elegida = () => JSON.parse(screen.getByLabelText('Imagen elegida').textContent);

describe('selector de imágenes', () => {
  beforeEach(async () => {
    reiniciarMocksAdmin();
    await clienteHttp.post('/auth/login', { correo: 'marketing@parroquia.test', contrasena: CONTRASENA_DESARROLLO });
  });
  afterEach(reiniciarMocksAdmin);

  it('muestra solo imágenes (no videos ni PDF), con el total', async () => {
    const { dialogo } = await abrir();

    expect(await within(dialogo).findByText('10 imágenes')).toBeInTheDocument();
    expect(within(dialogo).queryByText(/\.mp4|\.pdf/)).not.toBeInTheDocument();
    expect(within(dialogo).getAllByRole('listitem')).toHaveLength(8); // primera página
  });

  it('devuelve el objeto imagen estándar del contrato, y nada más', async () => {
    const alElegir = vi.fn();
    const { usuario, dialogo } = await abrir({ alElegir });

    await usuario.click(opcion(dialogo, 'primeras comuniones 2026.webp'));
    await usuario.click(usar(dialogo));

    expect(alElegir).toHaveBeenCalledOnce();
    expect(alElegir.mock.calls[0][0]).toEqual({
      id: 8,
      url: 'https://cdn.pasionistas.org.bo/sedes/senor-de-la-exaltacion/2026/11/4b1e9c2a-7d3f-4e8a-9c61-2f0d8a5b3e17.webp',
      textoAlternativo: 'Niños de primera comunión frente al altar',
      ancho: 1600,
      alto: 1067,
    });
    // Quien lo usa cierra el selector.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(elegida().id).toBe(8);
  });

  it('una imagen sin texto alternativo devuelve null en ese campo', async () => {
    const { usuario, dialogo } = await abrir();

    await usuario.click(opcion(dialogo, 'catequesis-confirmacion.png'));
    await usuario.click(usar(dialogo));

    expect(elegida()).toEqual({
      id: 10,
      url: 'https://cdn.pasionistas.org.bo/sedes/senor-de-la-exaltacion/2026/11/e3a91c64-0b2d-4f75-8a1e-5d9c3b7f2a06.png',
      textoAlternativo: null,
      ancho: 1280,
      alto: 853,
    });
  });

  it('las imágenes del seed conservan su URL relativa', async () => {
    const { usuario, dialogo } = await abrir();

    await usuario.type(within(dialogo).getByLabelText('Buscar imagen'), 'altar.webp');
    await usuario.click(await within(dialogo).findByRole('button', { name: /^altar\.webp/ }));
    await usuario.click(usar(dialogo));

    expect(elegida()).toMatchObject({ id: 3, url: '/media/seed/altar.webp', ancho: 1879, alto: 1057 });
  });

  it('«Usar esta imagen» espera a que se elija una, y se puede cambiar de elección', async () => {
    const { usuario, dialogo } = await abrir();
    expect(usar(dialogo)).toBeDisabled();
    expect(within(dialogo).getByText('Ninguna imagen seleccionada.')).toBeInTheDocument();

    await usuario.click(opcion(dialogo, 'crucifijo.webp'));
    expect(usar(dialogo)).toBeEnabled();
    expect(opcion(dialogo, 'crucifijo.webp')).toHaveAttribute('aria-pressed', 'true');
    expect(within(dialogo).getByText('Seleccionada:', { exact: false })).toHaveTextContent('crucifijo.webp');

    await usuario.click(opcion(dialogo, 'altar.webp'));
    expect(opcion(dialogo, 'crucifijo.webp')).toHaveAttribute('aria-pressed', 'false');
    expect(opcion(dialogo, 'altar.webp')).toHaveAttribute('aria-pressed', 'true');

    await usuario.click(usar(dialogo));
    expect(elegida().id).toBe(3);
  });

  it('busca imágenes por nombre o texto alternativo', async () => {
    const { usuario, dialogo } = await abrir();

    await usuario.type(within(dialogo).getByLabelText('Buscar imagen'), 'procesion');

    expect(await within(dialogo).findByText('1 imagen con esa búsqueda')).toBeInTheDocument();
    expect(within(dialogo).getAllByRole('listitem')).toHaveLength(1);
    await usuario.click(opcion(dialogo, 'procesion-semana-santa.jpg'));
    await usuario.click(usar(dialogo));
    expect(elegida().id).toBe(9);
  });

  it('sin coincidencias lo indica', async () => {
    const { usuario, dialogo } = await abrir();

    await usuario.type(within(dialogo).getByLabelText('Buscar imagen'), 'zzzz');

    expect(await within(dialogo).findByText('No hay imágenes que coincidan con la búsqueda.')).toBeInTheDocument();
  });

  it('pagina, y la elección se conserva al cambiar de página', async () => {
    const { usuario, dialogo } = await abrir();
    await usuario.click(opcion(dialogo, 'primeras comuniones 2026.webp'));

    await usuario.click(within(dialogo).getByRole('button', { name: /Siguiente/ }));
    expect(await within(dialogo).findByText(/Página 2 de 2/)).toBeInTheDocument();
    expect(within(dialogo).getAllByRole('listitem')).toHaveLength(2);
    expect(usar(dialogo)).toBeEnabled();
    expect(within(dialogo).getByText('Seleccionada:', { exact: false })).toHaveTextContent('primeras comuniones 2026.webp');

    await usuario.click(usar(dialogo));
    expect(elegida().id).toBe(8);
  });

  describe('exigirTextoAlternativo', () => {
    it('deshabilita las imágenes sin texto alternativo y avisa', async () => {
      const { usuario, dialogo } = await abrir({ exigirTextoAlternativo: true });

      expect(opcion(dialogo, 'catequesis-confirmacion.png')).toBeDisabled();
      expect(opcion(dialogo, 'catequesis-confirmacion.png')).toHaveTextContent('Sin texto alternativo');
      expect(opcion(dialogo, 'primeras comuniones 2026.webp')).toBeEnabled();
      expect(within(dialogo).getByText(/Solo se pueden elegir imágenes con texto alternativo/)).toBeInTheDocument();

      await usuario.click(opcion(dialogo, 'catequesis-confirmacion.png'));
      expect(usar(dialogo)).toBeDisabled();
    });

    it('por defecto deja elegir imágenes sin texto alternativo, pero las señala', async () => {
      const { dialogo } = await abrir();

      expect(opcion(dialogo, 'catequesis-confirmacion.png')).toBeEnabled();
      expect(opcion(dialogo, 'catequesis-confirmacion.png')).toHaveTextContent('Sin texto alternativo');
    });
  });

  describe('cerrar sin elegir', () => {
    it.each([
      ['el botón Cancelar', (dialogo) => userEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }))],
      ['el botón Cerrar', (dialogo) => userEvent.click(within(dialogo).getByRole('button', { name: 'Cerrar' }))],
      ['Escape', () => userEvent.keyboard('{Escape}')],
    ])('con %s no devuelve nada y el foco vuelve al botón que lo abrió', async (_, cerrar) => {
      const alElegir = vi.fn();
      const { usuario, dialogo } = await abrir({ alElegir });
      await usuario.click(opcion(dialogo, 'crucifijo.webp'));

      await cerrar(dialogo);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(alElegir).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Elegir portada' })).toHaveFocus();
    });
  });

  it('si falla la carga muestra el error y permite reintentar', async () => {
    server.use(
      http.get(
        api('/admin/multimedia'),
        () => HttpResponse.json({ error: { codigo: 'ERROR_INTERNO', mensaje: 'Error interno del servidor.', detalles: [] } }, { status: 500 }),
        { once: true },
      ),
    );
    montar();
    const usuario = userEvent.setup();
    await usuario.click(screen.getByRole('button', { name: 'Elegir portada' }));
    const dialogo = await screen.findByRole('dialog');

    expect(await within(dialogo).findByRole('alert')).toHaveTextContent('No se pudieron cargar las imágenes: Error interno del servidor.');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Reintentar' }));

    expect(await within(dialogo).findByRole('list', { name: 'Imágenes' })).toBeInTheDocument();
  });

  it('muestra un marcador si la miniatura no carga y aun así se puede elegir', async () => {
    const { usuario, dialogo } = await abrir();
    const boton = opcion(dialogo, 'crucifijo.webp');

    boton.querySelector('img').dispatchEvent(new Event('error'));
    await usuario.click(boton);

    expect(await within(boton).findByTestId('miniatura-sustituta')).toBeInTheDocument();
    expect(usar(dialogo)).toBeEnabled();
  });
});

describe('aImagenEstandar', () => {
  it('toma del archivo solo los campos del objeto imagen estándar', () => {
    const imagen = aImagenEstandar({
      id: 31,
      url: 'https://cdn.pasionistas.org.bo/sedes/senor-de-la-exaltacion/2026/10/primeras-comuniones.webp',
      nombreOriginal: 'otro nombre.webp',
      textoAlternativo: 'Niños de primera comunión frente al altar',
      ancho: 1600,
      alto: 1067,
      subidoPor: { id: 4 },
      enUso: true,
    });

    expect(imagen).toEqual({
      id: 31,
      url: 'https://cdn.pasionistas.org.bo/sedes/senor-de-la-exaltacion/2026/10/primeras-comuniones.webp',
      textoAlternativo: 'Niños de primera comunión frente al altar',
      ancho: 1600,
      alto: 1067,
    });
  });

  it('los datos que faltan son null, nunca undefined', () => {
    expect(aImagenEstandar({ id: 1, url: '/media/seed/a.webp' })).toEqual({
      id: 1,
      url: '/media/seed/a.webp',
      textoAlternativo: null,
      ancho: null,
      alto: null,
    });
  });
});
