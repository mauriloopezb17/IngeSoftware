// Funciones auxiliares para formatear teléfonos, correos, horarios, fechas y tamaños del portal.

const ZONA_BOLIVIA = 'America/La_Paz';

const MESES_CORTOS = [
  'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN',
  'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC',
];

const MESES_LARGOS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const DIAS_SEMANA = [
  'domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado',
];

export function armarHrefTelefono(telefono) {
  if (!telefono) return undefined;
  const digitos = telefono.replace(/\D/g, '');
  if (!digitos) return undefined;
  const conCodigo = digitos.startsWith('591') ? digitos : `591${digitos}`;
  return `tel:+${conCodigo}`;
}

export function armarHrefGmail(correo) {
  if (!correo) return undefined;
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(correo)}`;
}

export function quitarCeroHora(hora) {
  if (!hora) return '';
  return hora.replace(/^0(\d:)/, '$1');
}

export function formatearRangoHorario(horaInicio, horaFin) {
  const inicio = quitarCeroHora(horaInicio);
  const fin = quitarCeroHora(horaFin);
  return fin ? `${inicio} – ${fin}` : inicio;
}

export function abreviarEtiquetaDias(etiqueta) {
  if (!etiqueta) return '';
  return etiqueta
    .replace(/^Lunes a viernes$/i, 'Lun – Vie')
    .replace(/^Lunes a sábado$/i, 'Lun – Sáb');
}

function obtenerPartesBolivia(fechaIso) {
  const fecha = new Date(fechaIso);
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA_BOLIVIA,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  }).formatToParts(fecha);

  const mapa = Object.fromEntries(partes.map((p) => [p.type, p.value]));
  const diaSemanaMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  return {
    anio: Number(mapa.year),
    mes: Number(mapa.month) - 1,
    dia: Number(mapa.day),
    hora: mapa.hour === '24' ? '00' : mapa.hour,
    minuto: mapa.minute,
    diaSemana: diaSemanaMap[mapa.weekday] ?? 0,
  };
}

export function formatearDiaMes(fechaIso) {
  const { dia, mes } = obtenerPartesBolivia(fechaIso);
  return {
    dia: String(dia).padStart(2, '0'),
    mes: MESES_CORTOS[mes],
  };
}

export function formatearFechaCorta(fechaIso) {
  const { dia, mes } = obtenerPartesBolivia(fechaIso);
  return `${String(dia).padStart(2, '0')} ${MESES_CORTOS[mes]}`;
}

export function formatearFechaLarga(fechaIso) {
  const { dia, mes, anio } = obtenerPartesBolivia(fechaIso);
  return `${String(dia).padStart(2, '0')} ${MESES_CORTOS[mes]} ${anio}`;
}

export function formatearHoraEvento(evento) {
  if (evento.todoElDia) return 'Todo el día';
  if (evento.descripcion && /^Horarios:/i.test(evento.descripcion)) {
    return evento.descripcion.replace(/^Horarios:\s*/i, '');
  }
  const { hora, minuto } = obtenerPartesBolivia(evento.fechaInicio);
  return quitarCeroHora(`${hora}:${minuto}`);
}

export function formatearFechaBoda(fechaIso) {
  const { dia, mes, hora, minuto, diaSemana } = obtenerPartesBolivia(fechaIso);
  const nombreDia = DIAS_SEMANA[diaSemana];
  const nombreMes = MESES_LARGOS[mes];
  const horaTexto = quitarCeroHora(`${hora}:${minuto}`);
  return `Boda: ${nombreDia} ${dia} de ${nombreMes} · ${horaTexto}`;
}

export function formatearTamanoArchivo(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1).replace('.', ',')} MB`;
}
