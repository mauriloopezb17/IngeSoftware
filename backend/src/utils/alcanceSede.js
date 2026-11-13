// Restricción por sede (docs/api/autenticacion.md, sección 6). Funciones puras que reciben al
// usuario de la sesión (req.usuario) y aplican las reglas a las listas, a la creación y a los
// recursos por id de los endpoints de /api/admin/...
//  * El Administrador trabaja en todas las sedes, tenga o no sede asignada.
//  * Los demás roles tienen una sola sede, y solo ven y modifican lo de esa sede.
import { ErrorApp } from '../errores/ErrorApp.js';

const MENSAJE_OTRA_SEDE = 'Este recurso pertenece a otra sede.';

export const esAdministrador = (usuario) => usuario.rol === 'ADMINISTRADOR';

// Un rol que no es Administrador sin sede asignada es una cuenta mal configurada: no puede
// trabajar con ningún recurso (en vez de ver todas las sedes por un dato que falta).
function exigirSedePropia(usuario) {
  if (usuario.sedeId === null || usuario.sedeId === undefined) {
    throw ErrorApp.sinPermiso('Tu usuario no tiene una sede asignada.');
  }
}

// Listas: el filtro "sede" (slug) que debe aplicarse.
//  * Administrador: el que pida, o undefined para todas las sedes.
//  * Otros roles: siempre la propia; si piden otra, 403.
export function sedeDeConsulta(usuario, slugSolicitado) {
  if (esAdministrador(usuario)) return slugSolicitado;

  exigirSedePropia(usuario);
  if (slugSolicitado !== undefined && slugSolicitado !== usuario.sedeSlug) {
    throw ErrorApp.sinPermiso(MENSAJE_OTRA_SEDE);
  }
  return usuario.sedeSlug;
}

// Creación: el id de la sede del nuevo recurso.
//  * Administrador: el "sedeId" del cuerpo (puede ser undefined: quien llama responde 400).
//  * Otros roles: la de la sesión; lo que venga en el cuerpo se ignora.
export function sedeParaCrear(usuario, sedeIdDelCuerpo) {
  if (esAdministrador(usuario)) return sedeIdDelCuerpo;

  exigirSedePropia(usuario);
  return usuario.sedeId;
}

// Leer, modificar o eliminar por id: 403 si el recurso es de otra sede.
export function exigirSedeDelRecurso(usuario, sedeIdDelRecurso) {
  if (esAdministrador(usuario)) return;

  exigirSedePropia(usuario);
  if (sedeIdDelRecurso !== usuario.sedeId) {
    throw ErrorApp.sinPermiso(MENSAJE_OTRA_SEDE);
  }
}
