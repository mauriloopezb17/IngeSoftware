// Matriz de permisos del panel (docs/api/autenticacion.md §7). ÚNICO lugar donde viven las
// reglas por rol: el menú, las rutas y los botones la consultan; los componentes no las repiten.
// La API es quien decide de verdad (responde 403); esto solo evita mostrar lo que no se puede usar.

export const PERMISOS_POR_ROL = {
  ADMINISTRADOR: [
    'multimedia.subir',
    'multimedia.eliminar',
    'avisos.gestionar',
    'noticias.redactar',
    'noticias.publicar',
    'eventos.gestionar',
    'horarios.gestionar',
    'servicios.gestionar',
    'grupos.gestionar',
    'videos.gestionar',
    'sede.editar',
    'sedes.gestionar',
    'proclamas.gestionar',
    'boletines.gestionar',
    'paginas.gestionar',
    'usuarios.gestionar',
    'bitacora.ver',
  ],
  PARROCO: [
    'multimedia.subir',
    'multimedia.eliminar',
    'avisos.gestionar',
    'noticias.redactar',
    'noticias.publicar',
    'eventos.gestionar',
    'horarios.gestionar',
    'servicios.gestionar',
    'grupos.gestionar',
    'videos.gestionar',
    'sede.editar',
    'proclamas.gestionar',
    'boletines.gestionar',
    'paginas.gestionar',
    'bitacora.ver',
  ],
  SECRETARIA: [
    'multimedia.subir',
    'multimedia.eliminar',
    'avisos.gestionar',
    'eventos.gestionar',
    'horarios.gestionar',
    'servicios.gestionar',
    'grupos.gestionar',
    'videos.gestionar',
    'sede.editar',
    'proclamas.gestionar',
    'boletines.gestionar',
    'paginas.gestionar',
  ],
  MARKETING: [
    'multimedia.subir',
    'multimedia.eliminar',
    'noticias.redactar',
    'videos.gestionar',
    'boletines.gestionar',
  ],
};

// Todos los roles pueden CONSULTAR los recursos de su sede, salvo estas dos secciones,
// que además exigen un permiso para entrar (el contrato las excluye de la lectura general).
const PERMISO_PARA_ENTRAR = {
  usuarios: 'usuarios.gestionar',
  bitacora: 'bitacora.ver',
};

export function puede(usuario, permiso) {
  const permisos = PERMISOS_POR_ROL[usuario?.rol?.codigo];
  return Boolean(permisos?.includes(permiso));
}

// `clave` es la de rutas.js (inicio, publicaciones, multimedia, usuarios...).
export function puedeVerSeccion(usuario, clave) {
  if (!usuario) return false;
  const requerido = PERMISO_PARA_ENTRAR[clave];
  return requerido ? puede(usuario, requerido) : true;
}
