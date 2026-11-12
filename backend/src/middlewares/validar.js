// Validación de peticiones con Zod: params, query y body.
//
// Uso en una ruta:
//   router.get('/:id', validar({ params: esquemaId, query: esquemaFiltros }), controlador);
//   // en el controlador: req.validado.params.id, req.validado.query.pagina
//
// Lo validado (ya convertido y con valores por defecto) queda en req.validado. No se reemplazan
// req.query ni req.params: en Express 5 req.query es de solo lectura.
// Los valores de query y params siempre llegan como texto: para números o booleanos se usa
// z.coerce (ej. z.coerce.number().int()).
import '../config/zod.js';
import { ErrorApp } from '../errores/ErrorApp.js';
import { errorDeZod } from './errores.js';

// Parte de la petición -> prefijo del campo en los detalles del error.
// Los errores del cuerpo van sin prefijo ("titulo"); los demás con el suyo ("query.porPagina").
const PARTES = [
  ['params', 'params'],
  ['query', 'query'],
  ['body', ''],
];

const PARTES_VALIDAS = new Set(PARTES.map(([parte]) => parte));

// ¿La petición trae cuerpo? (aunque express.json no lo haya leído por no ser JSON)
function tieneCuerpo(req) {
  const largo = req.headers['content-length'];
  return req.headers['transfer-encoding'] !== undefined || (largo !== undefined && largo !== '0');
}

export function validar(esquemas) {
  const desconocidas = Object.keys(esquemas).filter((parte) => !PARTES_VALIDAS.has(parte));
  if (desconocidas.length > 0) {
    throw new TypeError(`validar(): partes desconocidas: ${desconocidas.join(', ')}`);
  }

  return async function validarPeticion(req, _res, next) {
    // Se espera JSON pero llegó otro tipo de cuerpo (ej. text/plain o un formulario).
    if (esquemas.body && tieneCuerpo(req) && !req.is('application/json')) {
      return next(
        new ErrorApp(
          'TIPO_NO_PERMITIDO',
          'El cuerpo de la petición debe ser JSON (application/json).',
        ),
      );
    }

    const validado = {};
    const detalles = [];

    // Se validan todas las partes y se informan todos los errores juntos.
    for (const [parte, prefijo] of PARTES) {
      const esquema = esquemas[parte];
      if (!esquema) continue;

      // Sin cuerpo, req.body es undefined: se valida {} para informar los campos que faltan.
      const resultado = await esquema.safeParseAsync(req[parte] ?? {});

      if (resultado.success) {
        validado[parte] = resultado.data;
      } else {
        detalles.push(...errorDeZod(resultado.error, prefijo).detalles);
      }
    }

    if (detalles.length > 0) {
      return next(ErrorApp.validacion(undefined, detalles));
    }

    req.validado = validado;
    return next();
  };
}
