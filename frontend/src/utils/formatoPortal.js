// Funciones auxiliares para formatear teléfonos, correos, horarios y fechas del portal.

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
