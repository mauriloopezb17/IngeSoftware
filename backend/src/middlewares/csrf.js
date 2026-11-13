// Protección CSRF de las peticiones que modifican datos (docs/api/autenticacion.md, sección 1).
// Se suma a SameSite=Lax: aunque el navegador envíe la cookie, la petición se rechaza si no viene
// de un origen permitido.
import { obtenerEntorno } from '../config/entorno.js';
import { ErrorApp } from '../errores/ErrorApp.js';

const METODOS_QUE_MODIFICAN = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const MENSAJE_ORIGEN = 'La petición no proviene de un origen permitido.';

// Reglas, solo en POST, PATCH y DELETE:
//  * Sec-Fetch-Site: cross-site (lo envía el navegador y el sitio no puede falsearlo): 403,
//    aunque no venga Origin;
//  * Origin presente y distinto de CORS_ORIGEN: 403;
//  * sin Origin se deja pasar: lo envían los navegadores, no las herramientas (curl, Supertest,
//    otros servidores), y estas no llevan la cookie de otro usuario.
export function protegerCsrf(req, _res, next) {
  if (!METODOS_QUE_MODIFICAN.has(req.method)) return next();

  if (req.get('sec-fetch-site') === 'cross-site') {
    return next(ErrorApp.sinPermiso(MENSAJE_ORIGEN));
  }

  const origen = req.get('origin');
  if (origen !== undefined && !obtenerEntorno().corsOrigenes.includes(origen)) {
    return next(ErrorApp.sinPermiso(MENSAJE_ORIGEN));
  }

  return next();
}
