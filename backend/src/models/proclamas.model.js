// Consultas de proclamas matrimoniales (SQL parametrizado). RF-02.
// Solo cuentan las publicaciones cuya fecha ya llegó (hoy en Bolivia o antes); una proclama sin
// ninguna publicación alcanzada todavía no es pública.
import { consultar } from '../db/index.js';
import { patronBusqueda, sinAcentosSql } from '../utils/busqueda.js';
import { ZONA_HORARIA } from './eventos.model.js';

// $1 = sede, $2 = zona horaria. Las publicaciones alcanzadas se agregan en la misma consulta.
const BASE = `
  SELECT p.id,
         p.nombre_contrayente_1,
         p.nombre_contrayente_2,
         p.fecha_matrimonio,
         p.imagen_id,
         am.url AS imagen_url,
         am.texto_alternativo AS imagen_texto_alternativo,
         am.ancho_px AS imagen_ancho,
         am.alto_px AS imagen_alto,
         p.detalle,
         pub.ultima AS numero_proclama,
         pub.lista AS publicaciones
    FROM proclama p
    JOIN LATERAL (
          SELECT max(pp.numero_proclama) AS ultima,
                 json_agg(json_build_object('numero', pp.numero_proclama, 'fecha', pp.fecha_publicacion)
                          ORDER BY pp.numero_proclama) AS lista
            FROM proclama_publicacion pp
           WHERE pp.proclama_id = p.id
             AND pp.fecha_publicacion <= (now() AT TIME ZONE $2)::date
         ) pub ON pub.ultima IS NOT NULL
    LEFT JOIN archivo_multimedia am ON am.id = p.imagen_id
   WHERE p.sede_id = $1`;

const ORDENES_PROCLAMA = {
  fechaMatrimonio: 'p.fecha_matrimonio ASC, p.id ASC',
  '-fechaMatrimonio': 'p.fecha_matrimonio DESC, p.id DESC',
};

// Vigentes: con alguna publicación alcanzada y cuya boda todavía no pasó.
export async function listarVigentes(
  sedeId,
  { anio, buscar, orden = 'fechaMatrimonio', limite = null, desplazamiento = 0 } = {},
) {
  const parametros = [sedeId, ZONA_HORARIA];
  const filtros = ['p.fecha_matrimonio > now()'];
  if (anio) {
    filtros.push(
      `extract(year FROM p.fecha_matrimonio AT TIME ZONE $2) = $${parametros.push(anio)}`,
    );
  }
  if (buscar) {
    const p = `$${parametros.push(patronBusqueda(buscar))}`;
    filtros.push(
      `(${sinAcentosSql('p.nombre_contrayente_1')} LIKE ${p} ESCAPE '\\' OR ${sinAcentosSql('p.nombre_contrayente_2')} LIKE ${p} ESCAPE '\\')`,
    );
  }
  const dondeExtra = ` AND ${filtros.join(' AND ')}`;
  const clausulaOrden = ORDENES_PROCLAMA[orden] ?? ORDENES_PROCLAMA.fechaMatrimonio;

  if (limite === null) {
    const { rows } = await consultar(`${BASE}${dondeExtra} ORDER BY ${clausulaOrden}`, parametros);
    return { filas: rows, total: rows.length };
  }

  const [pagina, conteo] = await Promise.all([
    consultar(
      `${BASE}${dondeExtra} ORDER BY ${clausulaOrden} LIMIT $${parametros.length + 1} OFFSET $${parametros.length + 2}`,
      [...parametros, limite, desplazamiento],
    ),
    consultar(`SELECT count(*)::int AS total FROM (${BASE}${dondeExtra}) t`, parametros),
  ]);
  return { filas: pagina.rows, total: conteo.rows[0].total };
}

// Historial: todas las que tuvieron alguna publicación, incluidas las ya celebradas.
// anio (opcional) filtra por el año de la boda en Bolivia. De la más reciente a la más antigua.
export async function listarHistorial(sedeId, { anio, limite, desplazamiento }) {
  const parametros = [sedeId, ZONA_HORARIA];
  const filtroAnio = anio
    ? ` AND extract(year FROM p.fecha_matrimonio AT TIME ZONE $2) = $${parametros.push(anio)}`
    : '';

  const [pagina, conteo] = await Promise.all([
    consultar(
      `${BASE}${filtroAnio}
        ORDER BY p.fecha_matrimonio DESC, p.id DESC
        LIMIT $${parametros.length + 1} OFFSET $${parametros.length + 2}`,
      [...parametros, limite, desplazamiento],
    ),
    consultar(`SELECT count(*)::int AS total FROM (${BASE}${filtroAnio}) t`, parametros),
  ]);

  return { filas: pagina.rows, total: conteo.rows[0].total };
}

export async function buscarDetallePorId(sedeId, id) {
  const { rows } = await consultar(`${BASE} AND p.id = $3`, [sedeId, ZONA_HORARIA, id]);
  return rows[0];
}

export async function archivosPorIds(sedeId, ids) {
  if (!ids?.length) return [];
  const { rows } = await consultar(
    `SELECT id, url, tipo_mime, texto_alternativo, ancho_px, alto_px
       FROM archivo_multimedia
      WHERE sede_id = $1 AND id = ANY($2::int[])`,
    [sedeId, ids],
  );
  return rows;
}
