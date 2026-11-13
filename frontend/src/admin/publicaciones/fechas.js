// Conversión entre las fechas de la API (ISO con el desfase de Bolivia, -04:00) y los campos
// <input type="datetime-local"> ("2026-11-15T08:00"). Bolivia no usa horario de verano: el desfase es fijo.
const PARTES = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/La_Paz',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function aCampoFecha(iso) {
  if (!iso) return '';
  const partes = Object.fromEntries(PARTES.formatToParts(new Date(iso)).map(({ type, value }) => [type, value]));
  return `${partes.year}-${partes.month}-${partes.day}T${partes.hour}:${partes.minute}`;
}

export const deCampoFecha = (valor) => (valor ? `${valor}:00-04:00` : null);
