// Generación de archivos CSV compatibles con Excel en español y protegidos contra CSV injection.
// Reglas: BOM UTF-8, separador ';', fin de línea CRLF, comillas dobles escapadas, fechas en hora
// de Bolivia y prefijo "'" en celdas que comienzan por =, +, -, @, \t o \r.
import { formatearFecha, formatearFechaHora } from './formato.js';

export const BOM_UTF8 = '\uFEFF';
export const SEPARADOR_CSV = ';';
export const SALTO_CSV = '\r\n';

const CARACTERES_FORMULA = /^[=+\-@\t\r]/;

/**
 * Neutraliza valores que Excel o LibreOffice podrían interpretar como fórmulas.
 * Se aplica sobre la representación en texto antes de envolver en comillas.
 */
export function protegerFormulaCsv(texto) {
  if (CARACTERES_FORMULA.test(texto)) return `'${texto}`;
  return texto;
}

/**
 * Convierte un valor arbitrario a texto legible en celda CSV.
 * - null / undefined -> ''
 * - boolean -> 'Sí' / 'No'
 * - Date -> fecha y hora en hora de Bolivia (YYYY-MM-DD HH:mm:ss)
 * - Array -> elementos separados por ', '
 * - Object -> JSON compacto
 */
export function formatearCeldaCsv(valor) {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  if (valor instanceof Date) return formatearFechaHoraBoliviaCsv(valor);
  if (Array.isArray(valor)) {
    return valor
      .map((item) => formatearCeldaCsv(item))
      .filter(Boolean)
      .join(', ');
  }
  if (typeof valor === 'object') return JSON.stringify(valor);
  return String(valor);
}

/**
 * Formatea una fecha/hora (Date o ISO) en hora de Bolivia legible ("YYYY-MM-DD HH:mm:ss").
 */
export function formatearFechaHoraBoliviaCsv(valor) {
  if (valor === null || valor === undefined || valor === '') return '';
  const isoBolivia = formatearFechaHora(valor);
  if (!isoBolivia) return '';
  // "2026-11-14T11:00:00-04:00" -> "2026-11-14 11:00:00"
  return `${isoBolivia.slice(0, 10)} ${isoBolivia.slice(11, 19)}`;
}

/**
 * Formatea una fecha YYYY-MM-DD (o Date) en hora de Bolivia ("YYYY-MM-DD").
 */
export function formatearFechaBoliviaCsv(valor) {
  if (valor === null || valor === undefined || valor === '') return '';
  if (valor instanceof Date) return formatearFechaHora(valor).slice(0, 10);
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(valor)) {
    return formatearFechaHora(valor).slice(0, 10);
  }
  return formatearFecha(valor) ?? '';
}

/**
 * Devuelve la fecha actual en Bolivia (America/La_Paz, UTC-4) en formato YYYY-MM-DD.
 */
export function fechaActualBolivia(ahora = new Date()) {
  return formatearFechaHora(ahora).slice(0, 10);
}

/**
 * Escapa una celda CSV: protege fórmulas y envuelve en comillas si contiene ';', '"', '\r' o '\n'
 * (o si fue prefijada con comilla simple para neutralizar fórmula).
 */
export function escaparCeldaCsv(valor) {
  const texto = protegerFormulaCsv(formatearCeldaCsv(valor));
  if (
    texto.includes(SEPARADOR_CSV) ||
    texto.includes('"') ||
    texto.includes('\n') ||
    texto.includes('\r')
  ) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

/**
 * Genera el contenido completo de un archivo CSV con BOM UTF-8, separador ';' y CRLF.
 * @param {Array<{ encabezado: string, valor: (fila: any) => any }>} columnas
 * @param {Array<any>} filas
 * @returns {string}
 */
export function generarCsv(columnas, filas) {
  const encabezados = columnas.map((col) => escaparCeldaCsv(col.encabezado)).join(SEPARADOR_CSV);
  const lineas = filas.map((fila) =>
    columnas.map((col) => escaparCeldaCsv(col.valor(fila))).join(SEPARADOR_CSV),
  );
  return BOM_UTF8 + [encabezados, ...lineas].join(SALTO_CSV) + SALTO_CSV;
}
