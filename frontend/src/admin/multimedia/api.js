// Llamadas de la biblioteca multimedia (docs/api/admin.md §2).
import { clienteHttp } from '../../services/clienteHttp.js';
import { subirFormulario } from './subidaXhr.js';

export const CLAVE_MULTIMEDIA = ['admin', 'multimedia'];
export const POR_PAGINA = 12;

export const ORDENES = {
  '-fechaSubida': 'Más recientes',
  fechaSubida: 'Más antiguos',
  '-tamanoBytes': 'Mayor tamaño',
  tamanoBytes: 'Menor tamaño',
};

// Sube un archivo como multipart/form-data, con XMLHttpRequest para informar el avance (subidaXhr.js).
//   onProgreso(porcentaje): 0 a 100 de lo enviado. senal: AbortSignal para cancelar la subida.
export async function subirArchivo({ archivo, textoAlternativo, onProgreso, senal }) {
  const formulario = new FormData();
  formulario.append('archivo', archivo);
  if (textoAlternativo) formulario.append('textoAlternativo', textoAlternativo);

  const { datos } = await subirFormulario('/admin/multimedia', formulario, { onProgreso, senal });
  return datos;
}

// Cambia solo el texto alternativo (permiso multimedia.subir). `null` lo borra.
export async function actualizarTextoAlternativo(id, textoAlternativo) {
  const { datos } = await clienteHttp.patch(`/admin/multimedia/${id}`, { textoAlternativo });
  return datos;
}

// Borra el archivo de la base y del bucket (permiso multimedia.eliminar). Responde 409 si está en uso.
export function eliminarArchivo(id) {
  return clienteHttp.delete(`/admin/multimedia/${id}`);
}

export function listarMultimedia({ buscar, clase, enUso, orden, pagina, porPagina = POR_PAGINA }, senal) {
  return clienteHttp.get('/admin/multimedia', {
    parametros: { buscar, clase, enUso, orden, pagina, porPagina },
    senal,
  });
}
