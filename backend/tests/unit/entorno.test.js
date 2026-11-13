import { describe, it, expect } from 'vitest';
import { ErrorEntorno, validarEntorno } from '../../src/config/entorno.js';

// Variables mínimas válidas. Son valores de prueba, no credenciales reales.
const BASE = Object.freeze({
  DATABASE_URL: 'postgres://usuario:clave@localhost:5432/db_portal_cms',
  REDIS_URL: 'redis://localhost:6379',
  JWT_SECRET: 'secreto-de-prueba-0123456789abcdef',
});

const OCI_COMPLETO = Object.freeze({
  OCI_S3_ENDPOINT: 'https://espacio.compat.objectstorage.sa-santiago-1.oraclecloud.com',
  OCI_S3_REGION: 'sa-santiago-1',
  OCI_S3_BUCKET_NAME: 'parroquia-medios',
  OCI_S3_ACCESS_KEY_ID: 'clave-de-acceso-de-prueba',
  OCI_S3_SECRET_ACCESS_KEY: 'secreto-oci-de-prueba',
});

// Devuelve la lista de problemas del ErrorEntorno (falla la prueba si no se lanzó).
function problemasDe(variables) {
  try {
    validarEntorno(variables);
  } catch (error) {
    expect(error).toBeInstanceOf(ErrorEntorno);
    return error.problemas;
  }
  throw new Error('Se esperaba un ErrorEntorno');
}

