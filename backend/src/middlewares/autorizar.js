// Autorización de los endpoints de /api/admin/...: van después de autenticar, que deja al usuario
// de la sesión en req.usuario. Sin el permiso o el rol, 403 SIN_PERMISO.
//
//   router.post('/', requerirPermiso(PERMISOS.AVISOS_GESTIONAR), controlador);
//   router.get('/', validar({ query }), filtrarPorSede, controlador);   // req.sedeFiltro
import { tienePermiso } from '../constantes/permisos.js';
import { ErrorApp } from '../errores/ErrorApp.js';
import { tieneGrupoAsignado } from '../models/usuarios.model.js';
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

// Exige al menos uno de los permisos indicados.
export function requerirAlgunPermiso(permisos, mensaje) {
  return function comprobarAlgunPermiso(req, _res, next) {
    const { rol } = usuarioDeLaSesion(req);
    if (!permisos.some((permiso) => tienePermiso(rol, permiso))) {
      return next(ErrorApp.sinPermiso(mensaje));
    }
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

// Si el usuario es Coordinador de grupo, exige que el grupo indicado en params esté asignado
// en usuario_grupo_pastoral (consultado contra la base en cada petición).
export function exigirGrupoAsignado(parametroId = 'id') {
  return async function comprobarGrupoAsignado(req, _res, next) {
    try {
      const usuario = usuarioDeLaSesion(req);
      if (usuario.rol !== 'COORDINADOR') return next();
      const grupoId = Number(req.validado?.params?.[parametroId] ?? req.params?.[parametroId]);
      if (!Number.isInteger(grupoId) || !(await tieneGrupoAsignado(usuario.id, grupoId))) {
        return next(
          ErrorApp.sinPermiso(
            'Solo puedes ver y editar los grupos pastorales que tienes asignados.',
          ),
        );
      }
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

const RUTAS_COORDINADOR = [
  ['GET', /^\/catalogos$/],
  ['GET', /^\/grupos-pastorales$/],
  ['GET', /^\/grupos-pastorales\/\d+$/],
  ['PATCH', /^\/grupos-pastorales\/\d+\/detalle$/],
  ['GET', /^\/publicaciones$/],
  ['GET', /^\/publicaciones\/\d+$/],
  ['POST', /^\/publicaciones$/],
  ['PATCH', /^\/publicaciones\/\d+$/],
  ['DELETE', /^\/publicaciones\/\d+$/],
  ['POST', /^\/publicaciones\/\d+\/enviar-revision$/],
  ['GET', /^\/multimedia$/],
  ['GET', /^\/multimedia\/\d+$/],
  ['POST', /^\/multimedia$/],
  ['PATCH', /^\/multimedia\/\d+$/],
  ['DELETE', /^\/multimedia\/\d+$/],
];

// El Coordinador de grupo solo puede acceder a sus grupos asignados y a multimedia;
// cualquier otra ruta de /api/admin (incluidos los GET de otras secciones) responde 403.
export function restringirRutasCoordinador(req, _res, next) {
  const { rol } = usuarioDeLaSesion(req);
  if (rol !== 'COORDINADOR') return next();
  const ruta = req.path.length > 1 ? req.path.replace(/\/+$/, '') : req.path;
  const permitida = RUTAS_COORDINADOR.some(
    ([metodo, patron]) => req.method === metodo && patron.test(ruta),
  );
  if (!permitida) {
    return next(
      ErrorApp.sinPermiso('Tu rol solo tiene acceso a sus grupos pastorales y multimedia.'),
    );
  }
  return next();
}
