// Próximos eventos del calendario parroquial (contrato: docs/api/publico.md, RF-09).
import { ESTADOS_PUBLICACION } from '../constantes/catalogos.js';
import * as modelo from '../models/eventos.model.js';
import { formatearFechaHora, imagen } from '../utils/formato.js';
import { armarPaginacion, desplazamiento } from '../utils/paginacion.js';

function aEvento(fila) {
  return {
    id: fila.id,
    titulo: fila.titulo,
    descripcion: fila.descripcion,
    lugar: fila.lugar,
    fechaInicio: formatearFechaHora(fila.fecha_inicio),
    fechaFin: formatearFechaHora(fila.fecha_fin),
    todoElDia: fila.todo_el_dia,
    categoria: fila.categoria,
    imagen: imagen({
      id: fila.imagen_id,
      url: fila.imagen_url,
      textoAlternativo: fila.imagen_texto_alternativo,
      ancho: fila.imagen_ancho,
      alto: fila.imagen_alto,
    }),
  };
}

// GET /api/sedes/:sede/eventos
// consulta: { desde?, hasta? (YYYY-MM-DD), categoria?: ids, pagina, porPagina }
export async function listarEventos(sedeId, consulta) {
  const { pagina, porPagina } = consulta;

  const { filas, total } = await modelo.listarProximos(
    {
      sedeId,
      estadoPublicado: ESTADOS_PUBLICACION.nombreDe('PUBLICADO'),
      desde: consulta.desde,
      hasta: consulta.hasta,
      categorias: consulta.categoria,
    },
    { limite: porPagina, desplazamiento: desplazamiento(pagina, porPagina) },
  );

  return {
    datos: filas.map(aEvento),
    paginacion: armarPaginacion({ total, pagina, porPagina }),
  };
}
