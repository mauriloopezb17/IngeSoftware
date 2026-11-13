import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { api } from '../../mocks/api.js';
import { server } from '../../mocks/server.js';
import { clienteHttp } from '../../services/clienteHttp.js';
import { reiniciarMocksAdmin } from '../mocks/handlers.js';
import { CONTRASENA_DESARROLLO } from '../mocks/usuarios.js';
import SubidaArchivos from './SubidaArchivos.jsx';

const MB = 1024 * 1024;

function montar() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={cliente}>
      <SubidaArchivos />
    </QueryClientProvider>,
  );
  return cliente;
}

// `tamano` permite simular archivos enormes sin crearlos en memoria (solo para la validación del cliente).
function crearArchivo(nombre, tipo, tamano) {
  const archivo = new File(['contenido'], nombre, { type: tipo });
  if (tamano !== undefined) Object.defineProperty(archivo, 'size', { value: tamano });
  return archivo;
}

// El selector filtra por `accept`; aquí se desactiva para poder probar que el cliente rechaza lo no permitido.
const elegir = (...archivos) => userEvent.setup({ applyAccept: false }).upload(screen.getByLabelText('Archivos a subir'), archivos);

const errorDelServidor = (estado, codigo, mensaje) =>
  HttpResponse.json({ error: { codigo, mensaje, detalles: [] } }, { status: estado });

