// Matriz de permisos por rol (docs/api/autenticacion.md, sección 7).
// Es la ÚNICA definición de quién puede qué: la lista "permisos" de /auth/login y /auth/yo sale de
// aquí, y los middlewares de la API usan esta misma tabla para autorizar. Si el contrato cambia,
// se cambia solo este archivo.
import { ROLES } from './catalogos.js';

const { ADMINISTRADOR, PARROCO, SECRETARIA, MARKETING } = Object.fromEntries(
  ROLES.codigos.map((codigo) => [codigo, codigo]),
);

// [permiso, roles que lo tienen], en el orden de la matriz del contrato.
const MATRIZ = [
  ['multimedia.subir', [ADMINISTRADOR, PARROCO, SECRETARIA, MARKETING]],
  ['multimedia.eliminar', [ADMINISTRADOR, PARROCO, SECRETARIA, MARKETING]],
  ['avisos.gestionar', [ADMINISTRADOR, PARROCO, SECRETARIA]],
  ['noticias.redactar', [ADMINISTRADOR, PARROCO, MARKETING]],
  ['noticias.publicar', [ADMINISTRADOR, PARROCO]],
  ['eventos.gestionar', [ADMINISTRADOR, PARROCO, SECRETARIA]],
  ['horarios.gestionar', [ADMINISTRADOR, PARROCO, SECRETARIA]],
  ['servicios.gestionar', [ADMINISTRADOR, PARROCO, SECRETARIA]],
  ['grupos.gestionar', [ADMINISTRADOR, PARROCO, SECRETARIA]],
  ['videos.gestionar', [ADMINISTRADOR, PARROCO, SECRETARIA, MARKETING]],
  ['sede.editar', [ADMINISTRADOR, PARROCO, SECRETARIA]],
  ['sedes.gestionar', [ADMINISTRADOR]],
  ['proclamas.gestionar', [ADMINISTRADOR, PARROCO, SECRETARIA]],
  ['boletines.gestionar', [ADMINISTRADOR, PARROCO, SECRETARIA, MARKETING]],
  ['paginas.gestionar', [ADMINISTRADOR, PARROCO, SECRETARIA]],
  ['usuarios.gestionar', [ADMINISTRADOR]],
  ['bitacora.ver', [ADMINISTRADOR, PARROCO]],
];

// Nombres de los permisos, para usarlos sin escribir el texto a mano (PERMISOS.MULTIMEDIA_SUBIR).
export const PERMISOS = Object.freeze(
  Object.fromEntries(MATRIZ.map(([permiso]) => [permiso.toUpperCase().replace('.', '_'), permiso])),
);

const PERMISOS_POR_ROL = Object.freeze(
  Object.fromEntries(
    ROLES.codigos.map((rol) => [
      rol,
      Object.freeze(MATRIZ.filter(([, roles]) => roles.includes(rol)).map(([permiso]) => permiso)),
    ]),
  ),
);

// Lista de permisos de un rol (código de la API, ej. "SECRETARIA"), en el orden de la matriz.
// Un rol desconocido no tiene ninguno.
export function permisosDe(rolCodigo) {
  return PERMISOS_POR_ROL[rolCodigo] ?? [];
}

export function tienePermiso(rolCodigo, permiso) {
  return permisosDe(rolCodigo).includes(permiso);
}
