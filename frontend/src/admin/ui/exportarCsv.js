const BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

export function construirUrlExportacion(recurso, filtros = {}) {
  const url = new URL(`${BASE_URL}/admin/${recurso}/exportar`, window.location.origin);
  for (const [clave, valor] of Object.entries(filtros ?? {})) {
    if (clave === 'pagina' || clave === 'porPagina') continue;
    if (valor !== undefined && valor !== null && valor !== '') {
      url.searchParams.set(clave, String(valor));
    }
  }
  return url.toString();
}
