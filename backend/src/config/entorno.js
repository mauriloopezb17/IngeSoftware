// Carga y valida las variables de entorno de la API.
// La API no arranca si falta una variable obligatoria o si alguna tiene un valor inválido.
import { isIP } from 'node:net';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

// backend/.env (si existe). No reemplaza las variables que ya vienen del sistema, como en el CI.
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

// Valor de ejemplo de .env.example: nunca debe llegar a producción.
const JWT_SECRET_DE_EJEMPLO = 'cambiar-por-un-secreto-largo-y-aleatorio';

const VARIABLES_OCI = [
  'OCI_S3_ENDPOINT',
  'OCI_S3_REGION',
  'OCI_S3_BUCKET_NAME',
  'OCI_S3_ACCESS_KEY_ID',
  'OCI_S3_SECRET_ACCESS_KEY',
];

// Una variable vacía (ej. "OCI_S3_ENDPOINT=") cuenta como no definida: si es obligatoria
// se informa como faltante, y si tiene valor por defecto se usa ese valor.
const sinVacio = (esquema) =>
  z.preprocess(
    (valor) => (typeof valor === 'string' && valor.trim() === '' ? undefined : valor),
    esquema,
  );

const opcional = (esquema) => sinVacio(esquema.optional());

const urlConProtocolo = (protocolos, mensaje) =>
  z.string().refine((valor) => {
    try {
      return protocolos.includes(new URL(valor).protocol);
    } catch {
      return false;
    }
  }, mensaje);

// Nombres de rangos que Express acepta en "trust proxy".
const RANGOS_PROXY_CON_NOMBRE = ['loopback', 'linklocal', 'uniquelocal'];

// Una IP (192.168.1.10, ::1), una subred CIDR (10.0.0.0/8, fd00::/8) o un rango con nombre.
function esProxyValido(valor) {
  if (RANGOS_PROXY_CON_NOMBRE.includes(valor)) return true;

  const [ip, prefijo, ...resto] = valor.split('/');
  const version = isIP(ip);
  if (version === 0 || resto.length > 0) return false;
  if (prefijo === undefined) return true;

  const maximo = version === 4 ? 32 : 128;
  return /^\d{1,3}$/.test(prefijo) && Number(prefijo) <= maximo;
}

// TRUST_PROXY: a quién cree Express cuando lee X-Forwarded-For (define req.ip).
// - false o 0 (por defecto): a nadie; req.ip es la IP de la conexión.
// - un número N: a los N proxies más cercanos (ej. 1 detrás de un solo Nginx).
// - una lista de IPs, subredes o rangos con nombre, separados por comas.
// "true" se rechaza: confiaría en cualquier X-Forwarded-For y el cliente podría falsear su IP.
const esquemaConfiarProxy = z
  .string()
  .default('false')
  .transform((valor, contexto) => {
    const texto = valor.trim().toLowerCase();

    if (texto === 'false') return false;
    if (texto === 'true') {
      contexto.addIssue({
        code: 'custom',
        message:
          'no puede ser true (permitiría falsear la IP); usa el número de proxies o sus IPs.',
      });
      return z.NEVER;
    }
    if (/^\d+$/.test(texto)) {
      const saltos = Number(texto);
      if (saltos > 10) {
        contexto.addIssue({ code: 'custom', message: 'el número de proxies debe ser de 0 a 10.' });
        return z.NEVER;
      }
      return saltos === 0 ? false : saltos;
    }

    const proxies = texto
      .split(',')
      .map((proxy) => proxy.trim())
      .filter(Boolean);
    if (proxies.length === 0 || !proxies.every(esProxyValido)) {
      contexto.addIssue({
        code: 'custom',
        message:
          'debe ser false, un número de proxies o una lista de IPs/subredes separadas por comas.',
      });
      return z.NEVER;
    }
    return Object.freeze(proxies);
  });

