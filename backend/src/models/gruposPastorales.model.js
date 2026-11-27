// Consultas de grupos pastorales (SQL parametrizado).
import { consultar } from '../db/index.js';
import { patronBusqueda, sinAcentosSql } from '../utils/busqueda.js';

const ORDENES_PORTAL = {
  orden: 'g.orden ASC, g.id ASC',
  '-orden': 'g.orden DESC, g.id DESC',
  nombre: 'g.nombre ASC, g.id ASC',
  '-nombre': 'g.nombre DESC, g.id DESC',
};

const COLUMNAS_PORTAL = `
  g.id,
  g.slug,
  g.nombre,
  g.descripcion,
  g.horario_reunion,
  g.responsable,
  g.whatsapp,
  g.correo,
  g.icono,
  g.detalle,
  g.orden,
  am.id AS imagen_id,
  am.url AS imagen_url,
  am.texto_alternativo AS imagen_texto_alternativo,
  am.ancho_px AS imagen_ancho,
  am.alto_px AS imagen_alto`;

// Grupos visibles de una sede, paginados y con su imagen (si tiene) en la misma consulta.
export async function listarVisibles(
  sedeId,
  { buscar, orden = 'orden', limite = null, desplazamiento = 0 } = {},
) {
  const parametros = [sedeId];
  const condiciones = ['g.sede_id = $1', 'g.visible'];
  if (buscar) {
    const p = `$${parametros.push(patronBusqueda(buscar))}`;
    condiciones.push(
      `(${sinAcentosSql('g.nombre')} LIKE ${p} ESCAPE '\\' OR ${sinAcentosSql("coalesce(g.descripcion, '')")} LIKE ${p} ESCAPE '\\')`,
    );
  }
  const donde = condiciones.join(' AND ');
  const clausulaOrden = ORDENES_PORTAL[orden] ?? ORDENES_PORTAL.orden;

  const base = `
    SELECT ${COLUMNAS_PORTAL}
      FROM grupo_pastoral g
      LEFT JOIN archivo_multimedia am ON am.id = g.imagen_id
     WHERE ${donde}`;

  if (limite === null) {
    const { rows } = await consultar(`${base} ORDER BY ${clausulaOrden}`, parametros);
    return { filas: rows, total: rows.length };
  }

  const [pagina, conteo] = await Promise.all([
    consultar(
      `${base} ORDER BY ${clausulaOrden} LIMIT $${parametros.length + 1} OFFSET $${parametros.length + 2}`,
      [...parametros, limite, desplazamiento],
    ),
    consultar(`SELECT count(*)::int AS total FROM grupo_pastoral g WHERE ${donde}`, parametros),
  ]);
  return { filas: pagina.rows, total: conteo.rows[0].total };
}

export async function buscarPorSlugVisible(sedeId, slug) {
  const { rows } = await consultar(
    `SELECT ${COLUMNAS_PORTAL}
       FROM grupo_pastoral g
       LEFT JOIN archivo_multimedia am ON am.id = g.imagen_id
      WHERE g.sede_id = $1 AND g.slug = $2 AND g.visible`,
    [sedeId, slug],
  );
  return rows[0] ?? null;
}

export async function archivosPorIds(sedeId, ids) {
  if (!ids.length) return [];
  const { rows } = await consultar(
    `SELECT id, url, tipo_mime, ancho_px, alto_px, texto_alternativo
       FROM archivo_multimedia
      WHERE sede_id = $1 AND id = ANY($2::int[])`,
    [sedeId, ids],
  );
  return rows;
}

const COLUMNAS_ADMIN = `
  g.id,
  g.slug,
  g.nombre,
  g.descripcion,
  g.horario_reunion,
  g.responsable,
  g.whatsapp,
  g.correo,
  g.icono,
  g.detalle,
  g.orden,
  g.visible,
  s.id     AS sede_id,
  s.nombre AS sede_nombre,
  s.slug   AS sede_slug,
  am.id    AS imagen_id,
  am.url   AS imagen_url,
  am.texto_alternativo AS imagen_texto_alternativo,
  am.ancho_px AS imagen_ancho,
  am.alto_px  AS imagen_alto`;

const UNIONES_ADMIN = `
  FROM grupo_pastoral g
  JOIN sede s ON s.id = g.sede_id
  LEFT JOIN archivo_multimedia am ON am.id = g.imagen_id`;

