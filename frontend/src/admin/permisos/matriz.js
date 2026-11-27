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
    'eventos.detalle',
    'horarios.gestionar',
    'servicios.gestionar',
    'servicios.detalle',
    'grupos.gestionar',
    'grupos.detalle',
    'videos.gestionar',
    'sede.editar',
    'sedes.gestionar',
    'proclamas.gestionar',
    'proclamas.detalle',
    'boletines.gestionar',
    'paginas.gestionar',
    'usuarios.gestionar',
    'bitacora.ver',
    'publicaciones.exportar',
    'eventos.exportar',
    'boletines.exportar',
    'multimedia.exportar',
    'videos.exportar',
    'proclamas.exportar',
    'horarios.exportar',
    'servicios.exportar',
    'grupos.exportar',
    'paginas.exportar',
    'usuarios.exportar',
    'sedes.exportar',
    'bitacora.exportar',
  ],
  PARROCO: [
    'multimedia.subir',
    'multimedia.eliminar',
    'avisos.gestionar',
    'noticias.redactar',
    'noticias.publicar',
    'eventos.gestionar',
    'eventos.detalle',
    'horarios.gestionar',
    'servicios.gestionar',
    'servicios.detalle',
    'grupos.gestionar',
    'grupos.detalle',
    'videos.gestionar',
    'sede.editar',
    'proclamas.gestionar',
    'proclamas.detalle',
    'proclamas.observaciones',
    'boletines.gestionar',
    'paginas.gestionar',
    'bitacora.ver',
    'publicaciones.exportar',
    'eventos.exportar',
    'boletines.exportar',
    'multimedia.exportar',
    'videos.exportar',
    'proclamas.exportar',
    'horarios.exportar',
    'servicios.exportar',
    'grupos.exportar',
    'paginas.exportar',
    'observaciones.exportar',
    'usuarios.exportar',
    'sedes.exportar',
    'bitacora.exportar',
  ],
  SECRETARIA: [
    'multimedia.subir',
    'multimedia.eliminar',
    'avisos.gestionar',
    'eventos.gestionar',
    'eventos.detalle',
    'horarios.gestionar',
    'servicios.gestionar',
    'servicios.detalle',
    'grupos.gestionar',
    'grupos.detalle',
    'videos.gestionar',
    'sede.editar',
    'proclamas.gestionar',
    'proclamas.detalle',
    'boletines.gestionar',
    'paginas.gestionar',
    'publicaciones.exportar',
    'eventos.exportar',
    'boletines.exportar',
    'multimedia.exportar',
    'videos.exportar',
    'proclamas.exportar',
    'horarios.exportar',
    'servicios.exportar',
    'grupos.exportar',
    'paginas.exportar',
  ],
  MARKETING: [
    'multimedia.subir',
    'multimedia.eliminar',
    'noticias.redactar',
    'eventos.detalle',
    'servicios.detalle',
    'grupos.detalle',
    'videos.gestionar',
    'proclamas.detalle',
    'boletines.gestionar',
    'publicaciones.exportar',
    'eventos.exportar',
    'boletines.exportar',
    'multimedia.exportar',
    'videos.exportar',
  ],
};

// Todos los roles pueden CONSULTAR los recursos de su sede, salvo estas dos secciones,
// que además exigen un permiso para entrar (el contrato las excluye de la lectura general).
const PERMISO_PARA_ENTRAR = {
  usuarios: ['usuarios.gestionar', 'usuarios.exportar'],
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
  if (!requerido) return true;
  return Array.isArray(requerido)
    ? requerido.some((permiso) => puede(usuario, permiso))
    : puede(usuario, requerido);
}

// «multimedia.eliminar»: fuera del Administrador, cada usuario solo elimina los archivos que subió.
// Que el archivo esté en uso es otra condición (lo informa `archivo.enUso`, y la API responde 409).
export function puedeEliminarArchivo(usuario, archivo) {
  if (!puede(usuario, 'multimedia.eliminar')) return false;
  return usuario.rol.codigo === 'ADMINISTRADOR' || archivo.subidoPor.id === usuario.id;
}
