// Llamadas de la biblioteca multimedia (docs/api/admin.md §2).
import { clienteHttp } from '../../services/clienteHttp.js';

export const CLAVE_MULTIMEDIA = ['admin', 'multimedia'];
export const POR_PAGINA = 12;

export const ORDENES = {
  '-fechaSubida': 'Más recientes',
  fechaSubida: 'Más antiguos',
  '-tamanoBytes': 'Mayor tamaño',
  tamanoBytes: 'Menor tamaño',
};

// Sube un archivo como multipart/form-data. clienteHttp omite el Content-Type para que el
// navegador ponga el boundary. `fetch` no informa el avance de la subida.
export async function subirArchivo({ archivo, textoAlternativo }) {
  const formulario = new FormData();
  formulario.append('archivo', archivo);
  if (textoAlternativo) formulario.append('textoAlternativo', textoAlternativo);

  const { datos } = await clienteHttp.post('/admin/multimedia', formulario);
  return datos;
}

export function listarMultimedia({ buscar, clase, enUso, orden, pagina }, senal) {
  return clienteHttp.get('/admin/multimedia', {
    parametros: { buscar, clase, enUso, orden, pagina, porPagina: POR_PAGINA },
    senal,
  });
}
