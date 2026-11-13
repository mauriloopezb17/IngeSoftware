import { beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse, delay } from 'msw';

import { api } from '../../../mocks/api.js';
import { server } from '../../../mocks/server.js';
import { fueCancelada } from '../../multimedia/subidaXhr.js';

import { clienteHttp } from '../../../services/clienteHttp.js';
import { reiniciarMocksAdmin } from '../../mocks/handlers.js';
import { buscarArchivoPorUrl } from '../../mocks/multimediaMock.js';
import { CONTRASENA_DESARROLLO } from '../../mocks/usuarios.js';
import { propiedadesDeArchivo, subirArchivoDelEditor } from './subida.js';

const archivo = (nombre, tipo, tamano = 10) => new File([new Uint8Array(tamano)], nombre, { type: tipo });

describe('subida de archivos desde el editor', () => {
  beforeEach(async () => {
    reiniciarMocksAdmin();
    await clienteHttp.post('/auth/login', { correo: 'marketing@parroquia.test', contrasena: CONTRASENA_DESARROLLO });
  });

  it('sube la imagen a la biblioteca y devuelve las propiedades del bloque con la url de la API', async () => {
    const resultado = await subirArchivoDelEditor(archivo('procesion.png', 'image/png'));

    expect(resultado.props.name).toEqual(expect.any(String));
    expect(resultado.props.caption).toBe('');
    // La url es la de la biblioteca: la API aceptará el bloque.
    expect(buscarArchivoPorUrl(resultado.props.url)).not.toBeNull();
  });

  it('acepta videos', async () => {
    const resultado = await subirArchivoDelEditor(archivo('recorrido.mp4', 'video/mp4'));

    expect(buscarArchivoPorUrl(resultado.props.url)).not.toBeNull();
  });

  it('rechaza los documentos PDF y otros tipos sin llamar a la API', async () => {
    await expect(subirArchivoDelEditor(archivo('acta.pdf', 'application/pdf'))).rejects.toThrow(/imágenes.*videos/);
    await expect(subirArchivoDelEditor(archivo('script.exe', 'application/octet-stream'))).rejects.toThrow(/imágenes.*videos/);
  });

  it('rechaza un archivo vacío', async () => {
    await expect(subirArchivoDelEditor(archivo('vacia.png', 'image/png', 0))).rejects.toThrow(/vacío/);
  });

  it('propiedadesDeArchivo usa el texto alternativo como pie de foto', () => {
    expect(
      propiedadesDeArchivo({ url: '/media/seed/a.webp', nombreOriginal: 'a.webp', textoAlternativo: 'Templo' }),
    ).toEqual({ url: '/media/seed/a.webp', name: 'a.webp', caption: 'Templo' });
  });

  it('informa el avance y acepta el segundo argumento de BlockNote (el id del bloque) sin confundirlo con opciones', async () => {
    const avances = [];

    await subirArchivoDelEditor(archivo('a.png', 'image/png'), { onProgreso: (p) => avances.push(p) });
    expect(avances.at(-1)).toBe(100);

    // BlockNote llama a uploadFile(archivo, idDelBloque).
    const resultado = await subirArchivoDelEditor(archivo('b.png', 'image/png'), 'id-del-bloque');
    expect(buscarArchivoPorUrl(resultado.props.url)).not.toBeNull();
  });

  it('se puede cancelar con una señal: se rechaza como cancelación, no como fallo de la API', async () => {
    server.use(
      http.post(api('/admin/multimedia'), async () => {
        await delay(5000);
        return HttpResponse.json({ datos: {} }, { status: 201 });
      }),
    );
    const control = new AbortController();

    const promesa = subirArchivoDelEditor(archivo('lenta.png', 'image/png'), { senal: control.signal });
    setTimeout(() => control.abort(), 50);

    expect(fueCancelada(await promesa.catch((e) => e))).toBe(true);
  });
});
