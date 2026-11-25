const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

export function formatearFechaRelativa(iso) {
  const diffSeg = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSeg);
  if (abs < 60) return rtf.format(diffSeg, 'second');
  const diffMin = Math.round(diffSeg / 60);
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
  const diffHoras = Math.round(diffMin / 60);
  if (Math.abs(diffHoras) < 24) return rtf.format(diffHoras, 'hour');
  const diffDias = Math.round(diffHoras / 24);
  if (Math.abs(diffDias) < 30) return rtf.format(diffDias, 'day');
  const diffMeses = Math.round(diffDias / 30);
  return rtf.format(diffMeses, 'month');
}

export function armarHrefCorreo(obs) {
  if (!obs?.correo) return null;
  const asunto = `Sobre la proclama de ${obs.proclama.contrayente1} y ${obs.proclama.contrayente2}`;
  return `mailto:${obs.correo}?subject=${encodeURIComponent(asunto)}`;
}

export function normalizarTelefonoWhatsApp(telefono) {
  if (!telefono) return null;
  let digitos = String(telefono).replace(/\D/g, '');
  if (!digitos) return null;
  if (digitos.length === 8 && (digitos.startsWith('6') || digitos.startsWith('7'))) {
    digitos = `591${digitos}`;
  }
  return digitos;
}

export function armarHrefWhatsApp(obs) {
  const numero = normalizarTelefonoWhatsApp(obs?.telefono);
  if (!numero) return null;
  const saludo = `Hola ${obs.nombreCompleto}, me comunico desde la parroquia sobre la proclama de ${obs.proclama.contrayente1} y ${obs.proclama.contrayente2}.`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(saludo)}`;
}
