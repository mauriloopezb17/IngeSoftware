// Grupos pastorales (contrato: docs/api/publico.md).
import * as modelo from '../models/gruposPastorales.model.js';
import { imagen } from '../utils/formato.js';
import { armarPaginacion, desplazamiento } from '../utils/paginacion.js';

function aGrupo(fila) {
  return {
    id: fila.id,
    nombre: fila.nombre,
    descripcion: fila.descripcion,
    horarioReunion: fila.horario_reunion,
    contacto: fila.contacto,
    icono: fila.icono,
    imagen: imagen({
      id: fila.imagen_id,
      url: fila.imagen_url,
      textoAlternativo: fila.imagen_texto_alternativo,
      ancho: fila.imagen_ancho,
      alto: fila.imagen_alto,
    }),
    orden: fila.orden,
  };
}

// GET /api/sedes/:sede/grupos-pastorales
export async function listarGruposPastorales(sedeId, consulta = {}) {
  const pagina = consulta.pagina ?? 1;
  const porPagina = consulta.porPagina ?? 10;
  const { filas, total } = await modelo.listarVisibles(sedeId, {
    buscar: consulta.buscar,
    orden: consulta.orden,
    limite: porPagina,
    desplazamiento: desplazamiento(pagina, porPagina),
  });
  return {
    datos: filas.map(aGrupo),
    paginacion: armarPaginacion({ total, pagina, porPagina }),
  };
}
