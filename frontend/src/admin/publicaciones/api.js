// Llamadas de las publicaciones del panel (docs/api/admin.md §3).
import { clienteHttp } from '../../services/clienteHttp.js';

export const CLAVE_PUBLICACIONES = ['admin', 'publicaciones'];
export const POR_PAGINA = 8;

// Los avisos son de otra pantalla: esta lista solo trae noticias y notas de prensa.
export const TIPOS_DE_ESTA_PANTALLA = {
  NOTICIA: 'Noticia',
  NOTA_DE_PRENSA: 'Nota de prensa',
};

export const ESTADOS = {
  BORRADOR: 'Borrador',
  EN_REVISION: 'En revisión',
  PUBLICADO: 'Publicado',
  ARCHIVADO: 'Archivado',
};

export function listarPublicaciones({ estado, tipo, buscar, autor, pagina, porPagina = POR_PAGINA }, senal) {
  return clienteHttp.get('/admin/publicaciones', {
    parametros: {
      estado,
      tipo: tipo || Object.keys(TIPOS_DE_ESTA_PANTALLA).join(','),
      buscar,
      autor,
      pagina,
      porPagina,
    },
    senal,
  });
}
