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

export function listarMultimedia({ buscar, clase, enUso, orden, pagina }, senal) {
  return clienteHttp.get('/admin/multimedia', {
    parametros: { buscar, clase, enUso, orden, pagina, porPagina: POR_PAGINA },
    senal,
  });
}
