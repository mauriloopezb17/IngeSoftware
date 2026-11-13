// Acceso a PostgreSQL: un pool de conexiones compartido por toda la API.
import pg from 'pg';
import { obtenerEntorno } from '../config/entorno.js';
import { obtenerLogger } from '../config/logger.js';

const OID_INT8 = 20; // bigint / bigserial (ej. tamano_bytes, bitacora_cambio.id)
const OID_DATE = 1082; // date (ej. boletin.periodo, proclama_publicacion.fecha_publicacion)

// Conversión de tipos, solo para este pool (no cambia la configuración global de pg):
//  * date se deja como texto "YYYY-MM-DD": convertirlo a Date lo correría de día según la zona horaria.
//  * bigint se convierte a número: los valores de la API caben de sobra en un Number.
const tipos = {
  getTypeParser(oid, formato) {
    if (oid === OID_DATE) return (valor) => valor;
    if (oid === OID_INT8) return (valor) => Number(valor);
    return pg.types.getTypeParser(oid, formato);
  },
};

// Una consulta más lenta que esto se registra como advertencia (RNF-01: máximo 2 s).
const CONSULTA_LENTA_MS = 1000;

let pool;

function crearPool() {
  const entorno = obtenerEntorno();
  const logger = obtenerLogger();

  const nuevoPool = new pg.Pool({
    connectionString: entorno.baseDatosUrl,
    application_name: 'api-parroquia',
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    statement_timeout: 15_000,
    types: tipos,
  });

  // Error en una conexión inactiva (ej. se reinició PostgreSQL): el pool la descarta y abre otra.
  nuevoPool.on('error', (error) => {
    logger.error({ err: error }, 'Error en una conexión inactiva de PostgreSQL');
  });

  return nuevoPool;
}

export function obtenerPool() {
  pool ??= crearPool();
  return pool;
}

async function ejecutar(ejecutor, texto, parametros) {
  const inicio = performance.now();
  const resultado = await ejecutor.query(texto, parametros);
  const duracionMs = Math.round(performance.now() - inicio);

  // Nunca se registran los parámetros: pueden contener datos personales o contraseñas.
  const logger = obtenerLogger();
  if (duracionMs >= CONSULTA_LENTA_MS) {
    logger.warn({ duracionMs, consulta: texto }, 'Consulta lenta a PostgreSQL');
  } else {
    logger.debug({ duracionMs, filas: resultado.rowCount }, 'Consulta a PostgreSQL');
  }

  return resultado;
}

// Ejecuta una consulta parametrizada ($1, $2…) y devuelve el resultado de pg ({ rows, rowCount }).
export function consultar(texto, parametros = []) {
  return ejecutar(obtenerPool(), texto, parametros);
}

// Ejecuta fn dentro de una transacción. fn recibe { consultar, alConfirmar } ligado a la misma conexión.
// Si fn termina bien se hace COMMIT y se devuelve su valor; si lanza un error, ROLLBACK y se relanza.
//
// alConfirmar(clave, tarea): programa "tarea" para después del COMMIT (ej. invalidar la caché).
// Si la transacción se deshace, no corre. Dos llamadas con la misma clave corren una sola vez.
// Una tarea que falla se registra y no afecta al resultado: el cambio ya está confirmado.
export async function transaccion(fn) {
  const cliente = await obtenerPool().connect();
  const tareas = new Map();
  let valor;

  try {
    await cliente.query('BEGIN');
    valor = await fn({
      consultar: (texto, parametros = []) => ejecutar(cliente, texto, parametros),
      alConfirmar: (clave, tarea) => tareas.set(clave, tarea),
    });
    await cliente.query('COMMIT');
  } catch (error) {
    await cliente.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    cliente.release();
  }

  for (const tarea of tareas.values()) {
    try {
      await tarea();
    } catch (error) {
      obtenerLogger().warn({ err: error }, 'Falló una tarea posterior a la transacción');
    }
  }
  return valor;
}

// Comprueba que PostgreSQL responde. Lanza el error de conexión si no.
export async function verificarConexion() {
  await consultar('SELECT 1');
}

// Espera a PostgreSQL al arrancar: útil cuando el contenedor todavía se está iniciando.
export async function esperarBaseDatos({ intentos = 5, esperaMs = 2_000 } = {}) {
  const logger = obtenerLogger();

  for (let intento = 1; ; intento++) {
    try {
      await verificarConexion();
      logger.info('Conexión con PostgreSQL verificada');
      return;
    } catch (error) {
      if (intento >= intentos) throw error;
      logger.warn(
        { intento, intentos, motivo: error.code ?? error.message },
        'PostgreSQL no responde todavía; se reintentará',
      );
      await new Promise((resolver) => setTimeout(resolver, esperaMs));
    }
  }
}

// Cierra todas las conexiones. Se usa al apagar la API y al terminar las pruebas.
export async function cerrarPool() {
  if (!pool) return;
  const actual = pool;
  pool = undefined;
  await actual.end();
}