export async function listarAdmin(
  { sedeSlug, sedeId, visible, buscar, orden = 'orden', limite = null, desplazamiento = 0 } = {},
  db = { consultar },
) {
  const parametros = [];
  const condiciones = ['TRUE'];
  const agregar = (valor) => {
    parametros.push(valor);
    return `$${parametros.length}`;
  };

  if (sedeSlug !== undefined) condiciones.push(`s.slug = ${agregar(sedeSlug)}`);
  if (sedeId !== undefined) condiciones.push(`g.sede_id = ${agregar(sedeId)}`);
  if (visible !== undefined) condiciones.push(`g.visible = ${agregar(visible)}`);
  if (buscar) {
    const p = agregar(patronBusqueda(buscar));
    condiciones.push(
      `(${sinAcentosSql('g.nombre')} LIKE ${p} ESCAPE '\\' OR ${sinAcentosSql("coalesce(g.descripcion, '')")} LIKE ${p} ESCAPE '\\')`,
    );
  }

  const donde = condiciones.join(' AND ');
  const clausulaOrden = ORDENES_PORTAL[orden] ?? ORDENES_PORTAL.orden;

  if (limite === null) {
    const { rows } = await db.consultar(
      `SELECT ${COLUMNAS_ADMIN} ${UNIONES_ADMIN} WHERE ${donde} ORDER BY ${clausulaOrden}`,
      parametros,
    );
    return { filas: rows, total: rows.length };
  }

  const [pagina, conteo] = await Promise.all([
    db.consultar(
      `SELECT ${COLUMNAS_ADMIN}
       ${UNIONES_ADMIN}
       WHERE ${donde}
       ORDER BY ${clausulaOrden}
       LIMIT $${parametros.length + 1} OFFSET $${parametros.length + 2}`,
      [...parametros, limite, desplazamiento],
    ),
    db.consultar(`SELECT count(*)::int AS total ${UNIONES_ADMIN} WHERE ${donde}`, parametros),
  ]);
  return { filas: pagina.rows, total: conteo.rows[0].total };
}

export async function buscarPorId(id, db = { consultar }) {
  const { rows } = await db.consultar(`SELECT ${COLUMNAS_ADMIN} ${UNIONES_ADMIN} WHERE g.id = $1`, [
    id,
  ]);
  return rows[0] ?? null;
}

export async function filaParaModificar(id, db = { consultar }) {
  const { rows } = await db.consultar('SELECT * FROM grupo_pastoral WHERE id = $1 FOR UPDATE', [
    id,
  ]);
  return rows[0] ?? null;
}

export async function existeSede(sedeId, db = { consultar }) {
  const { rows } = await db.consultar('SELECT id FROM sede WHERE id = $1', [sedeId]);
  return Boolean(rows[0]);
}

export async function slugsSimilares(sedeId, slugBase, db = { consultar }) {
  const { rows } = await db.consultar(
    'SELECT slug FROM grupo_pastoral WHERE sede_id = $1 AND (slug = $2 OR slug LIKE $3)',
    [sedeId, slugBase, `${slugBase}-%`],
  );
  return rows.map((r) => r.slug);
}

export async function crear(
  {
    sedeId,
    slug,
    imagenId,
    nombre,
    descripcion,
    horarioReunion,
    responsable,
    whatsapp,
    correo,
    icono,
    detalle,
    visible,
  },
  db = { consultar },
) {
  const { rows } = await db.consultar(
    `INSERT INTO grupo_pastoral
       (sede_id, slug, imagen_id, nombre, descripcion, horario_reunion, responsable, whatsapp, correo, icono, detalle, orden, visible)
     VALUES (
       $1,
       $2,
       $3,
       $4,
       $5,
       $6,
       $7,
       $8,
       $9,
       $10,
       $11,
       COALESCE((SELECT MAX(orden) FROM grupo_pastoral WHERE sede_id = $1), 0) + 1,
       $12
     )
     RETURNING *`,
    [
      sedeId,
      slug,
      imagenId,
      nombre,
      descripcion,
      horarioReunion,
      responsable,
      whatsapp,
      correo,
      icono,
      detalle,
      visible,
    ],
  );
  return rows[0];
}

const COLUMNAS_ACTUALIZABLES = {
  slug: 'slug',
  imagenId: 'imagen_id',
  nombre: 'nombre',
  descripcion: 'descripcion',
  horarioReunion: 'horario_reunion',
  responsable: 'responsable',
  whatsapp: 'whatsapp',
  correo: 'correo',
  icono: 'icono',
  detalle: 'detalle',
  visible: 'visible',
};

export async function actualizar(id, cambios, db = { consultar }) {
  const entradas = Object.entries(cambios).filter(
    ([clave, valor]) => clave in COLUMNAS_ACTUALIZABLES && valor !== undefined,
  );
  if (entradas.length === 0) return filaParaModificar(id, db);

  const asignaciones = entradas.map(
    ([clave], indice) => `${COLUMNAS_ACTUALIZABLES[clave]} = $${indice + 2}`,
  );
  const valores = entradas.map(([, valor]) => valor);

  const { rows } = await db.consultar(
    `UPDATE grupo_pastoral SET ${asignaciones.join(', ')} WHERE id = $1 RETURNING *`,
    [id, ...valores],
  );
  return rows[0];
}

export async function eliminar(id, db = { consultar }) {
  const { rows } = await db.consultar('DELETE FROM grupo_pastoral WHERE id = $1 RETURNING *', [id]);
  return rows[0] ?? null;
}
