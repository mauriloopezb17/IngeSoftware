// Utilidades de fecha y hora para eventos del portal en zona horaria de Bolivia (UTC-4, America/La_Paz).

const ZONA_BOLIVIA = 'America/La_Paz';

const formateadorFechaIso = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_BOLIVIA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const formateadorDiaSemana = new Intl.DateTimeFormat('es-BO', {
  timeZone: ZONA_BOLIVIA,
  weekday: 'long',
});

const formateadorDiaYMes = new Intl.DateTimeFormat('es-BO', {
  timeZone: ZONA_BOLIVIA,
  day: 'numeric',
  month: 'long',
});

const formateadorFechaCompleta = new Intl.DateTimeFormat('es-BO', {
  timeZone: ZONA_BOLIVIA,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function capitalizar(texto) {
  if (!texto) return '';
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * Devuelve la clave de día en formato `YYYY-MM-DD` en zona horaria de Bolivia.
 */
export function claveDiaBolivia(iso) {
  if (!iso) return '';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  return formateadorFechaIso.format(fecha);
}

/**
 * Devuelve la fecha actual de Bolivia en formato `YYYY-MM-DD`.
 */
export function hoyBoliviaIso(ahora = new Date()) {
  return formateadorFechaIso.format(ahora);
}

/**
 * Valida una fecha calendario real `YYYY-MM-DD` sin depender de la zona del navegador.
 */
export function esFechaValidaIso(fechaIso) {
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(fechaIso ?? ''));
  if (!coincidencia) return false;
  const anio = Number(coincidencia[1]);
  const mes = Number(coincidencia[2]);
  const dia = Number(coincidencia[3]);
  const candidata = new Date(Date.UTC(anio, mes - 1, dia, 16, 0, 0));
  return (
    !Number.isNaN(candidata.getTime()) &&
    candidata.getUTCFullYear() === anio &&
    candidata.getUTCMonth() === mes - 1 &&
    candidata.getUTCDate() === dia
  );
}

/**
 * Suma o resta días a una fecha `YYYY-MM-DD` en hora de Bolivia.
 */
export function sumarDiasIso(fechaIso, dias) {
  if (!esFechaValidaIso(fechaIso)) return '';
  const base = new Date(`${fechaIso}T12:00:00-04:00`);
  base.setUTCDate(base.getUTCDate() + dias);
  return formateadorFechaIso.format(base);
}

/**
 * Etiqueta legible para encabezados diarios, por ejemplo «Sábado 6 de diciembre».
 */
export function etiquetaDiaEvento(fechaIso, { conAnio = false } = {}) {
  if (!esFechaValidaIso(fechaIso)) return '';
  const fecha = new Date(`${fechaIso}T12:00:00-04:00`);
  if (conAnio) {
    return capitalizar(formateadorFechaCompleta.format(fecha));
  }
  const diaSemana = capitalizar(formateadorDiaSemana.format(fecha));
  const diaYMes = formateadorDiaYMes.format(fecha);
  return `${diaSemana} ${diaYMes}`;
}

/**
 * Determina si un evento ya finalizó siguiendo RF-09 (hora de Bolivia).
 */
export function esEventoPasado(evento, ahora = new Date()) {
  if (!evento?.fechaInicio) return false;
  const ahoraMs = ahora.getTime();
  if (evento.fechaFin) {
    const fin = evento.todoElDia
      ? new Date(`${claveDiaBolivia(evento.fechaFin)}T23:59:59-04:00`)
      : new Date(evento.fechaFin);
    return fin.getTime() <= ahoraMs;
  }
  const finDia = new Date(`${claveDiaBolivia(evento.fechaInicio)}T23:59:59-04:00`);
  return finDia.getTime() <= ahoraMs;
}
