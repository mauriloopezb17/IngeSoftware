// Formato común de las respuestas: fechas, horas, imágenes y claves en camelCase.
// Contrato: docs/api/convenciones.md (secciones 2 y 7).
import { obtenerEntorno } from '../config/entorno.js';
import { ANCHOS_VARIANTES, claveDeVariante } from '../constantes/multimedia.js';

// Bolivia (America/La_Paz) está en UTC-4 todo el año: no tiene horario de verano.
const DESFASE_BOLIVIA_MS = -4 * 60 * 60 * 1000;
const SUFIJO_BOLIVIA = '-04:00';

// timestamptz -> "2026-11-14T11:00:00-04:00" (hora de Bolivia, sin milisegundos).
// Acepta un Date (columna leída directo por pg) o un texto ISO (fecha que viene dentro de un
// json_agg/json_build_object, que PostgreSQL serializa como "2026-11-14T15:00:00+00:00").
export function formatearFechaHora(valor) {
  if (valor === null || valor === undefined) return null;

  const instante = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(instante.getTime())) {
    throw new TypeError(`Fecha y hora inválida: ${valor}`);
  }

  const horaBolivia = new Date(instante.getTime() + DESFASE_BOLIVIA_MS);
  return horaBolivia.toISOString().slice(0, 19) + SUFIJO_BOLIVIA;
}

// date -> "YYYY-MM-DD". El pool ya deja las columnas date como texto; aquí solo se valida.
export function formatearFecha(valor) {
  if (valor === null || valor === undefined) return null;

  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    throw new TypeError(`Fecha inválida (se esperaba YYYY-MM-DD): ${valor}`);
  }
  return valor;
}

// time -> "HH:mm" ("07:00:00" -> "07:00").
export function formatearHora(valor) {
  if (valor === null || valor === undefined) return null;

  const coincidencia = /^(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(String(valor));
  if (!coincidencia) {
    throw new TypeError(`Hora inválida: ${valor}`);
  }
  return `${coincidencia[1]}:${coincidencia[2]}`;
}

// URL pública de un archivo:
//  * absoluta (http/https) o relativa al portal (/media/seed/...): tal cual;
//  * clave de un objeto subido al bucket (sedes/...): se antepone CDN_PUBLIC_URL.
// Sin CDN configurado, una clave no tiene URL pública: se devuelve null.
export function urlPublica(url, cdnUrlPublica = obtenerEntorno().cdnUrlPublica) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url) || url.startsWith('/')) return url;
  if (!cdnUrlPublica) return null;
  return `${cdnUrlPublica}/${url.replace(/^\/+/, '')}`;
}

// Variantes [{ ancho, url }] de una imagen subida desde el CMS. Se calculan a partir de la clave
// del objeto y del ancho guardado: la API generó exactamente las de ancho menor al de la imagen.
// Las imágenes del seed (/media/...), las de URL fija y todo lo que no es una imagen subida
// (clave que no termina en .webp) no tienen variantes: [].
export function variantesDe(clave, ancho, cdnUrlPublica = obtenerEntorno().cdnUrlPublica) {
  const esClaveSubida = clave && !/^https?:\/\//i.test(clave) && !clave.startsWith('/');
  if (!esClaveSubida || !/\.webp$/.test(clave) || !Number.isInteger(ancho)) return [];

  return ANCHOS_VARIANTES.filter((anchoVariante) => anchoVariante < ancho).map((anchoVariante) => ({
    ancho: anchoVariante,
    url: urlPublica(claveDeVariante(clave, anchoVariante), cdnUrlPublica),
  }));
}

// Objeto imagen estándar { id, url, textoAlternativo, ancho, alto, variantes }, o null si no hay imagen.
export function imagen(
  { id = null, url = null, textoAlternativo = null, ancho = null, alto = null } = {},
  cdnUrlPublica = obtenerEntorno().cdnUrlPublica,
) {
  const urlFinal = urlPublica(url, cdnUrlPublica);
  if (!urlFinal) return null;

  return {
    id: id ?? null,
    url: urlFinal,
    textoAlternativo: textoAlternativo ?? null,
    ancho: ancho ?? null,
    alto: alto ?? null,
    variantes: variantesDe(url, ancho, cdnUrlPublica),
  };
}

// Objeto archivo (lo que no es imagen, ej. el PDF de un boletín):
// { id, url, nombreOriginal, tipoMime, tamanoBytes }, o null si no hay archivo.
export function archivo(
  { id = null, url = null, nombreOriginal = null, tipoMime = null, tamanoBytes = null } = {},
  cdnUrlPublica = obtenerEntorno().cdnUrlPublica,
) {
  const urlFinal = urlPublica(url, cdnUrlPublica);
  if (!urlFinal) return null;

  return {
    id: id ?? null,
    url: urlFinal,
    nombreOriginal: nombreOriginal ?? null,
    tipoMime: tipoMime ?? null,
    tamanoBytes: tamanoBytes ?? null,
  };
}

const snakeACamel = (clave) => clave.replace(/_([a-z0-9])/g, (_, letra) => letra.toUpperCase());

// Traduce a camelCase todas las claves de un objeto, también las anidadas y las de objetos dentro
// de listas. Los valores no se tocan. Solo para JSONB sin esquema propio (ej. sede.configuracion):
// el contenido BlockNote, los bloques y el contenido de los servicios se devuelven tal cual.
export function aCamelCase(valor) {
  if (Array.isArray(valor)) return valor.map(aCamelCase);
  if (valor === null || typeof valor !== 'object' || valor instanceof Date) return valor;

  return Object.fromEntries(
    Object.entries(valor).map(([clave, interno]) => [snakeACamel(clave), aCamelCase(interno)]),
  );
}
