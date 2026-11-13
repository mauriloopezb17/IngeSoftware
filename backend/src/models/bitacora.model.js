// Consultas de bitacora_cambio (SQL parametrizado). Contrato: docs/api/admin.md, sección 13.
import { consultar } from '../db/index.js';

// "db" permite registrar el cambio en la MISMA transacción que la modificación.
export async function insertar(
  { usuarioId, entidad, entidadId, accion, datosAnteriores, datosNuevos, direccionIp },
  db = { consultar },
) {
  await db.consultar(
    `INSERT INTO bitacora_cambio
       (usuario_id, entidad, entidad_id, accion, datos_anteriores, datos_nuevos, direccion_ip)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::inet)`,
    [
      usuarioId,
      entidad,
      entidadId,
      accion,
      datosAnteriores === null ? null : JSON.stringify(datosAnteriores),
      datosNuevos === null ? null : JSON.stringify(datosNuevos),
      direccionIp,
    ],
  );
}

// Sede actual de un registro que sigue existiendo, por entidad (tabla). Solo hace falta para los
// UPDATE de registros cuya creación no quedó en la bitácora (ej. los del seed): en INSERT y
// DELETE la sede ya viene en los datos guardados. Al registrar una entidad nueva, agregarla aquí.
const SEDE_ACTUAL_POR_ENTIDAD = {
  archivo_multimedia: 'SELECT sede_id FROM archivo_multimedia WHERE id::text = b.entidad_id',
  boletin: 'SELECT sede_id FROM boletin WHERE id::text = b.entidad_id',
  evento: 'SELECT sede_id FROM evento WHERE id::text = b.entidad_id',
  grupo_pastoral: 'SELECT sede_id FROM grupo_pastoral WHERE id::text = b.entidad_id',
  horario: 'SELECT sede_id FROM horario WHERE id::text = b.entidad_id',
  pagina: 'SELECT sede_id FROM pagina WHERE id::text = b.entidad_id',
  pregunta_frecuente: 'SELECT sede_id FROM pregunta_frecuente WHERE id::text = b.entidad_id',
  proclama: 'SELECT sede_id FROM proclama WHERE id::text = b.entidad_id',
  publicacion: 'SELECT sede_id FROM publicacion WHERE id::text = b.entidad_id',
  servicio: 'SELECT sede_id FROM servicio WHERE id::text = b.entidad_id',
  usuario: 'SELECT sede_id FROM usuario WHERE id::text = b.entidad_id',
  video: 'SELECT sede_id FROM video WHERE id::text = b.entidad_id',
  sede: 'SELECT id FROM sede WHERE id::text = b.entidad_id',
  bloque: `SELECT p.sede_id FROM bloque bl JOIN pagina p ON p.id = bl.pagina_id
            WHERE bl.id::text = b.entidad_id`,
};

// Sede a la que pertenece un cambio "b": la de sus datos (INSERT/DELETE y UPDATE que cambian la
// sede), la del INSERT del mismo registro, o la sede actual del registro.
const SEDE_DEL_CAMBIO = `COALESCE(
  (b.datos_nuevos ->> 'sede_id')::int,
  (b.datos_anteriores ->> 'sede_id')::int,
  (SELECT (x.datos_nuevos ->> 'sede_id')::int
     FROM bitacora_cambio x
    WHERE x.entidad = b.entidad AND x.entidad_id = b.entidad_id AND x.accion = 'INSERT'
    ORDER BY x.id
    LIMIT 1),
  CASE b.entidad
    ${Object.entries(SEDE_ACTUAL_POR_ENTIDAD)
      .map(([entidad, sql]) => `WHEN '${entidad}' THEN (${sql})`)
      .join('\n    ')}
  END
)`;

// Página de cambios (más recientes primero) y el total que cumple los filtros.
// filtros: { sedeId?, entidad?, entidadId?, usuarioId?, accion?, desde?, hasta? (YYYY-MM-DD) }
export async function listar(filtros, { limite, desplazamiento }) {
  const parametros = [];
  const condiciones = ['TRUE'];
  const agregar = (valor) => {
    parametros.push(valor);
    return `$${parametros.length}`;
  };

  if (filtros.sedeId !== undefined)
    condiciones.push(`${SEDE_DEL_CAMBIO} = ${agregar(filtros.sedeId)}`);
  if (filtros.entidad !== undefined) condiciones.push(`b.entidad = ${agregar(filtros.entidad)}`);
  if (filtros.entidadId !== undefined) {
    condiciones.push(`b.entidad_id = ${agregar(filtros.entidadId)}`);
  }
  if (filtros.usuarioId !== undefined) {
    condiciones.push(`b.usuario_id = ${agregar(filtros.usuarioId)}`);
  }
  if (filtros.accion !== undefined) condiciones.push(`b.accion = ${agregar(filtros.accion)}`);
  // Días completos en hora de Bolivia, ambos incluidos.
  if (filtros.desde !== undefined) {
    condiciones.push(`b.fecha >= (${agregar(filtros.desde)}::date AT TIME ZONE 'America/La_Paz')`);
  }
  if (filtros.hasta !== undefined) {
    condiciones.push(
      `b.fecha < ((${agregar(filtros.hasta)}::date + 1) AT TIME ZONE 'America/La_Paz')`,
    );
  }

  const donde = condiciones.join(' AND ');
  const [pagina, conteo] = await Promise.all([
    consultar(
      `SELECT b.id,
              b.usuario_id,
              u.nombre_completo AS usuario_nombre,
              b.entidad,
              b.entidad_id,
              b.accion,
              b.datos_anteriores,
              b.datos_nuevos,
              host(b.direccion_ip) AS direccion_ip,
              b.fecha
         FROM bitacora_cambio b
         LEFT JOIN usuario u ON u.id = b.usuario_id
        WHERE ${donde}
        ORDER BY b.fecha DESC, b.id DESC
        LIMIT $${parametros.length + 1} OFFSET $${parametros.length + 2}`,
      [...parametros, limite, desplazamiento],
    ),
    consultar(`SELECT count(*)::int AS total FROM bitacora_cambio b WHERE ${donde}`, parametros),
  ]);

  return { filas: pagina.rows, total: conteo.rows[0].total };
}
