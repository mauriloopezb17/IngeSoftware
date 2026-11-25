/**
 * Utilidades puras para construir enlaces y URLs de mapas de Google Maps
 * sin requerir clave de API.
 */

function extraerCoordenadas(sede) {
  const lat = sede?.ubicacion?.latitud;
  const lng = sede?.ubicacion?.longitud;

  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return null;
  }

  const latNum = Number(lat);
  const lngNum = Number(lng);

  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
    return null;
  }

  return { lat: latNum, lng: lngNum };
}

function limpiarEnlaceDirections(urlTexto) {
  if (!urlTexto || typeof urlTexto !== 'string') return null;

  try {
    const url = new URL(urlTexto);
    url.searchParams.delete('origin');
    url.searchParams.delete('origin_place_id');
    url.searchParams.delete('travelmode');
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Construye el enlace "Cómo llegar" en Google Maps partiendo de la ubicación actual
 * del visitante (sin parámetro `origin` ni `travelmode` predefinido).
 */
export function enlaceComoLlegar(sede) {
  if (!sede) return null;

  const coords = extraerCoordenadas(sede);
  if (coords) {
    return `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`;
  }

  const enlaceGuardado = sede.configuracion?.enlaceComoLlegar || sede.enlaceComoLlegar || null;
  return limpiarEnlaceDirections(enlaceGuardado);
}

/**
 * Construye el enlace de Google Maps para ver la ubicación exacta de la sede
 * con el marcador rojo, sin iniciar una ruta.
 */
export function enlaceVerEnMapa(sede) {
  if (!sede) return null;

  const coords = extraerCoordenadas(sede);
  if (!coords) return null;

  return `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;
}

/**
 * Construye la URL del mapa incrustado (`iframe`) sin clave de API con el marcador
 * en la sede. Si `configuracion.urlMapaEmbed` existe, tiene prioridad.
 */
export function urlMapaIncrustado(sede) {
  if (!sede) return null;

  const embedConfigurado = sede.configuracion?.urlMapaEmbed;
  if (typeof embedConfigurado === 'string' && embedConfigurado.trim()) {
    return embedConfigurado.trim();
  }

  const coords = extraerCoordenadas(sede);
  if (!coords) return null;

  return `https://maps.google.com/maps?q=${coords.lat},${coords.lng}&z=17&hl=es&output=embed`;
}
