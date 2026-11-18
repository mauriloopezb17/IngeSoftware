// Reparte los `detalles` de un error 400 de la API (convenciones.md §5) entre los campos de un formulario.
// `mapa`: campo del detalle -> campo del formulario. Lo que no tiene campo propio queda como aviso general;
// un error sin detalles (403, 409...) se muestra con su mensaje. Agrupa errores de bloques de contenido y
// evita mensajes duplicados.
export function erroresDe(error, mapa) {
  const errores = {};
  const generales = [];
  const vistos = new Set();
  const bloquesConError = new Set();
  let erroresDeBloques = 0;

  for (const { campo, mensaje } of error?.detalles ?? []) {
    if (campo?.startsWith('contenido.bloques.')) {
      erroresDeBloques += 1;
      const coincidencia = /^contenido\.bloques\.(\d+)(?:\.|$)/.exec(campo);
      if (coincidencia) bloquesConError.add(coincidencia[1]);
      continue;
    }

    const destino = mapa[campo];
    if (destino) {
      if (!errores[destino]) {
        errores[destino] = mensaje;
        vistos.add(mensaje);
      } else if (!vistos.has(mensaje)) {
        generales.push(mensaje);
        vistos.add(mensaje);
      }
    } else if (!vistos.has(mensaje)) {
      generales.push(mensaje);
      vistos.add(mensaje);
    }
  }

  if (erroresDeBloques > 0) {
    const cantidad = bloquesConError.size || erroresDeBloques;
    const parrafos = cantidad === 1 ? '1 párrafo' : `${cantidad} párrafos`;
    const mensaje = `El contenido tiene formato que no se puede guardar en ${parrafos} (por ejemplo, colores copiados de otra página). Quita el formato y vuelve a intentarlo.`;
    const destino = mapa.contenido ?? mapa['contenido.bloques'];
    if (destino && !errores[destino]) {
      errores[destino] = mensaje;
      vistos.add(mensaje);
    } else if (!vistos.has(mensaje)) {
      generales.push(mensaje);
      vistos.add(mensaje);
    }
  }

  if (!Object.keys(errores).length && !generales.length) {
    generales.push(error?.message ?? 'No se pudo guardar.');
  }
  return { errores, generales };
}

// Lista única de mensajes para el aviso superior del formulario (errores por campo + generales, sin duplicados).
export const resumenDeErrores = (errores, generales = []) => [
  ...new Set([...Object.values(errores), ...generales]),
];
