// Grupos pastorales (contrato: docs/api/publico.md).
import * as modelo from '../models/gruposPastorales.model.js';
import { imagen } from '../utils/formato.js';

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
export async function listarGruposPastorales(sedeId) {
  return (await modelo.listarVisibles(sedeId)).map(aGrupo);
}
