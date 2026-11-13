// Caché de lecturas públicas en Redis (ADR-02, cache-aside). Constantes y TTL: constantes/cache.js.
//
//   const { valor, acierto } = await leerConCache(
//     { recurso: RECURSOS_CACHE.HORARIOS, sedeId, variante: { tipo: [1, 2] } },
//     () => servicio.listarHorarios(sedeId),
//   );
//
// Cómo se guarda: cada par (sede, recurso) tiene una «generación», un contador en Redis. Las
// respuestas se guardan con la generación en su clave:
//
//   cache:v1:g:<sede|global>:<recurso>                      -> generación (número)
//   cache:v1:d:<sede|global>:<recurso>:<generación>:<variante>  -> respuesta en JSON, con TTL
//
// Invalidar (invalidarRecursos) solo suma 1 a la generación: todas las variantes guardadas (cada
// combinación de filtros y páginas) quedan inalcanzables al instante y vencen solas por su TTL.
// Así no hace falta buscar claves, y una lectura lenta que empezó antes del cambio no puede dejar
// datos viejos visibles: los guarda bajo la generación antigua, que nadie vuelve a leer.
//
// ADR-02: la API NO cae por Redis (mismo criterio que el límite de intentos de inicio de sesión).
//  * Cualquier fallo de Redis (caído, lento, un valor dañado) deja una advertencia en el log y la
//    respuesta se lee de PostgreSQL. Nada de esto llega nunca al cliente como error.
//  * Tras un fallo, durante PAUSA_REDIS_CAIDO_MS no se vuelve a intentar (interruptor): un Redis
//    caído o lento no suma su espera a cada petición. Pasada la pausa, una sola petición lo prueba.
//  * Si no se puede invalidar porque Redis no responde, la invalidación se recuerda en memoria y se
//    ejecuta antes de la primera lectura cuando Redis vuelva: así no se sirven datos anteriores al
//    cambio. Si la API se reinicia antes de que Redis vuelva, lo guardado vence por su TTL.
import { createHash } from 'node:crypto';
import { PAUSA_REDIS_CAIDO_MS, PREFIJO_CACHE, TTL_SEGUNDOS } from '../constantes/cache.js';
import { obtenerEntorno } from '../config/entorno.js';
import { obtenerLogger } from '../config/logger.js';
import { obtenerRedis } from '../db/redis.js';

const GLOBAL = 'global';

const claveDeGeneracion = (sedeId, recurso) => `${PREFIJO_CACHE}:g:${sedeId ?? GLOBAL}:${recurso}`;

const claveDeDatos = (sedeId, recurso, generacion, variante) =>
  `${PREFIJO_CACHE}:d:${sedeId ?? GLOBAL}:${recurso}:${generacion}:${variante}`;

// Suma 1 a la generación. Si la clave no existe (primera vez, o Redis se vació), arranca desde un
// valor basado en la hora y no desde 0: así nunca coincide con la generación de datos viejos.
const SCRIPT_INVALIDAR = `
if redis.call('EXISTS', KEYS[1]) == 0 then
  redis.call('SET', KEYS[1], ARGV[1])
end
return redis.call('INCR', KEYS[1])`;

// Texto corto y estable de una variante (los filtros y la paginación de la petición, o un slug):
// mismos valores -> misma clave, sin importar el orden de las propiedades.
function textoDeVariante(variante) {
  if (variante === undefined || variante === null || variante === '') return '-';

  const ordenado = (valor) => {
    if (Array.isArray(valor)) return valor.map(ordenado);
    if (valor === null || typeof valor !== 'object') return valor;
    return Object.fromEntries(
      Object.keys(valor)
        .filter((clave) => valor[clave] !== undefined)
        .sort()
        .map((clave) => [clave, ordenado(valor[clave])]),
    );
  };
  return createHash('sha256')
    .update(JSON.stringify(ordenado(variante)))
    .digest('hex')
    .slice(0, 24);
}

export const cacheActiva = () => obtenerEntorno().cacheHabilitada;

// ---- Redis caído: advertencias, interruptor e invalidaciones pendientes ----

// Hasta cuándo (ms desde 1970) no se intenta Redis. 0: Redis se considera disponible.
let sinRedisHasta = 0;
// Invalidaciones que no se pudieron hacer, a la espera de que Redis vuelva: "sede|recurso" -> datos.
const invalidacionesPendientes = new Map();

// Advertencia de Redis. "log" es req.log (lleva el id de la petición); sin él, el log general.
// Nunca incluye claves ni datos de la respuesta, solo el motivo.
function avisarFalloDeRedis(log, error, mensaje) {
  (log ?? obtenerLogger()).warn({ motivo: error.code ?? error.message }, mensaje);
}

// ¿Se puede intentar Redis ahora? Durante la pausa, no. Al terminar la pausa se «reclama» la
// prueba: solo la primera petición lo intenta (las demás siguen sin Redis hasta que responda).
function puedeUsarRedis() {
  if (sinRedisHasta === 0) return true;
  if (Date.now() < sinRedisHasta) return false;

  sinRedisHasta = Date.now() + PAUSA_REDIS_CAIDO_MS;
  return true;
}

const redisFallo = () => {
  sinRedisHasta = Date.now() + PAUSA_REDIS_CAIDO_MS;
};
const redisRespondio = () => {
  sinRedisHasta = 0;
};

