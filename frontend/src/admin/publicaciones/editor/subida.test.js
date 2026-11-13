import { beforeEach, describe, expect, it } from 'vitest';

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
});
