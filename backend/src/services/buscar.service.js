// Búsqueda de texto completo del portal (OLA-2.md §2).
import * as modelo from '../models/buscar.model.js';
import { formatearFechaHora, imagen } from '../utils/formato.js';
import { armarPaginacion, desplazamiento } from '../utils/paginacion.js';
import { TIPOS_BUSQUEDA } from '../validacion/buscar.js';

const INICIO_MARCA = '\u0002';
const FIN_MARCA = '\u0003';

export function aSegmentosFragmento(textoCrudo, respaldo = '') {
  const fuente = typeof textoCrudo === 'string' && textoCrudo.length > 0 ? textoCrudo : respaldo;
  if (!fuente) return [];

  const segmentos = [];
  let cursor = 0;

  while (cursor < fuente.length) {
    const inicio = fuente.indexOf(INICIO_MARCA, cursor);
    if (inicio === -1) {
      const resto = fuente.slice(cursor);
      if (resto) segmentos.push({ texto: resto, resaltado: false });
      break;
    }

    if (inicio > cursor) {
      segmentos.push({ texto: fuente.slice(cursor, inicio), resaltado: false });
    }

    const fin = fuente.indexOf(FIN_MARCA, inicio + 1);
    if (fin === -1) {
      const resto = fuente.slice(inicio + 1);
      if (resto) segmentos.push({ texto: resto, resaltado: false });
      break;
    }

    const marcado = fuente.slice(inicio + 1, fin);
    if (marcado) segmentos.push({ texto: marcado, resaltado: true });
    cursor = fin + 1;
  }

  return segmentos;
}

function aResultado(fila) {
  return {
    tipo: fila.tipo,
    id: fila.id,
    titulo: fila.titulo,
    fragmento: aSegmentosFragmento(fila.fragmento_crudo, fila.texto_resumen?.slice(0, 160) ?? ''),
    url: fila.url,
    fecha: formatearFechaHora(fila.fecha),
    imagen: imagen({
      id: fila.imagen_id,
      url: fila.imagen_url,
      textoAlternativo: fila.imagen_texto_alternativo,
      ancho: fila.imagen_ancho,
      alto: fila.imagen_alto,
    }),
  };
}

export async function buscarEnSede(sedeId, consulta) {
  const { q, tipo, desde, hasta, orden, pagina, porPagina } = consulta;
  const resultado = await modelo.buscarEnContenido(sedeId, {
    q,
    tipo,
    desde,
    hasta,
    orden,
    limite: porPagina,
    desplazamiento: desplazamiento(pagina, porPagina),
  });

  const totalesPorTipo = Object.fromEntries(TIPOS_BUSQUEDA.map((t) => [t, 0]));
  for (const item of resultado.totales ?? []) {
    if (item.tipo in totalesPorTipo) totalesPorTipo[item.tipo] = item.total;
  }

  return {
    datos: (resultado.filas ?? []).map(aResultado),
    paginacion: armarPaginacion({ total: resultado.total ?? 0, pagina, porPagina }),
    totalesPorTipo,
  };
}
