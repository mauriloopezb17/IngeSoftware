// Acceso a Redis: un único cliente compartido por toda la API (ioredis).
// ADR-02: la API no cae por Redis. Si Redis no responde, los comandos fallan rápido (sin quedarse
// colgados) y quien los usa decide cómo seguir (ej. el login sigue sin límite de intentos).
import { Redis } from 'ioredis';
import { obtenerEntorno } from '../config/entorno.js';
import { obtenerLogger } from '../config/logger.js';

// Un comando que no recibe respuesta en este tiempo falla: un Redis lento no debe frenar la API.
const TIEMPO_MAXIMO_COMANDO_MS = 1_000;
const TIEMPO_MAXIMO_CONEXION_MS = 2_000;
// Espera entre reintentos de conexión: crece de a poco hasta este tope.
const ESPERA_MAXIMA_REINTENTO_MS = 5_000;

let cliente;

function crearCliente() {
  const entorno = obtenerEntorno();
  const logger = obtenerLogger();

  const nuevoCliente = new Redis(entorno.redisUrl, {
    connectionName: 'api-parroquia',
    connectTimeout: TIEMPO_MAXIMO_CONEXION_MS,
    commandTimeout: TIEMPO_MAXIMO_COMANDO_MS,
    // Si no hay conexión, el comando falla tras un reintento en lugar de esperar a que vuelva.
    maxRetriesPerRequest: 1,
    // Reintenta conectar para siempre: cuando Redis vuelve, la API lo retoma sin reiniciarse.
    retryStrategy: (intento) => Math.min(intento * 200, ESPERA_MAXIMA_REINTENTO_MS),
  });

  // Se avisa una sola vez al caer y una al volver, no en cada reintento (evita llenar el log).
  let caido = false;

  nuevoCliente.on('error', (error) => {
    if (caido) return;
    caido = true;
    logger.warn(
      { motivo: error.code ?? error.message },
      'Redis no responde; la API sigue funcionando sin él',
    );
  });

  nuevoCliente.on('ready', () => {
    if (!caido) return;
    caido = false;
    logger.info('Conexión con Redis recuperada');
  });

  return nuevoCliente;
}

// Cliente compartido de Redis. Se crea al primer uso y empieza a conectar en segundo plano.
export function obtenerRedis() {
  cliente ??= crearCliente();
  return cliente;
}

// Cierra la conexión. Se usa al apagar la API y al terminar las pruebas.
export async function cerrarRedis() {
  if (!cliente) return;
  const actual = cliente;
  cliente = undefined;

  try {
    // QUIT deja terminar los comandos en curso; si Redis no responde, se corta la conexión.
    await actual.quit();
  } catch {
    actual.disconnect();
  }
}
