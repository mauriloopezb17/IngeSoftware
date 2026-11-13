// Autorización de los endpoints de /api/admin/...: van después de autenticar, que deja al usuario
// de la sesión en req.usuario. Sin el permiso o el rol, 403 SIN_PERMISO.
//
//   router.post('/', requerirPermiso(PERMISOS.AVISOS_GESTIONAR), controlador);
//   router.get('/', validar({ query }), filtrarPorSede, controlador);   // req.sedeFiltro
import { tienePermiso } from '../constantes/permisos.js';
import { ErrorApp } from '../errores/ErrorApp.js';
import { sedeDeConsulta } from '../utils/alcanceSede.js';

// Si una ruta olvida poner autenticar antes, no se autoriza nada: es un error de programación
// y se informa como falta de sesión, nunca como acceso permitido.
function usuarioDeLaSesion(req) {
  if (!req.usuario) throw ErrorApp.noAutenticado();
  return req.usuario;
}

// Exige un permiso de la matriz (src/constantes/permisos.js). "mensaje" permite explicar la
// acción denegada, como en el contrato ("Tu rol no tiene permiso para aprobar publicaciones.").
export function requerirPermiso(permiso, mensaje) {
  return function comprobarPermiso(req, _res, next) {
    const { rol } = usuarioDeLaSesion(req);
    if (!tienePermiso(rol, permiso)) return next(ErrorApp.sinPermiso(mensaje));
    return next();
  };
}

// Exige uno de los roles indicados (códigos de la API: 'ADMINISTRADOR', 'PARROCO', ...).
export function requerirRol(...roles) {
  return function comprobarRol(req, _res, next) {
    const { rol } = usuarioDeLaSesion(req);
    if (!roles.includes(rol)) return next(ErrorApp.sinPermiso());
    return next();
  };
}

// Listas: deja en req.sedeFiltro el slug de la sede a consultar (undefined = todas, solo el
// Administrador). Los demás roles quedan fijados a la suya, y 403 si piden otra.
// Va después de validar(): lee el filtro "sede" ya validado de req.validado.query.
export function filtrarPorSede(req, _res, next) {
  try {
    req.sedeFiltro = sedeDeConsulta(usuarioDeLaSesion(req), req.validado?.query?.sede);
    next();
  } catch (error) {
    next(error);
  }
}
