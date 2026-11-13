// Límite de intentos fallidos de inicio de sesión y de cambio de contraseña
// (docs/api/autenticacion.md, sección 4). Los contadores viven en Redis, así que se mantienen
// aunque la API se reinicie.
//
//  * 5 intentos fallidos cada 15 minutos por combinación de IP y correo, y 20 por IP.
//  * Los intentos exitosos no cuentan. La ventana empieza en el primer fallo y no se extiende.
//  * Superado el límite, se responde 429 con Retry-After sin llegar a comprobar la contraseña.
//  * Login y cambio de contraseña comparten los contadores (un atacante con una sesión abierta no
//    puede probar contraseñas ajenas sin límite).
//
// ADR-02: la API no cae por Redis. Si no responde, no se aplica el límite y se registra la advertencia.
import { createHash } from 'node:crypto';
import { ErrorApp } from '../errores/ErrorApp.js';
import { obtenerRedis } from '../db/redis.js';

export const MAXIMO_FALLOS_POR_IP_Y_CORREO = 5;
export const MAXIMO_FALLOS_POR_IP = 20;
export const VENTANA_SEGUNDOS = 15 * 60;

const PREFIJO = 'auth:fallos';

// Suma 1 a cada contador y le pone la caducidad solo si es el primer fallo, todo en un paso
// atómico: así un contador nunca queda sin caducidad (bloquearía para siempre).
const SCRIPT_REGISTRAR_FALLO = `
for i = 1, #KEYS do
  if redis.call('INCR', KEYS[i]) == 1 then
    redis.call('EXPIRE', KEYS[i], ARGV[1])
  end
end
return 1`;

// Claves de Redis. El correo va como huella: no se guardan correos en Redis.
function clavesDe({ ip, correo }) {
  const huella = createHash('sha256').update(correo.toLowerCase()).digest('hex').slice(0, 32);
  const ipTexto = ip ?? 'desconocida';

  return {
    porIpYCorreo: `${PREFIJO}:ip-correo:${ipTexto}:${huella}`,
    porIp: `${PREFIJO}:ip:${ipTexto}`,
  };
}

// Ejecuta una operación de Redis. Si Redis falla, devuelve undefined y deja la advertencia en el log.
async function sinFallarPorRedis(operacion, log, mensaje) {
  try {
    return await operacion();
  } catch (error) {
    log?.warn({ motivo: error.code ?? error.message }, mensaje);
    return undefined;
  }
}

// "en 1 minuto" / "en 12 minutos": minutos restantes redondeados hacia arriba.
function mensajeDeEspera(segundos) {
  const minutos = Math.max(1, Math.ceil(segundos / 60));
  const unidad = minutos === 1 ? 'minuto' : 'minutos';
  return `Demasiados intentos fallidos. Vuelve a intentarlo en ${minutos} ${unidad}.`;
}

// Lee los dos contadores y devuelve cuántos segundos faltan para poder reintentar, o 0 si no
// hay bloqueo. Con dos bloqueos a la vez, el más largo.
async function segundosDeBloqueo(clientes) {
  const { porIpYCorreo, porIp } = clavesDe(clientes);

  const resultados = await obtenerRedis()
    .pipeline()
    .get(porIpYCorreo)
    .pttl(porIpYCorreo)
    .get(porIp)
    .pttl(porIp)
    .exec();

  for (const [error] of resultados) {
    if (error) throw error;
  }
  const [[, fallosIpCorreo], [, ttlIpCorreo], [, fallosIp], [, ttlIp]] = resultados;

  const espera = (fallos, limite, ttlMs) =>
    Number(fallos) >= limite ? Math.ceil(Math.max(ttlMs, 0) / 1000) || VENTANA_SEGUNDOS : 0;

  return Math.max(
    espera(fallosIpCorreo, MAXIMO_FALLOS_POR_IP_Y_CORREO, ttlIpCorreo),
    espera(fallosIp, MAXIMO_FALLOS_POR_IP, ttlIp),
  );
}

// Lanza 429 DEMASIADAS_SOLICITUDES (con Retry-After) si la IP, o la IP con ese correo, superó
// el límite de intentos fallidos. "log" es req.log.
export async function exigirIntentosDisponibles({ ip, correo }, log) {
  const segundos = await sinFallarPorRedis(
    () => segundosDeBloqueo({ ip, correo }),
    log,
    'Redis no responde; no se aplica el límite de intentos de inicio de sesión',
  );

  if (segundos > 0) {
    throw ErrorApp.demasiadasSolicitudes(mensajeDeEspera(segundos), segundos);
  }
}

export async function registrarIntentoFallido({ ip, correo }, log) {
  const { porIpYCorreo, porIp } = clavesDe({ ip, correo });

  await sinFallarPorRedis(
    () => obtenerRedis().eval(SCRIPT_REGISTRAR_FALLO, 2, porIpYCorreo, porIp, VENTANA_SEGUNDOS),
    log,
    'Redis no responde; no se registró el intento fallido de inicio de sesión',
  );
}

// Ejecuta "tarea" con el límite de intentos:
//  1. si ya se superó el límite, lanza 429 sin ejecutarla;
//  2. si la tarea falla con un error que "esFallo" reconoce como intento fallido, lo registra;
//  3. si sale bien no cuenta nada.
export async function conLimiteDeIntentos({ ip, correo, log }, tarea, esFallo) {
  await exigirIntentosDisponibles({ ip, correo }, log);

  try {
    return await tarea();
  } catch (error) {
    if (esFallo(error)) await registrarIntentoFallido({ ip, correo }, log);
    throw error;
  }
}
