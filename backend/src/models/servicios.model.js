// Consultas de servicios y sacramentos (SQL parametrizado).
import { consultar } from '../db/index.js';
import { patronBusqueda, sinAcentosSql } from '../utils/busqueda.js';

const COLUMNAS = 's.id, s.slug, s.nombre, s.descripcion_corta, s.icono, s.orden';

const ORDENES_PORTAL = {
  orden: 's.orden ASC, s.id ASC',
  '-orden': 's.orden DESC, s.id DESC',
  nombre: 's.nombre ASC, s.id ASC',
  '-nombre': 's.nombre DESC, s.id DESC',
};

// Servicios visibles de una sede, paginados y ordenados según lista blanca.
export async function listarVisibles(
  sedeId,
  { buscar, orden = 'orden', limite = null, desplazamiento = 0 } = {},
) {
  const parametros = [sedeId];
  const condiciones = ['s.sede_id = $1', 's.visible'];
  if (buscar) {
    const p = `$${parametros.push(patronBusqueda(buscar))}`;
    condiciones.push(
      `(${sinAcentosSql('s.nombre')} LIKE ${p} ESCAPE '\\' OR ${sinAcentosSql('s.descripcion_corta')} LIKE ${p} ESCAPE '\\')`,
    );
  }
  const donde = condiciones.join(' AND ');
  const clausulaOrden = ORDENES_PORTAL[orden] ?? ORDENES_PORTAL.orden;

  if (limite === null) {
    const { rows } = await consultar(
      `SELECT ${COLUMNAS} FROM servicio s WHERE ${donde} ORDER BY ${clausulaOrden}`,
      parametros,
    );
    return { filas: rows, total: rows.length };
  }

  const [pagina, conteo] = await Promise.all([
    consultar(
      `SELECT ${COLUMNAS}
         FROM servicio s
        WHERE ${donde}
        ORDER BY ${clausulaOrden}
        LIMIT $${parametros.length + 1} OFFSET $${parametros.length + 2}`,
      [...parametros, limite, desplazamiento],
    ),
    consultar(`SELECT count(*)::int AS total FROM servicio s WHERE ${donde}`, parametros),
  ]);
  return { filas: pagina.rows, total: conteo.rows[0].total };
}

