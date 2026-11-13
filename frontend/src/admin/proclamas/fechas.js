// Fechas de las proclamas. Las publicaciones son «solo fecha» (YYYY-MM-DD): se tratan como texto para
// que ningún desfase horario las mueva de día. «Hoy» es el día de Bolivia.
const HOY = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz', year: 'numeric', month: '2-digit', day: '2-digit' });

export const hoy = (ahora = new Date()) => HOY.format(ahora);

// "2026-11-08" -> "08/11/2026"
export function formatearDia(fecha) {
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}`;
}

// 1 -> "1.ª", 2 -> "2.ª"
export const ordinal = (numero) => `${numero}.ª`;

// Una publicación ya salió en el portal cuando llega su fecha.
export const estaPublicada = (publicacion, ahora = new Date()) => publicacion.fecha <= hoy(ahora);

// Suma días a un "YYYY-MM-DD" (sin pasar por la zona horaria local).
export function sumarDias(fecha, dias) {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}