const esquemaEntorno = z
  .object({
    NODE_ENV: sinVacio(
      z
        .enum(['development', 'test', 'production'], {
          error: 'debe ser development, test o production.',
        })
        .default('development'),
    ),
    PORT: sinVacio(
      z.coerce
        .number({ error: 'debe ser un número.' })
        .int('debe ser un número entero.')
        .min(1, 'debe estar entre 1 y 65535.')
        .max(65535, 'debe estar entre 1 y 65535.')
        .default(3000),
    ),
    LOG_LEVEL: sinVacio(
      z
        .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'], {
          error: 'debe ser fatal, error, warn, info, debug, trace o silent.',
        })
        .default('info'),
    ),
    CORS_ORIGEN: sinVacio(
      z
        .string()
        .default('http://localhost:5173')
        .transform((valor) =>
          valor
            .split(',')
            .map((origen) => origen.trim().replace(/\/+$/, ''))
            .filter(Boolean),
        )
        .pipe(
          z
            .array(
              urlConProtocolo(
                ['http:', 'https:'],
                'cada origen debe ser una URL http(s), separadas por comas.',
              ),
            )
            .min(1, 'debe indicar al menos un origen.'),
        ),
    ),
    TRUST_PROXY: sinVacio(esquemaConfiarProxy),
    DATABASE_URL: sinVacio(
      urlConProtocolo(
        ['postgres:', 'postgresql:'],
        'debe ser una URL de PostgreSQL (postgres://usuario:clave@servidor:puerto/base).',
      ),
    ),
    REDIS_URL: sinVacio(
      urlConProtocolo(
        ['redis:', 'rediss:'],
        'debe ser una URL de Redis (redis://servidor:puerto).',
      ),
    ),
    // Caché de lecturas públicas en Redis (ADR-02). Se puede apagar sin tocar el código.
    CACHE_HABILITADA: sinVacio(
      z
        .enum(['true', 'false'], { error: 'debe ser true o false.' })
        .default('true')
        .transform((valor) => valor === 'true'),
    ),
    JWT_SECRET: sinVacio(z.string().min(32, 'debe tener al menos 32 caracteres.')),
    JWT_EXPIRA_EN: sinVacio(
      z
        .string()
        .regex(/^\d+[smhd]$/, 'debe ser una duración como 30m, 8h o 1d.')
        .default('8h'),
    ),
    // Almacenamiento de archivos: opcional hasta la Ola 3.
    OCI_S3_ENDPOINT: opcional(urlConProtocolo(['https:'], 'debe ser una URL https.')),
    OCI_S3_REGION: opcional(z.string()),
    OCI_S3_BUCKET_NAME: opcional(z.string()),
    OCI_S3_ACCESS_KEY_ID: opcional(z.string()),
    OCI_S3_SECRET_ACCESS_KEY: opcional(z.string()),
    CDN_PUBLIC_URL: opcional(urlConProtocolo(['https:', 'http:'], 'debe ser una URL http(s).')),
  })
  .superRefine((variables, contexto) => {
    if (variables.NODE_ENV === 'production' && variables.JWT_SECRET === JWT_SECRET_DE_EJEMPLO) {
      contexto.addIssue({
        code: 'custom',
        path: ['JWT_SECRET'],
        message: 'no puede ser el valor de ejemplo de .env.example en producción.',
      });
    }

    // Las credenciales de OCI van todas juntas o ninguna.
    const definidas = VARIABLES_OCI.filter((nombre) => variables[nombre] !== undefined);
    if (definidas.length > 0 && definidas.length < VARIABLES_OCI.length) {
      for (const nombre of VARIABLES_OCI.filter((n) => !definidas.includes(n))) {
        contexto.addIssue({
          code: 'custom',
          path: [nombre],
          message: 'falta: las variables OCI_S3_* se configuran todas juntas o ninguna.',
        });
      }
    }
  });

export class ErrorEntorno extends Error {
  constructor(problemas) {
    super(
      'Las variables de entorno no son válidas (revisa backend/.env; la guía es backend/.env.example):\n' +
        problemas.map((problema) => `  - ${problema}`).join('\n'),
    );
    this.name = 'ErrorEntorno';
    this.problemas = problemas;
  }
}

// Convierte los errores de Zod en mensajes por variable. Nunca incluye los valores (pueden ser secretos).
function describirProblemas(issues, variables) {
  return issues.map((issue) => {
    const nombre = String(issue.path[0] ?? 'entorno');
    const valor = variables[nombre];
    const falta = valor === undefined || String(valor).trim() === '';
    return `${nombre}: ${falta && issue.code === 'invalid_type' ? 'es obligatoria.' : issue.message}`;
  });
}

// Valida un conjunto de variables y devuelve la configuración de la API (inmutable).
export function validarEntorno(variables) {
  const resultado = esquemaEntorno.safeParse(variables);

  if (!resultado.success) {
    throw new ErrorEntorno(describirProblemas(resultado.error.issues, variables));
  }

  const v = resultado.data;
  const ociConfigurado = v.OCI_S3_ENDPOINT !== undefined;

  return Object.freeze({
    modo: v.NODE_ENV,
    esProduccion: v.NODE_ENV === 'production',
    esPrueba: v.NODE_ENV === 'test',
    puerto: v.PORT,
    nivelLog: v.LOG_LEVEL,
    corsOrigenes: Object.freeze(v.CORS_ORIGEN),
    confiarProxy: v.TRUST_PROXY,
    baseDatosUrl: v.DATABASE_URL,
    redisUrl: v.REDIS_URL,
    cacheHabilitada: v.CACHE_HABILITADA,
    jwt: Object.freeze({ secreto: v.JWT_SECRET, expiraEn: v.JWT_EXPIRA_EN }),
    almacenamiento: ociConfigurado
      ? Object.freeze({
          endpoint: v.OCI_S3_ENDPOINT,
          region: v.OCI_S3_REGION,
          bucket: v.OCI_S3_BUCKET_NAME,
          accessKeyId: v.OCI_S3_ACCESS_KEY_ID,
          secretAccessKey: v.OCI_S3_SECRET_ACCESS_KEY,
        })
      : null,
    cdnUrlPublica: v.CDN_PUBLIC_URL?.replace(/\/+$/, '') ?? null,
  });
}

let entornoCargado;

// Configuración de la API a partir de process.env. Se valida una sola vez.
export function obtenerEntorno() {
  entornoCargado ??= validarEntorno(process.env);
  return entornoCargado;
}
