import { createApp } from './app.js';
import { ErrorEntorno, obtenerEntorno } from './config/entorno.js';
import { obtenerLogger } from './config/logger.js';
import { cerrarPool, esperarBaseDatos } from './db/index.js';
import { cerrarRedis, obtenerRedis } from './db/redis.js';

// Si el cierre ordenado se traba (ej. una conexión que no termina), se fuerza la salida.
const ESPERA_MAXIMA_APAGADO_MS = 10_000;

let entorno;

try {
  entorno = obtenerEntorno();
} catch (error) {
  if (!(error instanceof ErrorEntorno)) throw error;
  // Sin una configuración válida todavía no hay logger: se informa por consola y se sale.
  // eslint-disable-next-line no-console
  console.error(error.message);
  process.exit(1);
}

const logger = obtenerLogger();

// La API no acepta peticiones hasta confirmar que PostgreSQL responde.
try {
  await esperarBaseDatos();
} catch (error) {
  logger.fatal({ err: error }, 'No se pudo conectar con PostgreSQL. Revisa DATABASE_URL.');
  await cerrarPool();
  process.exit(1);
}

// Redis es opcional para arrancar (ADR-02): se empieza a conectar en segundo plano y no se espera.
obtenerRedis();

const app = createApp();

const servidor = app.listen(entorno.puerto, () => {
  logger.info({ puerto: entorno.puerto, modo: entorno.modo }, 'API escuchando');
});

let apagando = false;

// Cierre ordenado: deja terminar las peticiones en curso y después cierra las conexiones
// a PostgreSQL y a Redis.
function apagar(senal) {
  if (apagando) return;
  apagando = true;
  logger.info({ senal }, 'Apagando la API');

  setTimeout(() => {
    logger.error('El cierre ordenado tardó demasiado; se fuerza la salida');
    process.exit(1);
  }, ESPERA_MAXIMA_APAGADO_MS).unref();

  servidor.close(async () => {
    await Promise.all([cerrarPool(), cerrarRedis()]);
    logger.info('Conexiones a PostgreSQL y Redis cerradas');
    process.exit(0);
  });
}

process.on('SIGINT', apagar);
process.on('SIGTERM', apagar);
