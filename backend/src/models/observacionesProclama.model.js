// Consultas de observaciones confidenciales sobre proclamas matrimoniales (SQL parametrizado).
import { consultar } from '../db/index.js';
import { patronBusqueda, sinAcentosSql } from '../utils/busqueda.js';

const COLUMNAS = `
  o.id,
  o.proclama_id,
  p.sede_id,
  p.nombre_contrayente_1,
  p.nombre_contrayente_2,
  o.nombre_completo,
  o.correo,
  o.telefono,
  o.mensaje,
  o.fecha_envio,
  o.leido_en,
  o.leido_por`;

const UNIONES = 'FROM observacion_proclama o JOIN proclama p ON p.id = o.proclama_id';

export async function insertar({ proclamaId, nombreCompleto, correo, telefono, mensaje }) {
  const { rows } = await consultar(
    `INSERT INTO observacion_proclama
       (proclama_id, nombre_completo, correo, telefono, mensaje)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [proclamaId, nombreCompleto, correo ?? null, telefono ?? null, mensaje],
  );
  return rows[0];
}

// buscar: en el nombre de quien escribe y en el mensaje, sin distinguir mayúsculas ni acentos.
export async function listar({ sedeId, estado, proclamaId, buscar }, { limite, desplazamiento }) {
  const parametros = [];
  const condiciones = ['TRUE'];
  const agregar = (valor) => `$${parametros.push(valor)}`;

  if (sedeId !== undefined) condiciones.push(`p.sede_id = ${agregar(sedeId)}`);
  if (estado === 'no-leidas') condiciones.push('o.leido_en IS NULL');
  if (proclamaId !== undefined) condiciones.push(`o.proclama_id = ${agregar(proclamaId)}`);
  if (buscar) {
    const p = agregar(patronBusqueda(buscar));
    condiciones.push(
      `(${sinAcentosSql('o.nombre_completo')} LIKE ${p} ESCAPE '\\' OR ${sinAcentosSql('o.mensaje')} LIKE ${p} ESCAPE '\\')`,
    );
  }

  const donde = condiciones.join(' AND ');

  const [pagina, conteo] = await Promise.all([
    consultar(
      `SELECT ${COLUMNAS} ${UNIONES}
        WHERE ${donde}
        ORDER BY o.fecha_envio DESC, o.id DESC
        LIMIT $${parametros.length + 1} OFFSET $${parametros.length + 2}`,
      [...parametros, limite, desplazamiento],
    ),
    consultar(`SELECT count(*)::int AS total ${UNIONES} WHERE ${donde}`, parametros),
  ]);

  return { filas: pagina.rows, total: conteo.rows[0].total };
}

export async function contarNoLeidas(sedeId) {
  const parametros = [];
  const filtroSede = sedeId !== undefined ? `AND p.sede_id = $${parametros.push(sedeId)}` : '';
  const { rows } = await consultar(
    `SELECT count(*)::int AS total ${UNIONES}
      WHERE o.leido_en IS NULL ${filtroSede}`,
    parametros,
  );
  return rows[0].total;
}

export async function buscarPorId(id, db = { consultar }) {
  const { rows } = await db.consultar(`SELECT ${COLUMNAS} ${UNIONES} WHERE o.id = $1`, [id]);
  return rows[0];
}

export async function marcarLeida(id, usuarioId, leida) {
  await consultar(
    `UPDATE observacion_proclama
        SET leido_en = CASE WHEN $2 THEN COALESCE(leido_en, now()) ELSE NULL END,
            leido_por = CASE WHEN $2 THEN COALESCE(leido_por, $3) ELSE NULL END
      WHERE id = $1`,
    [id, leida, usuarioId],
  );
  return buscarPorId(id);
}

export async function eliminar(id, db = { consultar }) {
  const { rows } = await db.consultar(
    'DELETE FROM observacion_proclama WHERE id = $1 RETURNING id',
    [id],
  );
  return rows[0];
}
