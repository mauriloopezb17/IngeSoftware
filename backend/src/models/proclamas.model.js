// Consultas de proclamas matrimoniales (SQL parametrizado). RF-02.
// Solo cuentan las publicaciones cuya fecha ya llegó (hoy en Bolivia o antes); una proclama sin
// ninguna publicación alcanzada todavía no es pública.
import { consultar } from '../db/index.js';
import { ZONA_HORARIA } from './eventos.model.js';

// $1 = sede, $2 = zona horaria. Las publicaciones alcanzadas se agregan en la misma consulta.
const BASE = `
  SELECT p.id,
         p.nombre_contrayente_1,
         p.nombre_contrayente_2,
         p.fecha_matrimonio,
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
   WHERE p.sede_id = $1`;

// Vigentes: con alguna publicación alcanzada y cuya boda todavía no pasó. Por fecha de boda.
export async function listarVigentes(sedeId) {
  const { rows } = await consultar(
    `${BASE} AND p.fecha_matrimonio > now() ORDER BY p.fecha_matrimonio, p.id`,
    [sedeId, ZONA_HORARIA],
  );
  return rows;
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