describe('subida de archivos', () => {
  beforeEach(async () => {
    reiniciarMocksAdmin();
    await clienteHttp.post('/auth/login', { correo: 'marketing@parroquia.test', contrasena: CONTRASENA_DESARROLLO });
  });
  afterEach(reiniciarMocksAdmin);

  describe('validación antes de enviar', () => {
    it.each([
      ['animacion.gif', 'image/gif', 100, /Tipo no permitido.*JPG, PNG o WebP/],
      ['logo.svg', 'image/svg+xml', 100, /Tipo no permitido/],
      ['programa.exe', 'application/x-msdownload', 100, /Tipo no permitido/],
      ['grande.jpg', 'image/jpeg', 31 * MB, /Pesa 31 MB\. Las imágenes pueden pesar hasta 30 MB\./],
      ['manual.pdf', 'application/pdf', 51 * MB, /Pesa 51 MB\. Los documentos PDF pueden pesar hasta 50 MB\./],
      ['misa.mp4', 'video/mp4', 3 * 1024 * MB, /Pesa 3 GB\. Los videos pueden pesar hasta 2 GB\./],
    ])('rechaza %s sin enviarlo', async (nombre, tipo, tamano, mensaje) => {
      let peticiones = 0;
      server.use(
        http.post(api('/admin/multimedia'), () => {
          peticiones++;
          return new HttpResponse(null, { status: 500 });
        }),
      );
      montar();

      await elegir(crearArchivo(nombre, tipo, tamano));

      const aviso = await screen.findByRole('alert');
      expect(aviso).toHaveTextContent('No se agregó 1 archivo:');
      expect(aviso).toHaveTextContent(`«${nombre}»`);
      expect(aviso).toHaveTextContent(mensaje);
      expect(screen.queryByRole('button', { name: /^Subir/ })).not.toBeInTheDocument();
      expect(peticiones).toBe(0);
    });

    it('acepta exactamente el límite de tamaño', async () => {
      montar();

      await elegir(crearArchivo('justo.jpg', 'image/jpeg', 30 * MB));

      expect(await screen.findByRole('button', { name: 'Subir 1 archivo' })).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('con varios archivos agrega los válidos y rechaza los demás', async () => {
      montar();

      await elegir(crearArchivo('bien.jpg', 'image/jpeg'), crearArchivo('mal.gif', 'image/gif'), crearArchivo('ok.pdf', 'application/pdf'));

      expect(await screen.findByRole('button', { name: 'Subir 2 archivos' })).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent('«mal.gif»');
      expect(within(screen.getByRole('list', { name: 'Archivos por subir' })).getAllByRole('listitem')).toHaveLength(2);
    });

    it('el aviso de rechazados se puede descartar', async () => {
      montar();
      await elegir(crearArchivo('mal.gif', 'image/gif'));

      await userEvent.click(await screen.findByRole('button', { name: /Descartar los avisos/ }));

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('el selector solo ofrece los tipos permitidos', () => {
      montar();

      const accept = screen.getByLabelText('Archivos a subir').getAttribute('accept');
      expect(accept).toContain('image/webp');
      expect(accept).not.toContain('gif');
    });

    it('muestra los límites en la zona de subida', () => {
      montar();

      expect(screen.getByText('JPG, PNG, WebP hasta 30 MB · MP4, WebM hasta 2 GB · PDF hasta 50 MB')).toBeInTheDocument();
    });
  });

  describe('arrastrar y soltar', () => {
    it('suelta archivos en la zona y los agrega a la lista', async () => {
      montar();
      const zona = screen.getByTestId('zona-de-subida');

      fireEvent.dragEnter(zona);
      expect(zona).toHaveClass('border-gold');
      fireEvent.drop(zona, { dataTransfer: { files: [crearArchivo('arrastrada.png', 'image/png')] } });

      expect(await screen.findByText('arrastrada.png')).toBeInTheDocument();
      expect(zona).not.toHaveClass('border-gold');
    });

    it('al soltar un tipo no permitido lo rechaza igual que con el botón', async () => {
      montar();

      fireEvent.drop(screen.getByTestId('zona-de-subida'), {
        dataTransfer: { files: [crearArchivo('malo.gif', 'image/gif')] },
      });

      expect(await screen.findByRole('alert')).toHaveTextContent('«malo.gif»');
    });

    it('soltar algo que no son archivos (texto) no hace nada', () => {
      montar();

      fireEvent.drop(screen.getByTestId('zona-de-subida'), { dataTransfer: { files: [] } });

      expect(screen.queryByRole('list', { name: 'Archivos por subir' })).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('envío', () => {
    it('sube una imagen con su texto alternativo', async () => {
      const cliente = montar();
      const usuario = userEvent.setup();
      await elegir(crearArchivo('misa.jpg', 'image/jpeg'));

      await usuario.type(await screen.findByLabelText('Texto alternativo de misa.jpg'), 'Misa dominical');
      await usuario.click(screen.getByRole('button', { name: 'Subir 1 archivo' }));

      expect(await screen.findByText('Subido')).toBeInTheDocument();
      expect(screen.queryByLabelText('Texto alternativo de misa.jpg')).not.toBeInTheDocument();

      const { datos } = await clienteHttp.get('/admin/multimedia', { parametros: { orden: '-fechaSubida' } });
      expect(datos[0]).toMatchObject({ id: 15, textoAlternativo: 'Misa dominical', tipoMime: 'image/jpeg' });
      expect(cliente.isMutating()).toBe(0);
    });

    it('los videos y PDF no piden texto alternativo', async () => {
      montar();

      await elegir(crearArchivo('boletin.pdf', 'application/pdf'), crearArchivo('saludo.mp4', 'video/mp4'));

      expect(await screen.findByRole('button', { name: 'Subir 2 archivos' })).toBeInTheDocument();
      expect(screen.queryByLabelText(/Texto alternativo/)).not.toBeInTheDocument();
    });

    it('sube varios archivos, uno tras otro', async () => {
      montar();
      await elegir(crearArchivo('uno.jpg', 'image/jpeg'), crearArchivo('dos.png', 'image/png'));

      await userEvent.click(await screen.findByRole('button', { name: 'Subir 2 archivos' }));

      // Se suben de a uno: hay que esperar a que terminen los dos (findAllBy resuelve con el primero).
      await waitFor(() => expect(screen.getAllByText('Subido')).toHaveLength(2));
      const { paginacion } = await clienteHttp.get('/admin/multimedia');
      expect(paginacion.total).toBe(16);
    });

    it('permite quitar un archivo de la lista antes de subirlo', async () => {
      montar();
      await elegir(crearArchivo('uno.jpg', 'image/jpeg'));

      await userEvent.click(await screen.findByRole('button', { name: 'Quitar uno.jpg' }));

      expect(screen.queryByText('uno.jpg')).not.toBeInTheDocument();
    });

    it('«Quitar los ya subidos» limpia la lista', async () => {
      montar();
      await elegir(crearArchivo('uno.jpg', 'image/jpeg'));
      await userEvent.click(await screen.findByRole('button', { name: 'Subir 1 archivo' }));
      await screen.findByText('Subido');

      await userEvent.click(screen.getByRole('button', { name: 'Quitar los ya subidos' }));

      expect(screen.queryByRole('list', { name: 'Archivos por subir' })).not.toBeInTheDocument();
    });

    it('no admite elegir más archivos mientras se sube', async () => {
      let liberar;
      server.use(
        http.post(api('/admin/multimedia'), async () => {
          await new Promise((resolver) => {
            liberar = resolver;
          });
          return errorDelServidor(500, 'ERROR_INTERNO', 'Error interno del servidor.');
        }),
      );
      montar();
      await elegir(crearArchivo('uno.jpg', 'image/jpeg'));
      await userEvent.click(await screen.findByRole('button', { name: 'Subir 1 archivo' }));

      expect(await screen.findByText('Subiendo…')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Seleccionar archivos' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Subiendo archivos…' })).toBeDisabled();
      // Mientras sube, el archivo ya no se puede quitar ni editar.
      expect(screen.queryByRole('button', { name: 'Quitar uno.jpg' })).not.toBeInTheDocument();
      expect(screen.getByLabelText('Texto alternativo de uno.jpg')).toBeDisabled();

      liberar();
      expect(await screen.findByRole('alert')).toHaveTextContent('Error interno del servidor.');
      expect(screen.getByRole('button', { name: 'Seleccionar archivos' })).toBeEnabled();
    });
  });

  describe('errores del servidor', () => {
    it.each([
      [413, 'ARCHIVO_DEMASIADO_GRANDE', 'Las imágenes pueden pesar hasta 30 MB.'],
      [415, 'TIPO_NO_PERMITIDO', 'El contenido del archivo no corresponde a un tipo permitido.'],
      [409, 'CONFLICTO', 'El almacenamiento está casi lleno.'],
    ])('muestra el error %i con el mensaje del servidor y permite reintentar', async (estado, codigo, mensaje) => {
      // El navegador no ve el contenido real: el servidor puede rechazar lo que el cliente dejó pasar.
      server.use(http.post(api('/admin/multimedia'), () => errorDelServidor(estado, codigo, mensaje), { once: true }));
      montar();
      await elegir(crearArchivo('rara.jpg', 'image/jpeg'));

      await userEvent.click(await screen.findByRole('button', { name: 'Subir 1 archivo' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(mensaje);

      // Reintentar (ahora el servidor responde bien).
      await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
      expect(await screen.findByText('Subido')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('un error en un archivo no impide subir los demás', async () => {
      server.use(
        http.post(api('/admin/multimedia'), () => errorDelServidor(415, 'TIPO_NO_PERMITIDO', 'Tipo real no permitido.'), {
          once: true,
        }),
      );
      montar();
      await elegir(crearArchivo('primero.jpg', 'image/jpeg'), crearArchivo('segundo.png', 'image/png'));

      await userEvent.click(await screen.findByRole('button', { name: 'Subir 2 archivos' }));

      expect(await screen.findByText('Subido')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent('Tipo real no permitido.');
    });
  });
});
