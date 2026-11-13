import { describe, it, expect, vi } from 'vitest';

// Configuración con un proxy de confianza (TRUST_PROXY=1). Valores de prueba, no credenciales.
vi.mock('../../src/config/entorno.js', async (importOriginal) => {
  const original = await importOriginal();
  const entorno = original.validarEntorno({
    DATABASE_URL: 'postgres://usuario:clave@localhost:5432/db_portal_cms',
    REDIS_URL: 'redis://localhost:6379',
    JWT_SECRET: 'secreto-de-prueba-0123456789abcdef',
    TRUST_PROXY: '1',
  });
  return { ...original, obtenerEntorno: () => entorno };
});

const { createApp } = await import('../../src/app.js');

describe('createApp con TRUST_PROXY', () => {
  it('confía solo en el proxy más cercano', () => {
    const confia = createApp().get('trust proxy fn');

    // Express recorre X-Forwarded-For desde la conexión: el salto 0 es el proxy, el 1 ya no.
    expect(confia('10.0.0.5', 0)).toBe(true);
    expect(confia('203.0.113.7', 1)).toBe(false);
  });
});
