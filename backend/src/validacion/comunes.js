// Esquemas de validación reutilizables (Zod) para params y query de las rutas.
// Contrato: docs/api/convenciones.md (secciones 2 y 4).
//
// Los valores de query y params siempre llegan como texto: por eso se usa z.coerce
// para los números y una conversión explícita para los booleanos y las listas.
import { z } from 'zod';
import '../config/zod.js';

export const PAGINA_PREDETERMINADA = 1;
export const POR_PAGINA_PREDETERMINADO = 10;
export const POR_PAGINA_MAXIMO = 50;

// Mayor entero de una columna serial/int de PostgreSQL.
const ENTERO_MAXIMO_PG = 2_147_483_647;

// Id numérico de un recurso (ej. params.id o un elemento de ?categoria=1,3).
export const id = z.coerce
  .number({ error: 'Debe ser un número.' })
  .int('Debe ser un número entero.')
  .positive('Debe ser un número positivo.')
  .max(ENTERO_MAXIMO_PG, 'El número es demasiado grande.');

// Slug: minúsculas, números y guiones simples, sin guiones al inicio ni al final.
export const slug = z
  .string()
  .max(200, 'El slug es demasiado largo.')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Debe tener solo minúsculas, números y guiones.');

// Fecha sin hora, YYYY-MM-DD y real (rechaza 2026-02-30).
export const fecha = z.iso.date({ error: 'Debe ser una fecha válida con formato AAAA-MM-DD.' });

// Fecha y hora ISO 8601 con zona obligatoria (Z o ±hh:mm). Sin zona es ambigua: se rechaza.
export const fechaHoraConZona = z.iso.datetime({
  offset: true,
  error: 'Debe ser una fecha y hora ISO 8601 con zona horaria (ej. 2026-11-14T11:00:00-04:00).',
});

// Año de cuatro cifras (ej. ?anio=2026).
export const anio = z.coerce
  .number({ error: 'Debe ser un número.' })
  .int('Debe ser un número entero.')
  .min(1900, 'Debe ser un año entre 1900 y 2100.')
  .max(2100, 'Debe ser un año entre 1900 y 2100.');

// Booleano de query: solo "true" o "false".
export const booleanoQuery = z
  .enum(['true', 'false'], { error: 'Debe ser true o false.' })
  .transform((valor) => valor === 'true');

// Divide "a, b,c" en ["a", "b", "c"].
const separarPorComas = (valor) => valor.split(',').map((parte) => parte.trim());

// Lista de ids separados por comas (ej. ?tipo=1,3). Sin repetidos, en el orden recibido.
export const listaIds = z
  .string()
  .transform(separarPorComas)
  .pipe(z.array(id).min(1).max(50, 'Se aceptan hasta 50 valores.'))
  .transform((ids) => [...new Set(ids)]);

// Lista de códigos de una enumeración separados por comas (ej. ?tipo=NOTICIA,NOTA_DE_PRENSA).
export const listaCodigos = (codigos) =>
  z
    .string()
    .transform(separarPorComas)
    .pipe(
      z
        .array(z.enum(codigos, { error: `Debe ser uno de: ${codigos.join(', ')}.` }))
        .min(1)
        .max(codigos.length),
    )
    .transform((valores) => [...new Set(valores)]);

const enteroQuery = (esquemaNumero) =>
  z.preprocess((valor) => (Array.isArray(valor) ? {} : valor), esquemaNumero);

function campoPagina() {
  return enteroQuery(
    z.coerce
      .number({ error: 'Debe ser un número.' })
      .int('Debe ser un número entero.')
      .min(1, 'Debe ser 1 o mayor.')
      .max(ENTERO_MAXIMO_PG, 'El número es demasiado grande.'),
  ).default(PAGINA_PREDETERMINADA);
}

function campoPorPagina(maximo = POR_PAGINA_MAXIMO, predeterminado = POR_PAGINA_PREDETERMINADO) {
  return enteroQuery(
    z.coerce
      .number({ error: 'Debe ser un número.' })
      .int('Debe ser un número entero.')
      .min(1, `Debe estar entre 1 y ${maximo}.`)
      .max(maximo, `Debe estar entre 1 y ${maximo}.`),
  ).default(predeterminado);
}

// Búsqueda de texto saneada: trim, 1–100 caracteres, sin caracteres de control.
export const buscarTexto = z
  .string({ error: 'Debe ser un texto.' })
  .trim()
  .min(1, 'No puede estar vacío.')
  .max(100, 'Máximo 100 caracteres.')
  .refine((valor) => !/[\p{Cc}]/u.test(valor), 'Contiene caracteres no permitidos.');

// Paginación estándar: ?pagina=1&porPagina=10 (porPagina de 1 a 50).
export const paginacion = z.object({
  pagina: campoPagina(),
  porPagina: campoPorPagina(),
});

// Constructor común para consultas de listados: paginación + buscar + filtros + orden (lista blanca).
// Usa strictObject para rechazar parámetros desconocidos en query.<nombre>.
export function esquemaListado({
  filtros = {},
  ordenes = [],
  ordenPredeterminado,
  conBuscar = false,
  porPaginaMaximo = POR_PAGINA_MAXIMO,
  porPaginaPredeterminado = POR_PAGINA_PREDETERMINADO,
} = {}) {
  const forma = {
    pagina: campoPagina(),
    porPagina: campoPorPagina(porPaginaMaximo, porPaginaPredeterminado),
    ...(conBuscar ? { buscar: buscarTexto.optional() } : {}),
    ...filtros,
  };

  if (ordenes.length > 0) {
    forma.orden = z
      .enum(ordenes, { error: `Debe ser uno de: ${ordenes.join(', ')}.` })
      .default(ordenPredeterminado ?? ordenes[0]);
  }

  return z.strictObject(forma);
}

export function esquemaExportacion(esquema) {
  return esquema.omit({ pagina: true, porPagina: true });
}
