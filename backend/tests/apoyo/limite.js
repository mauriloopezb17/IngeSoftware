// Los contadores del límite de intentos viven en Redis y todas las pruebas llegan desde la misma
// IP: sin limpiarlos, los inicios de sesión fallidos de un archivo bloquearían a los siguientes.
import { obtenerRedis } from '../../src/db/redis.js';

export async function limpiarContadoresDeIntentos() {
  const redis = obtenerRedis();
  const claves = await redis.keys('auth:fallos:*');
  if (claves.length > 0) await redis.del(...claves);
}
