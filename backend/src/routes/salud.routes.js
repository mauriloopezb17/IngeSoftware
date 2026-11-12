import { Router } from 'express';
import { verificarConexion } from '../db/index.js';

const router = Router();

// Si PostgreSQL no contesta en este tiempo, se considera caído: el endpoint nunca se queda colgado.
const TIEMPO_MAXIMO_VERIFICACION_MS = 3_000;

async function estadoBaseDatos() {
  let temporizador;
  const limite = new Promise((_resolver, rechazar) => {
    temporizador = setTimeout(
      () => rechazar(new Error('PostgreSQL no respondió a tiempo')),
      TIEMPO_MAXIMO_VERIFICACION_MS,
    );
  });

  try {
    await Promise.race([verificarConexion(), limite]);
    return { ok: true };
  } catch (error) {
    return { ok: false, motivo: error.code ?? error.message };
  } finally {
    clearTimeout(temporizador);
  }
}

// GET /api/salud — estado de la API y de PostgreSQL (contrato: docs/api/publico.md).
// 200 si todo responde; 503 con estado "degradado" si la base no responde.
// No usa el envoltorio "datos" porque lo consultan monitores externos.
router.get('/', async (req, res) => {
  const baseDatos = await estadoBaseDatos();

  if (!baseDatos.ok) {
    req.log.warn({ motivo: baseDatos.motivo }, 'Salud degradada: PostgreSQL no responde');
  }

  res
    .status(baseDatos.ok ? 200 : 503)
    .set('Cache-Control', 'no-store')
    .json({
      estado: baseDatos.ok ? 'ok' : 'degradado',
      servicio: 'api-parroquia',
      fecha: new Date().toISOString(),
      dependencias: {
        baseDatos: baseDatos.ok ? 'ok' : 'error',
      },
    });
});

export default router;
