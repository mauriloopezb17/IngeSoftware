// Situación real de una publicación para el panel (docs/api/estados-publicacion.md §4).
// La API no manda un estado extra: se deduce de `estado`, las fechas y `revision`.
//
// `tono` elige el color de la insignia: neutro, aviso (espera algo), exito, alerta o apagado.
export function situacionDe(publicacion, ahora = new Date()) {
  const { estado, fechaPublicacion, fechaExpiracion, revision } = publicacion;

  switch (estado.codigo) {
    case 'BORRADOR':
      return revision?.observacion
        ? { clave: 'rechazada', etiqueta: 'Rechazada (con observación)', tono: 'alerta' }
        : { clave: 'borrador', etiqueta: 'Borrador', tono: 'neutro' };
    case 'EN_REVISION':
      return { clave: 'en-revision', etiqueta: 'En revisión', tono: 'aviso' };
    case 'ARCHIVADO':
      return { clave: 'archivada', etiqueta: 'Archivada', tono: 'apagado' };
    case 'PUBLICADO':
      if (fechaPublicacion && new Date(fechaPublicacion) > ahora)
        return { clave: 'programada', etiqueta: 'Programada', tono: 'aviso' };
      if (fechaExpiracion && new Date(fechaExpiracion) <= ahora)
        return { clave: 'expirada', etiqueta: 'Expirada', tono: 'apagado' };
      return { clave: 'publicada', etiqueta: 'Publicada', tono: 'exito' };
    default:
      return { clave: 'desconocida', etiqueta: estado.nombre, tono: 'neutro' };
  }
}