// Para las pruebas: vuelve al estado inicial (Redis disponible y nada pendiente).
export function reiniciarEstadoDeRedis() {
  sinRedisHasta = 0;
  invalidacionesPendientes.clear();
}

const generacionNueva = () => String(Date.now() * 1000);

function invalidarGeneracion(redis, sedeId, recurso) {
  return redis.eval(SCRIPT_INVALIDAR, 1, claveDeGeneracion(sedeId, recurso), generacionNueva());
}

function recordarInvalidacion(sedeId, recursos) {
  for (const recurso of recursos) {
    invalidacionesPendientes.set(`${sedeId ?? GLOBAL}|${recurso}`, { sedeId, recurso });
  }
}

// Ejecuta las invalidaciones que quedaron pendientes. Si Redis vuelve a fallar, lanza (quien llama
// lo trata como un fallo más) y las que faltan siguen pendientes.
async function vaciarInvalidacionesPendientes(redis) {
  for (const [clave, { sedeId, recurso }] of [...invalidacionesPendientes]) {
    await invalidarGeneracion(redis, sedeId, recurso);
    invalidacionesPendientes.delete(clave);
  }
}

// ---- Lectura ----

// Lee de la caché y, si no está, carga de la base y la guarda. Devuelve { valor, acierto } y, si
// Redis no se pudo usar, también sinRedis: true.
//  * recurso: uno de RECURSOS_CACHE; sedeId: null para lo global (lista de sedes).
//  * variante: lo que distingue una respuesta de otra dentro del recurso (query validada, slug…).
//  * cargar: función que arma la respuesta desde PostgreSQL. Si lanza (ej. 404), no se guarda nada.
export async function leerConCache({ recurso, sedeId = null, variante, log }, cargar) {
  if (!cacheActiva()) return { valor: await cargar(), acierto: false };

  if (!puedeUsarRedis()) {
    avisarFalloDeRedis(
      log,
      new Error('en pausa tras un fallo'),
      'Redis no disponible; se lee de PostgreSQL sin caché',
    );
    return { valor: await cargar(), acierto: false, sinRedis: true };
  }

  const redis = obtenerRedis();
  let claveGuardar;

  try {
    await vaciarInvalidacionesPendientes(redis);
    const generacion = (await redis.get(claveDeGeneracion(sedeId, recurso))) ?? '0';
    redisRespondio();
    claveGuardar = claveDeDatos(sedeId, recurso, generacion, textoDeVariante(variante));

    const guardado = await redis.get(claveGuardar);
    if (guardado !== null) {
      try {
        return { valor: JSON.parse(guardado), acierto: true };
      } catch {
        // Un valor dañado se trata como ausente y se reemplaza al guardar.
        avisarFalloDeRedis(log, new Error('valor dañado'), 'Valor de caché ilegible; se recarga');
      }
    }
  } catch (error) {
    redisFallo();
    avisarFalloDeRedis(log, error, 'Redis no responde; se lee de PostgreSQL sin caché');
    return { valor: await cargar(), acierto: false, sinRedis: true };
  }

  const valor = await cargar();

  try {
    await redis.set(claveGuardar, JSON.stringify(valor), 'EX', TTL_SEGUNDOS[recurso]);
  } catch (error) {
    redisFallo();
    avisarFalloDeRedis(log, error, 'Redis no responde; no se guardó la respuesta en caché');
  }
  return { valor, acierto: false };
}

// Responde la petición desde la caché (o desde la base si falta) con la cabecera X-Cache:
// HIT (de la caché), MISS (de la base, y se guardó) o BYPASS (Redis no respondió: de la base, sin
// guardar). "cuerpo" arma el JSON completo de la respuesta ({ datos } o { datos, paginacion }).
export async function responderConCache(req, res, { recurso, sedeId = null, variante }, cuerpo) {
  const { valor, acierto, sinRedis } = await leerConCache(
    { recurso, sedeId, variante, log: req.log },
    cuerpo,
  );
  if (cacheActiva()) res.set('X-Cache', sinRedis ? 'BYPASS' : acierto ? 'HIT' : 'MISS');
  res.json(valor);
}

// ---- Invalidación ----

// Invalida lo guardado de esos recursos de una sede (sedeId null: los globales). Se llama cuando
// el CMS modificó algo, ya con la transacción confirmada. Nunca lanza: si Redis no responde, se
// registra la advertencia y la invalidación queda pendiente hasta que Redis vuelva.
export async function invalidarRecursos(sedeId, recursos, log) {
  if (!cacheActiva()) return;

  const unicos = [...new Set(recursos)];
  if (!puedeUsarRedis()) {
    recordarInvalidacion(sedeId, unicos);
    avisarFalloDeRedis(
      log,
      new Error('en pausa tras un fallo'),
      'Redis no disponible; la invalidación de la caché queda pendiente',
    );
    return;
  }

  const redis = obtenerRedis();
  try {
    await Promise.all(unicos.map((recurso) => invalidarGeneracion(redis, sedeId, recurso)));
    redisRespondio();
  } catch (error) {
    redisFallo();
    recordarInvalidacion(sedeId, unicos);
    avisarFalloDeRedis(
      log,
      error,
      'Redis no responde; no se invalidó la caché (queda pendiente hasta que vuelva)',
    );
  }
}
