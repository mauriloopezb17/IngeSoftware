// Reparte los `detalles` de un error 400 de la API (convenciones.md §5) entre los campos de un formulario.
// `mapa`: campo del detalle -> campo del formulario. Lo que no tiene campo propio queda como aviso general;
// un error sin detalles (403, 409...) se muestra con su mensaje.
export function erroresDe(error, mapa) {
  const errores = {};
  const generales = [];
  for (const { campo, mensaje } of error?.detalles ?? []) {
    const destino = mapa[campo];
    if (destino && !errores[destino]) errores[destino] = mensaje;
    else generales.push(mensaje);
  }
  if (!Object.keys(errores).length && !generales.length) generales.push(error?.message ?? 'No se pudo guardar.');
  return { errores, generales };
}