describe('validarEntorno', () => {
  it('acepta las variables mínimas y completa los valores por defecto', () => {
    const entorno = validarEntorno(BASE);

    expect(entorno).toMatchObject({
      modo: 'development',
      esProduccion: false,
      esPrueba: false,
      puerto: 3000,
      nivelLog: 'info',
      corsOrigenes: ['http://localhost:5173'],
      confiarProxy: false,
      baseDatosUrl: BASE.DATABASE_URL,
      redisUrl: BASE.REDIS_URL,
      jwt: { secreto: BASE.JWT_SECRET, expiraEn: '8h' },
      almacenamiento: null,
      cdnUrlPublica: null,
    });
    expect(Object.isFrozen(entorno)).toBe(true);
    expect(Object.isFrozen(entorno.jwt)).toBe(true);
  });

  it('informa juntas todas las variables obligatorias que faltan', () => {
    expect(problemasDe({})).toEqual([
      'DATABASE_URL: es obligatoria.',
      'REDIS_URL: es obligatoria.',
      'JWT_SECRET: es obligatoria.',
    ]);
  });

  it('trata una variable vacía como no definida', () => {
    expect(problemasDe({ ...BASE, DATABASE_URL: '', JWT_SECRET: '   ' })).toEqual([
      'DATABASE_URL: es obligatoria.',
      'JWT_SECRET: es obligatoria.',
    ]);

    const entorno = validarEntorno({ ...BASE, PORT: '', LOG_LEVEL: '', OCI_S3_ENDPOINT: '' });
    expect(entorno.puerto).toBe(3000);
    expect(entorno.nivelLog).toBe('info');
    expect(entorno.almacenamiento).toBeNull();
  });

  it('rechaza valores inválidos con un mensaje por variable', () => {
    const problemas = problemasDe({
      ...BASE,
      NODE_ENV: 'prod',
      PORT: '70000',
      LOG_LEVEL: 'verbose',
      DATABASE_URL: 'mysql://localhost/db',
      REDIS_URL: 'http://localhost:6379',
      JWT_SECRET: 'corto',
      JWT_EXPIRA_EN: '8 horas',
      CORS_ORIGEN: 'localhost:5173',
    });

    expect(problemas.map((problema) => problema.split(':')[0])).toEqual([
      'NODE_ENV',
      'PORT',
      'LOG_LEVEL',
      'CORS_ORIGEN',
      'DATABASE_URL',
      'REDIS_URL',
      'JWT_SECRET',
      'JWT_EXPIRA_EN',
    ]);
    expect(problemas).toContain('JWT_SECRET: debe tener al menos 32 caracteres.');
  });

  it('nunca incluye los valores en el mensaje de error', () => {
    const secreto = 'valor-secreto-que-no-debe-aparecer';

    try {
      validarEntorno({ ...BASE, JWT_SECRET: 'corto', DATABASE_URL: `mysql://${secreto}@x/db` });
      throw new Error('Se esperaba un ErrorEntorno');
    } catch (error) {
      expect(error.message).not.toContain(secreto);
      expect(error.message).toContain('backend/.env.example');
    }
  });

  it('acepta varios orígenes de CORS separados por comas', () => {
    const entorno = validarEntorno({
      ...BASE,
      CORS_ORIGEN: 'http://localhost:5173/, https://pasionistas.org.bo',
    });

    expect(entorno.corsOrigenes).toEqual(['http://localhost:5173', 'https://pasionistas.org.bo']);
  });

  describe('TRUST_PROXY', () => {
    const confiarProxy = (valor) => validarEntorno({ ...BASE, TRUST_PROXY: valor }).confiarProxy;

    it('no confía en ningún proxy con false, 0 o sin definir', () => {
      expect(confiarProxy(undefined)).toBe(false);
      expect(confiarProxy('')).toBe(false);
      expect(confiarProxy('false')).toBe(false);
      expect(confiarProxy(' FALSE ')).toBe(false);
      expect(confiarProxy('0')).toBe(false);
    });

    it('acepta un número de proxies', () => {
      expect(confiarProxy('1')).toBe(1);
      expect(confiarProxy('2')).toBe(2);
    });

    it('acepta una lista de IPs, subredes y rangos con nombre', () => {
      const proxies = confiarProxy('10.0.0.1, 172.16.0.0/12,fd00::/8, ::1,loopback');

      expect(proxies).toEqual(['10.0.0.1', '172.16.0.0/12', 'fd00::/8', '::1', 'loopback']);
      expect(Object.isFrozen(proxies)).toBe(true);
    });

    it('rechaza true porque permitiría falsear la IP del cliente', () => {
      expect(problemasDe({ ...BASE, TRUST_PROXY: 'true' })).toEqual([
        'TRUST_PROXY: no puede ser true (permitiría falsear la IP); usa el número de proxies o sus IPs.',
      ]);
    });

    it.each([
      '11',
      '-1',
      '1.5',
      'nginx',
      '10.0.0.0/33',
      '::/129',
      '10.0.0.1/8/2',
      '300.1.1.1',
      ',',
    ])('rechaza el valor inválido %j', (valor) => {
      const [problema] = problemasDe({ ...BASE, TRUST_PROXY: valor });
      expect(problema).toMatch(/^TRUST_PROXY: /);
    });
  });

  it('exige las variables OCI_S3_* todas juntas o ninguna', () => {
    const problemas = problemasDe({
      ...BASE,
      OCI_S3_ENDPOINT: OCI_COMPLETO.OCI_S3_ENDPOINT,
      OCI_S3_REGION: OCI_COMPLETO.OCI_S3_REGION,
    });

    expect(problemas.map((problema) => problema.split(':')[0])).toEqual([
      'OCI_S3_BUCKET_NAME',
      'OCI_S3_ACCESS_KEY_ID',
      'OCI_S3_SECRET_ACCESS_KEY',
    ]);
  });

  it('arma la configuración del almacenamiento cuando OCI está completo', () => {
    const entorno = validarEntorno({
      ...BASE,
      ...OCI_COMPLETO,
      CDN_PUBLIC_URL: 'https://cdn.ejemplo.org/medios/',
    });

    expect(entorno.almacenamiento).toEqual({
      endpoint: OCI_COMPLETO.OCI_S3_ENDPOINT,
      region: OCI_COMPLETO.OCI_S3_REGION,
      bucket: OCI_COMPLETO.OCI_S3_BUCKET_NAME,
      accessKeyId: OCI_COMPLETO.OCI_S3_ACCESS_KEY_ID,
      secretAccessKey: OCI_COMPLETO.OCI_S3_SECRET_ACCESS_KEY,
    });
    expect(entorno.cdnUrlPublica).toBe('https://cdn.ejemplo.org/medios');
  });

  it('no permite el JWT_SECRET de ejemplo en producción', () => {
    const variables = { ...BASE, JWT_SECRET: 'cambiar-por-un-secreto-largo-y-aleatorio' };

    expect(validarEntorno(variables).modo).toBe('development');
    expect(problemasDe({ ...variables, NODE_ENV: 'production' })).toEqual([
      'JWT_SECRET: no puede ser el valor de ejemplo de .env.example en producción.',
    ]);
  });

  describe('CACHE_HABILITADA', () => {
    it('está habilitada por defecto', () => {
      expect(validarEntorno(BASE).cacheHabilitada).toBe(true);
      expect(validarEntorno({ ...BASE, CACHE_HABILITADA: '' }).cacheHabilitada).toBe(true);
    });

    it('acepta true y false', () => {
      expect(validarEntorno({ ...BASE, CACHE_HABILITADA: 'false' }).cacheHabilitada).toBe(false);
      expect(validarEntorno({ ...BASE, CACHE_HABILITADA: 'true' }).cacheHabilitada).toBe(true);
    });

    it('rechaza cualquier otro valor', () => {
      expect(problemasDe({ ...BASE, CACHE_HABILITADA: 'no' })).toEqual([
        'CACHE_HABILITADA: debe ser true o false.',
      ]);
    });
  });
});
