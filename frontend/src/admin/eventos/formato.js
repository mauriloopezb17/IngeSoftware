// Fechas de los eventos tal como se muestran en el panel, siempre en hora de Bolivia.
const ZONA = 'America/La_Paz';
const dia = new Intl.DateTimeFormat('es', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: ZONA });
const hora = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: ZONA });

const mismoDia = (a, b) => dia.format(a) === dia.format(b);

// "sáb, 22 nov 2026 · 10:00 – 12:00", "sáb, 22 nov 2026 · Todo el día", "vie, 4 dic 2026 – dom, 6 dic 2026"...
export function formatearCuandoEvento({ fechaInicio, fechaFin, todoElDia }) {
  const inicio = new Date(fechaInicio);
  const fin = fechaFin ? new Date(fechaFin) : null;

  if (todoElDia) {
    if (!fin || mismoDia(inicio, fin)) return `${dia.format(inicio)} · Todo el día`;
    return `${dia.format(inicio)} – ${dia.format(fin)}`;
  }
  if (!fin) return `${dia.format(inicio)} · ${hora.format(inicio)}`;
  if (mismoDia(inicio, fin)) return `${dia.format(inicio)} · ${hora.format(inicio)} – ${hora.format(fin)}`;
  return `${dia.format(inicio)} ${hora.format(inicio)} – ${dia.format(fin)} ${hora.format(fin)}`;
}
