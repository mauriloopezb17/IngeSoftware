export function normalizarTelefonoWhatsApp(telefono) {
  if (!telefono) return null;
  let digitos = String(telefono).replace(/\D/g, '');
  if (!digitos) return null;
  if (digitos.length === 8 && (digitos.startsWith('6') || digitos.startsWith('7'))) {
    digitos = `591${digitos}`;
  }
  return digitos;
}

export function armarHrefWhatsAppGrupo(telefono, nombreGrupo) {
  const numero = normalizarTelefonoWhatsApp(telefono);
  if (!numero) return null;
  const saludo = `Hola, me gustaría participar en el grupo «${nombreGrupo}» de la parroquia.`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(saludo)}`;
}

export function armarHrefCorreoGrupo(correo, nombreGrupo) {
  if (!correo) return null;
  return `mailto:${correo}?subject=${encodeURIComponent(`Quiero participar en ${nombreGrupo}`)}`;
}