// Servicio visible por slug, con su contenido, imagen, detalle y preguntas frecuentes activas.
export async function obtenerVisiblePorSlug(sedeId, slug) {
  const { rows } = await consultar(
    `SELECT ${COLUMNAS},
            s.contenido,
            s.detalle,
            am.id AS imagen_id,
            am.url AS imagen_url,
            am.texto_alternativo AS imagen_texto_alternativo,
            am.ancho_px AS imagen_ancho,
            am.alto_px AS imagen_alto,
            COALESCE(
              (SELECT json_agg(
                        json_build_object('id', pf.id, 'pregunta', pf.pregunta, 'respuesta', pf.respuesta)
                        ORDER BY pf.orden, pf.id)
                 FROM pregunta_frecuente pf
                WHERE pf.servicio_id = s.id AND pf.activa),
              '[]'::json
            ) AS preguntas_frecuentes
       FROM servicio s
       LEFT JOIN archivo_multimedia am ON am.id = s.imagen_id
      WHERE s.sede_id = $1 AND s.slug = $2 AND s.visible`,
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
  s.id,
  s.slug,
  s.nombre,
  s.descripcion_corta,
  s.icono,
  s.contenido,
  s.detalle,
  s.orden,
  s.visible,
  se.id     AS sede_id,
  se.nombre AS sede_nombre,
  se.slug   AS sede_slug,
  am.id     AS imagen_id,
  am.url    AS imagen_url,
  am.texto_alternativo AS imagen_texto_alternativo,
  am.ancho_px AS imagen_ancho,
  am.alto_px  AS imagen_alto,
  COALESCE(
    (SELECT json_agg(
              json_build_object(
                'id', pf.id,
                'pregunta', pf.pregunta,
                'respuesta', pf.respuesta,
                'orden', pf.orden,
                'activa', pf.activa
              )
              ORDER BY pf.orden, pf.id)
       FROM pregunta_frecuente pf
      WHERE pf.servicio_id = s.id),
    '[]'::json
  ) AS preguntas_frecuentes`;

const UNIONES_ADMIN = `
  FROM servicio s
  JOIN sede se ON se.id = s.sede_id
  LEFT JOIN archivo_multimedia am ON am.id = s.imagen_id`;

const ORDENES_ADMIN = {
  orden: 's.orden ASC, s.id ASC',
  '-orden': 's.orden DESC, s.id DESC',
  nombre: 's.nombre ASC, s.id ASC',
  '-nombre': 's.nombre DESC, s.id DESC',
};

// Lista servicios para el panel CMS (con paginación opcional; limite=null devuelve todos para reordenar).
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

  if (sedeSlug !== undefined) condiciones.push(`se.slug = ${agregar(sedeSlug)}`);
  if (sedeId !== undefined) condiciones.push(`s.sede_id = ${agregar(sedeId)}`);
  if (visible !== undefined) condiciones.push(`s.visible = ${agregar(visible)}`);
  if (buscar) {
    const p = agregar(patronBusqueda(buscar));
    condiciones.push(
      `(${sinAcentosSql('s.nombre')} LIKE ${p} ESCAPE '\\' OR ${sinAcentosSql('s.descripcion_corta')} LIKE ${p} ESCAPE '\\')`,
    );
  }

  const donde = condiciones.join(' AND ');
  const clausulaOrden = ORDENES_ADMIN[orden] ?? ORDENES_ADMIN.orden;

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
  const { rows } = await db.consultar(`SELECT ${COLUMNAS_ADMIN} ${UNIONES_ADMIN} WHERE s.id = $1`, [
    id,
  ]);
  return rows[0] ?? null;
}

export async function filaParaModificar(id, db = { consultar }) {
  const { rows } = await db.consultar('SELECT * FROM servicio WHERE id = $1 FOR UPDATE', [id]);
  return rows[0] ?? null;
}

export async function existeSede(sedeId, db = { consultar }) {
  const { rows } = await db.consultar('SELECT id FROM sede WHERE id = $1', [sedeId]);
  return Boolean(rows[0]);
}

export async function crear(
  { sedeId, slug, nombre, descripcionCorta, icono, imagenId = null, contenido, detalle = null, visible },
  db = { consultar },
) {
  const { rows } = await db.consultar(
    `INSERT INTO servicio (sede_id, slug, nombre, descripcion_corta, icono, imagen_id, contenido, detalle, orden, visible)
     VALUES (
       $1,
       $2,
       $3,
       $4,
       $5,
       $6,
       $7::jsonb,
       $8::jsonb,
       COALESCE((SELECT MAX(orden) FROM servicio WHERE sede_id = $1), 0) + 1,
       $9
     )
     RETURNING *`,
    [
      sedeId,
      slug,
      nombre,
      descripcionCorta,
      icono,
      imagenId,
      JSON.stringify(contenido),
      detalle ? JSON.stringify(detalle) : null,
      visible,
    ],
  );
  return rows[0];
}

const COLUMNAS_ACTUALIZABLES = {
  slug: 'slug',
  nombre: 'nombre',
  descripcionCorta: 'descripcion_corta',
  icono: 'icono',
  imagenId: 'imagen_id',
  visible: 'visible',
};

export async function actualizar(id, cambios, db = { consultar }) {
  const asignaciones = [];
  const valores = [id];

  for (const [clave, valor] of Object.entries(cambios)) {
    if (valor === undefined) continue;
    if (clave === 'contenido' || clave === 'detalle') {
      valores.push(valor ? JSON.stringify(valor) : null);
      asignaciones.push(`${clave} = $${valores.length}::jsonb`);
    } else if (clave in COLUMNAS_ACTUALIZABLES) {
      valores.push(valor);
      asignaciones.push(`${COLUMNAS_ACTUALIZABLES[clave]} = $${valores.length}`);
    }
  }

  if (asignaciones.length === 0) return filaParaModificar(id, db);

  const { rows } = await db.consultar(
    `UPDATE servicio SET ${asignaciones.join(', ')} WHERE id = $1 RETURNING *`,
    valores,
  );
  return rows[0];
}

// Al borrar un servicio, sus preguntas frecuentes quedan huérfanas (servicio_id = NULL) para el bot.
export async function desvincularPreguntasDeServicio(servicioId, db = { consultar }) {
  const { rows: anteriores } = await db.consultar(
    'SELECT * FROM pregunta_frecuente WHERE servicio_id = $1 ORDER BY orden, id FOR UPDATE',
    [servicioId],
  );
  if (anteriores.length === 0) return [];

  const { rows: nuevas } = await db.consultar(
    'UPDATE pregunta_frecuente SET servicio_id = NULL WHERE servicio_id = $1 RETURNING *',
    [servicioId],
  );
  const nuevaPorId = new Map(nuevas.map((fila) => [fila.id, fila]));
  return anteriores.map((anterior) => ({ anterior, nuevo: nuevaPorId.get(anterior.id) }));
}

export async function eliminar(id, db = { consultar }) {
  const { rows } = await db.consultar('DELETE FROM servicio WHERE id = $1 RETURNING *', [id]);
  return rows[0] ?? null;
}

export async function listarPreguntasDeServicio(servicioId, db = { consultar }) {
  const { rows } = await db.consultar(
    `SELECT id, pregunta, respuesta, orden, activa
       FROM pregunta_frecuente
      WHERE servicio_id = $1
      ORDER BY orden, id`,
    [servicioId],
  );
  return rows;
}

export async function buscarPreguntaEnServicio(servicioId, preguntaId, db = { consultar }) {
  const { rows } = await db.consultar(
    `SELECT id, pregunta, respuesta, orden, activa
       FROM pregunta_frecuente
      WHERE id = $1 AND servicio_id = $2`,
    [preguntaId, servicioId],
  );
  return rows[0] ?? null;
}

export async function filaPreguntaParaModificar(servicioId, preguntaId, db = { consultar }) {
  const { rows } = await db.consultar(
    'SELECT * FROM pregunta_frecuente WHERE id = $1 AND servicio_id = $2 FOR UPDATE',
    [preguntaId, servicioId],
  );
  return rows[0] ?? null;
}

export async function crearPregunta(
  { sedeId, servicioId, pregunta, respuesta, activa },
  db = { consultar },
) {
  const { rows } = await db.consultar(
    `INSERT INTO pregunta_frecuente (sede_id, servicio_id, pregunta, respuesta, orden, activa)
     VALUES (
       $1,
       $2,
       $3,
       $4,
       COALESCE((SELECT MAX(orden) FROM pregunta_frecuente WHERE servicio_id = $2), -1) + 1,
       $5
     )
     RETURNING *`,
    [sedeId, servicioId, pregunta, respuesta, activa],
  );
  return rows[0];
}

const COLUMNAS_PREGUNTA = {
  pregunta: 'pregunta',
  respuesta: 'respuesta',
  activa: 'activa',
  orden: 'orden',
};

export async function actualizarPregunta(preguntaId, cambios, db = { consultar }) {
  const entradas = Object.entries(cambios).filter(
    ([clave, valor]) => clave in COLUMNAS_PREGUNTA && valor !== undefined,
  );
  if (entradas.length === 0) {
    const { rows } = await db.consultar('SELECT * FROM pregunta_frecuente WHERE id = $1', [
      preguntaId,
    ]);
    return rows[0] ?? null;
  }

  const asignaciones = entradas.map(
    ([clave], indice) => `${COLUMNAS_PREGUNTA[clave]} = $${indice + 2}`,
  );
  const valores = entradas.map(([, valor]) => valor);

  const { rows } = await db.consultar(
    `UPDATE pregunta_frecuente SET ${asignaciones.join(', ')} WHERE id = $1 RETURNING *`,
    [preguntaId, ...valores],
  );
  return rows[0];
}

export async function eliminarPregunta(servicioId, preguntaId, db = { consultar }) {
  const { rows } = await db.consultar(
    'DELETE FROM pregunta_frecuente WHERE id = $1 AND servicio_id = $2 RETURNING *',
    [preguntaId, servicioId],
  );
  return rows[0] ?? null;
}

export async function filasPreguntasParaReordenar(servicioId, db = { consultar }) {
  const { rows } = await db.consultar(
    'SELECT * FROM pregunta_frecuente WHERE servicio_id = $1 ORDER BY orden, id FOR UPDATE',
    [servicioId],
  );
  return rows;
}
