import { describe, expect, it } from 'vitest';

import { ACCEPT_ARCHIVOS, RESUMEN_DE_LIMITES, tipoDelArchivo, validarArchivoCliente } from './validacion.js';

const MB = 1024 * 1024;

function archivo(nombre, tipo, tamano = 100) {
  const f = new File(['x'], nombre, { type: tipo });
  Object.defineProperty(f, 'size', { value: tamano }); // evita crear archivos enormes
  return f;
}

describe('validación de archivos en el cliente', () => {
  it.each([
    ['foto.jpg', 'image/jpeg'],
    ['foto.png', 'image/png'],
    ['foto.webp', 'image/webp'],
    ['video.mp4', 'video/mp4'],
    ['video.webm', 'video/webm'],
    ['boletin.pdf', 'application/pdf'],
  ])('acepta %s (%s)', (nombre, tipo) => {
    expect(validarArchivoCliente(archivo(nombre, tipo))).toBeNull();
  });

  it.each([
    ['animacion.gif', 'image/gif'],
    ['logo.svg', 'image/svg+xml'],
    ['programa.exe', 'application/x-msdownload'],
    ['notas.txt', 'text/plain'],
    ['hoja.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    ['foto.bmp', 'image/bmp'],
  ])('rechaza %s (%s) por su tipo', (nombre, tipo) => {
    const error = validarArchivoCliente(archivo(nombre, tipo));

    expect(error.codigo).toBe('TIPO_NO_PERMITIDO');
    expect(error.mensaje).toMatch(/JPG, PNG o WebP.*MP4 o WebM.*PDF/);
  });

  it('usa el tipo declarado, no la extensión, cuando el navegador lo informa', () => {
    // Un GIF renombrado como .jpg sigue siendo image/gif para el navegador.
    expect(validarArchivoCliente(archivo('engaño.jpg', 'image/gif')).codigo).toBe('TIPO_NO_PERMITIDO');
  });

  it('si el sistema no informa el tipo, se apoya en la extensión', () => {
    expect(tipoDelArchivo(archivo('FOTO.JPG', ''))).toBe('image/jpeg');
    expect(validarArchivoCliente(archivo('foto.jpeg', ''))).toBeNull();
    expect(validarArchivoCliente(archivo('programa.exe', '')).codigo).toBe('TIPO_NO_PERMITIDO');
    expect(validarArchivoCliente(archivo('sin-extension', '')).codigo).toBe('TIPO_NO_PERMITIDO');
  });

  describe('tamaño', () => {
    it('acepta justo el límite de cada clase', () => {
      expect(validarArchivoCliente(archivo('a.jpg', 'image/jpeg', 30 * MB))).toBeNull();
      expect(validarArchivoCliente(archivo('a.pdf', 'application/pdf', 50 * MB))).toBeNull();
      expect(validarArchivoCliente(archivo('a.mp4', 'video/mp4', 2048 * MB))).toBeNull();
    });

    it('rechaza una imagen de más de 30 MB con el mensaje del contrato', () => {
      const error = validarArchivoCliente(archivo('a.jpg', 'image/jpeg', 30 * MB + 1));

      expect(error.codigo).toBe('ARCHIVO_DEMASIADO_GRANDE');
      expect(error.mensaje).toBe('Pesa 30 MB. Las imágenes pueden pesar hasta 30 MB.');
    });

    it('rechaza un PDF de más de 50 MB y un video de más de 2 GB', () => {
      expect(validarArchivoCliente(archivo('a.pdf', 'application/pdf', 51 * MB)).mensaje).toBe(
        'Pesa 51 MB. Los documentos PDF pueden pesar hasta 50 MB.',
      );
      expect(validarArchivoCliente(archivo('a.webm', 'video/webm', 3 * 1024 * MB)).mensaje).toBe(
        'Pesa 3 GB. Los videos pueden pesar hasta 2 GB.',
      );
    });

    it('el límite depende de la clase: 40 MB sirven para un PDF pero no para una imagen', () => {
      expect(validarArchivoCliente(archivo('a.pdf', 'application/pdf', 40 * MB))).toBeNull();
      expect(validarArchivoCliente(archivo('a.png', 'image/png', 40 * MB)).codigo).toBe('ARCHIVO_DEMASIADO_GRANDE');
    });

    it('rechaza un archivo vacío', () => {
      expect(validarArchivoCliente(archivo('a.jpg', 'image/jpeg', 0)).codigo).toBe('ARCHIVO_VACIO');
    });
  });

  it('el selector de archivos solo ofrece los tipos permitidos', () => {
    expect(ACCEPT_ARCHIVOS).toContain('.webp');
    expect(ACCEPT_ARCHIVOS).toContain('application/pdf');
    expect(ACCEPT_ARCHIVOS).not.toMatch(/gif|svg/);
  });

  it('resume los límites para mostrarlos al usuario', () => {
    expect(RESUMEN_DE_LIMITES).toBe('JPG, PNG, WebP hasta 30 MB · MP4, WebM hasta 2 GB · PDF hasta 50 MB');
  });
});
