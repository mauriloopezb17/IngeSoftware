// Boletines parroquiales en PDF (contrato: docs/api/publico.md, RF-06).
import * as modelo from '../models/boletines.model.js';
import { archivo, formatearFecha, formatearFechaHora } from '../utils/formato.js';
import { armarPaginacion, desplazamiento } from '../utils/paginacion.js';

function aBoletin(fila) {
  return {
    id: fila.id,
    titulo: fila.titulo,
    periodo: formatearFecha(fila.periodo),
    fechaPublicacion: formatearFechaHora(fila.fecha_publicacion),
    archivo: archivo({
      id: fila.archivo_id,
      url: fila.archivo_url,
      nombreOriginal: fila.archivo_nombre_original,
      tipoMime: fila.archivo_tipo_mime,
      tamanoBytes: fila.archivo_tamano_bytes,
    }),
  };
}

// GET /api/sedes/:sede/boletines. consulta: { anio?, pagina, porPagina }
export async function listarBoletines(sedeId, { anio, pagina, porPagina }) {
  const { filas, total } = await modelo.listarPublicados(sedeId, {
    anio,
    limite: porPagina,
    desplazamiento: desplazamiento(pagina, porPagina),
  });

  return {
    datos: filas.map(aBoletin),
    paginacion: armarPaginacion({ total, pagina, porPagina }),
  };
}
