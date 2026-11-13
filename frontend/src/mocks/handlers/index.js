import { http, HttpResponse } from 'msw';

import { handlersContenido } from '../../admin/contenido/mocks/handlers.js';
import { handlersAdmin } from '../../admin/mocks/handlers.js';
import { api } from '../api.js';
import { handlersPortal } from './portal.js';

// Se reexporta para las pruebas que ya lo importan desde aquí.
export { api };

// Cada sección mantiene sus handlers en su propio archivo, siguiendo el contrato de docs/api/:
//  * portal público (Sección B): ./portal.js
//  * panel CMS (Sección C): ../../admin/mocks/handlers.js
//  * contenido de la parroquia en el panel (Sección D): ../../admin/contenido/mocks/handlers.js
const handlersSalud = [
  http.get(api('/salud'), () =>
    HttpResponse.json({
      estado: 'ok',
      servicio: 'api-parroquia',
      fecha: new Date().toISOString(),
      dependencias: { baseDatos: 'ok' },
    }),
  ),
];

export const handlers = [...handlersSalud, ...handlersPortal, ...handlersAdmin, ...handlersContenido];
