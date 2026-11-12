import { http, HttpResponse } from 'msw';

// El comodín inicial permite que funcione con VITE_API_URL relativa o absoluta.
export const api = (ruta) => `*/api${ruta}`;

// Cada sección agrega aquí sus handlers, siguiendo el contrato de docs/api/.
// Ejemplo: export const handlersPortal = [ http.get(api('/sedes/:sede/horarios'), ...) ]
const handlersSalud = [
  http.get(api('/salud'), () =>
    HttpResponse.json({ estado: 'ok', servicio: 'api-parroquia', fecha: new Date().toISOString() }),
  ),
];

export const handlers = [...handlersSalud];
