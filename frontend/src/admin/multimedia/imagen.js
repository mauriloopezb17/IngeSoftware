// Objeto imagen estándar de la API (docs/api/convenciones.md §7). Es lo que devuelve el
// selector de imágenes y lo que luego se guarda como portada o imagen de un contenido.
// `ancho`, `alto` y `textoAlternativo` pueden ser null; `id` es el del archivo en la biblioteca.
export function aImagenEstandar(archivo) {
  return {
    id: archivo.id,
    url: archivo.url,
    textoAlternativo: archivo.textoAlternativo ?? null,
    ancho: archivo.ancho ?? null,
    alto: archivo.alto ?? null,
  };
}
