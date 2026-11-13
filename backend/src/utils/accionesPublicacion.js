// Quién puede hacer qué con una publicación según su tipo, su estado y su autor
// (docs/api/estados-publicacion.md, secciones 2, 3, 5 y 6). Funciones puras: las usan los
// endpoints para autorizar y el objeto publicación para su lista "acciones", así ambos coinciden.
//
// "Publicador del tipo": avisos.gestionar para AVISO; noticias.publicar para NOTICIA y NOTA_DE_PRENSA.
// "Redactor del tipo": quien puede crearlo (avisos.gestionar / noticias.redactar).
// La sede no se mira aquí: se comprueba antes con exigirSedeDelRecurso.
import { PERMISOS, tienePermiso } from '../constantes/permisos.js';
import { ESTADOS_PUBLICACION } from '../constantes/catalogos.js';
import { ErrorApp } from '../errores/ErrorApp.js';

export const ACCIONES = Object.freeze([
  'EDITAR',
  'ELIMINAR',
  'ENVIAR_REVISION',
  'APROBAR',
  'RECHAZAR',
  'PUBLICAR',
  'ARCHIVAR',
  'RESTAURAR',
]);

const permisoParaCrear = (tipo) =>
  tipo === 'AVISO' ? PERMISOS.AVISOS_GESTIONAR : PERMISOS.NOTICIAS_REDACTAR;
const permisoParaPublicar = (tipo) =>
  tipo === 'AVISO' ? PERMISOS.AVISOS_GESTIONAR : PERMISOS.NOTICIAS_PUBLICAR;

export const puedeCrear = (rol, tipo) => tienePermiso(rol, permisoParaCrear(tipo));
export const esPublicadorDelTipo = (rol, tipo) => tienePermiso(rol, permisoParaPublicar(tipo));

const VERBO = {
  EDITAR: 'editar',
  ELIMINAR: 'eliminar',
  ENVIAR_REVISION: 'enviar a revisión',
  APROBAR: 'aprobar',
  RECHAZAR: 'rechazar',
  PUBLICAR: 'publicar',
  ARCHIVAR: 'archivar',
  RESTAURAR: 'restaurar',
};

const sustantivo = (tipo) => (tipo === 'AVISO' ? 'avisos' : 'publicaciones');

export const errorSinPermisoDeRol = (accion, tipo) =>
  ErrorApp.sinPermiso(`Tu rol no tiene permiso para ${VERBO[accion]} ${sustantivo(tipo)}.`);

export const errorSinPermisoParaCrear = (tipo) =>
  ErrorApp.sinPermiso(
    `Tu rol no tiene permiso para crear ${tipo === 'AVISO' ? 'avisos' : 'noticias ni notas de prensa'}.`,
  );

const EN_ESTADO = {
  BORRADOR: 'en borrador',
  EN_REVISION: 'en revisión',
  PUBLICADO: 'publicadas',
  ARCHIVADO: 'archivadas',
};

// Estado desde el que se puede hacer cada transición.
export const ESTADO_DE_ORIGEN = Object.freeze({
  ENVIAR_REVISION: 'BORRADOR',
  APROBAR: 'EN_REVISION',
  RECHAZAR: 'EN_REVISION',
  PUBLICAR: 'BORRADOR',
  ARCHIVAR: 'PUBLICADO',
  RESTAURAR: 'ARCHIVADO',
});

const conflictoDeEstado = (texto, estado) =>
  ErrorApp.conflicto(`${texto} Esta está en «${ESTADOS_PUBLICACION.nombreDe(estado)}».`);

// ¿Puede "usuario" hacer "accion" sobre la publicación { tipo, estado, autorId } (códigos de la
// API)? Devuelve null si puede, o el ErrorApp que hay que responder:
//  1. 403 si su rol no tiene el permiso de la acción para ese tipo;
//  2. 409 si el estado actual no la permite (para todos, también el Administrador);
//  3. 403 si la permite solo al autor o solo al publicador del tipo.
export function evaluarAccion(accion, { tipo, estado, autorId }, usuario) {
  const publicador = esPublicadorDelTipo(usuario.rol, tipo);
  const redactor = puedeCrear(usuario.rol, tipo);
  const esAutor = autorId === usuario.id;

  switch (accion) {
    case 'EDITAR':
      if (!publicador && !redactor) return errorSinPermisoDeRol(accion, tipo);
      if (estado === 'ARCHIVADO') {
        return ErrorApp.conflicto(
          'Una publicación archivada no se puede editar. Primero hay que restaurarla.',
        );
      }
      if (estado === 'BORRADOR') {
        return publicador || esAutor
          ? null
          : ErrorApp.sinPermiso('Solo puedes editar tus propios borradores.');
      }
      return publicador
        ? null
        : ErrorApp.sinPermiso(
            `Solo quien publica ${sustantivo(tipo)} puede editarla mientras está ${EN_ESTADO[estado]}.`,
          );

    case 'ELIMINAR':
      if (!publicador && !redactor) return errorSinPermisoDeRol(accion, tipo);
      if (estado === 'EN_REVISION' || estado === 'PUBLICADO') {
        return conflictoDeEstado(
          'Solo se pueden eliminar publicaciones en borrador o archivadas: primero hay que rechazarla o archivarla.',
          estado,
        );
      }
      if (publicador) return null;
      if (estado === 'BORRADOR' && esAutor) return null;
      return ErrorApp.sinPermiso(
        estado === 'BORRADOR'
          ? 'Solo puedes eliminar tus propios borradores.'
          : `Solo quien publica ${sustantivo(tipo)} puede eliminar las archivadas.`,
      );

    case 'ENVIAR_REVISION':
      if (!tienePermiso(usuario.rol, PERMISOS.NOTICIAS_REDACTAR)) {
        return errorSinPermisoDeRol(accion, tipo);
      }
      if (tipo === 'AVISO') {
        return ErrorApp.conflicto('Los avisos no pasan por revisión: se publican directamente.');
      }
      if (estado !== 'BORRADOR') {
        return conflictoDeEstado(
          'Solo se pueden enviar a revisión publicaciones en borrador.',
          estado,
        );
      }
      return esAutor
        ? null
        : ErrorApp.sinPermiso('Solo el autor puede enviar su borrador a revisión.');

    case 'APROBAR':
    case 'RECHAZAR':
    case 'PUBLICAR':
    case 'ARCHIVAR':
    case 'RESTAURAR': {
      if (!publicador) return errorSinPermisoDeRol(accion, tipo);
      const origen = ESTADO_DE_ORIGEN[accion];
      if (estado !== origen) {
        return conflictoDeEstado(
          `Solo se pueden ${VERBO[accion]} publicaciones ${EN_ESTADO[origen]}.`,
          estado,
        );
      }
      return null;
    }

    default:
      throw new TypeError(`Acción de publicación desconocida: ${accion}`);
  }
}

// Acciones que el usuario puede hacer ahora sobre la publicación, en el orden de ACCIONES.
export function accionesDisponibles(publicacion, usuario) {
  return ACCIONES.filter((accion) => evaluarAccion(accion, publicacion, usuario) === null);
}

// Lanza el error si el usuario no puede hacer la acción.
export function exigirAccion(accion, publicacion, usuario) {
  const error = evaluarAccion(accion, publicacion, usuario);
  if (error) throw error;
}
