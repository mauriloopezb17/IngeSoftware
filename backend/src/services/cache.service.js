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
// ADR-02: la API no cae por Redis. Cualquier fallo de Redis (caído, lento, un valor dañado) se
// registra como advertencia y la respuesta se lee de PostgreSQL.
import { createHash } from 'node:crypto';
import { PREFIJO_CACHE, TTL_SEGUNDOS } from '../constantes/cache.js';
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

// Advertencia de Redis. "log" es req.log (lleva el id de la petición); sin él, el log general.
function avisarFalloDeRedis(log, error, mensaje) {
  (log ?? obtenerLogger()).warn({ motivo: error.code ?? error.message }, mensaje);
}

// Lee de la caché y, si no está, carga de la base y la guarda. Devuelve { valor, acierto }.
//  * recurso: uno de RECURSOS_CACHE; sedeId: null para lo global (lista de sedes).
//  * variante: lo que distingue una respuesta de otra dentro del recurso (query validada, slug…).
//  * cargar: función que arma la respuesta desde PostgreSQL. Si lanza (ej. 404), no se guarda nada.
export async function leerConCache({ recurso, sedeId = null, variante, log }, cargar) {
  if (!cacheActiva()) return { valor: await cargar(), acierto: false };

  const redis = obtenerRedis();
  let claveGuardar;

  try {
    const generacion = (await redis.get(claveDeGeneracion(sedeId, recurso))) ?? '0';
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
    avisarFalloDeRedis(log, error, 'Redis no responde; se lee de PostgreSQL sin caché');
    return { valor: await cargar(), acierto: false };
  }

  const valor = await cargar();

  try {
    await redis.set(claveGuardar, JSON.stringify(valor), 'EX', TTL_SEGUNDOS[recurso]);
  } catch (error) {
    avisarFalloDeRedis(log, error, 'Redis no responde; no se guardó la respuesta en caché');
  }
  return { valor, acierto: false };
}

// Responde la petición desde la caché (o desde la base si falta) con la cabecera X-Cache: HIT o
// MISS. "cuerpo" arma el JSON completo de la respuesta ({ datos } o { datos, paginacion }).
export async function responderConCache(req, res, { recurso, sedeId = null, variante }, cuerpo) {
  const { valor, acierto } = await leerConCache(
    { recurso, sedeId, variante, log: req.log },
    cuerpo,
  );
  if (cacheActiva()) res.set('X-Cache', acierto ? 'HIT' : 'MISS');
  res.json(valor);
}

// Invalida lo guardado de esos recursos de una sede (sedeId null: los globales). Se llama cuando
// el CMS modificó algo, ya con la transacción confirmada. Nunca lanza: si Redis no responde, se
// registra la advertencia (lo guardado vence por su TTL).
export async function invalidarRecursos(sedeId, recursos, log) {
  if (!cacheActiva()) return;

  const redis = obtenerRedis();
  const desde = String(Date.now() * 1000);
  try {
    await Promise.all(
      [...new Set(recursos)].map((recurso) =>
        redis.eval(SCRIPT_INVALIDAR, 1, claveDeGeneracion(sedeId, recurso), desde),
      ),
    );
  } catch (error) {
    avisarFalloDeRedis(
      log,
      error,
      'Redis no responde; no se invalidó la caché (vencerá por su TTL)',
    );
  }
}
