// Próximos eventos del calendario parroquial (contrato: docs/api/publico.md, RF-09).
import { ESTADOS_PUBLICACION } from '../constantes/catalogos.js';
import { ErrorApp } from '../errores/ErrorApp.js';
import * as modelo from '../models/eventos.model.js';
import { formatearFechaHora, imagen, urlPublica } from '../utils/formato.js';
import { armarPaginacion, desplazamiento } from '../utils/paginacion.js';
import { id as esquemaId } from '../validacion/comunes.js';

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
    tieneDetalle: Boolean(fila.tiene_detalle),
  };
}

function resolverBloques(bloques = []) {
  return bloques.map((bloque) => {
    const actualizado =
      (bloque.type === 'image' || bloque.type === 'video') && bloque.props?.url
        ? {
            ...bloque,
            props: {
              ...bloque.props,
              url: urlPublica(bloque.props.url) ?? bloque.props.url,
            },
          }
        : bloque;
    if (!actualizado.children?.length) return actualizado;
    return { ...actualizado, children: resolverBloques(actualizado.children) };
  });
}

function resolverDetalle(detalle) {
  if (!detalle) return null;
  if (!detalle.contenido?.bloques) return detalle;
  return {
    ...detalle,
    contenido: {
      ...detalle.contenido,
      bloques: resolverBloques(detalle.contenido.bloques),
    },
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

// GET /api/sedes/:sede/eventos/:id
export async function obtenerEvento(sedeId, rawId) {
  const idValidado = esquemaId.safeParse(rawId);
  const fila = idValidado.success
    ? await modelo.obtenerPublicadoPorId({
        sedeId,
        estadoPublicado: ESTADOS_PUBLICACION.nombreDe('PUBLICADO'),
        id: idValidado.data,
      })
    : null;

  if (!fila) {
    throw ErrorApp.noEncontrado(`No existe el evento «${String(rawId).slice(0, 120)}».`);
  }

  return { ...aEvento(fila), detalle: resolverDetalle(fila.detalle) };
}
