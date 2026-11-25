import { Readable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';

const falloDisco = Object.assign(new Error('ENOSPC: no space left on device'), {
  code: 'ENOSPC',
  errno: -28,
  syscall: 'mkdir',
});

vi.mock('node:fs/promises', async (importOriginal) => {
  const real = await importOriginal();
  return {
    ...real,
    mkdir: vi.fn().mockRejectedValue(falloDisco),
  };
});

const { recibirArchivo } = await import('../../src/middlewares/recibirArchivo.js');

describe('recibirArchivo ante errores de disco', () => {
  it('registra la causa en el log y responde 503 con el mensaje del contrato', async () => {
    const limite = '----limite-prueba';
    const cuerpo = [
      `--${limite}`,
      'Content-Disposition: form-data; name="archivo"; filename="foto.jpg"',
      'Content-Type: image/jpeg',
      '',
      'contenido',
      `--${limite}--`,
      '',
    ].join('\r\n');

    const req = Readable.from([Buffer.from(cuerpo)]);
    req.headers = {
      'content-type': `multipart/form-data; boundary=${limite}`,
      'content-length': String(Buffer.byteLength(cuerpo)),
    };
    req.is = (tipo) => tipo === 'multipart/form-data';
    req.log = { error: vi.fn() };

    const res = { once: vi.fn() };

    const error = await new Promise((resolver) => {
      recibirArchivo(req, res, resolver);
    });

    expect(req.log.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: falloDisco, codigo: 'ENOSPC', llamada: 'mkdir' }),
      expect.any(String),
    );
    expect(error).toMatchObject({
      estado: 503,
      codigo: 'SERVICIO_NO_DISPONIBLE',
      message: 'No pudimos recibir el archivo. Intenta de nuevo.',
    });
  });
});
