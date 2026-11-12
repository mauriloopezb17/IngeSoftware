// Patrón de URL de la API para los handlers de MSW.
// El comodín inicial permite que funcione con VITE_API_URL relativa o absoluta.
export const api = (ruta) => `*/api${ruta}`;
