// Construye `srcSet` y `sizes` a partir del objeto imagen estándar (docs/api/convenciones.md §7).
// Si `variantes` falta o es `[]`, devuelve `{}` para no alterar el comportamiento actual.
export function construirAtributosImagen(imagen, sizes) {
  if (!imagen?.url) return {};

  const variantesValidas = Array.isArray(imagen.variantes)
    ? imagen.variantes.filter(
        (v) => typeof v?.url === 'string' && v.url && Number.isFinite(v.ancho) && v.ancho > 0,
      )
    : [];

  if (variantesValidas.length === 0) return {};

  const entradas = [...variantesValidas]
    .sort((a, b) => a.ancho - b.ancho)
    .map((v) => `${v.url} ${v.ancho}w`);

  if (Number.isFinite(imagen.ancho) && imagen.ancho > 0) {
    const yaIncluido = variantesValidas.some(
      (v) => v.ancho === imagen.ancho && v.url === imagen.url,
    );
    if (!yaIncluido) {
      entradas.push(`${imagen.url} ${imagen.ancho}w`);
    }
  }

  return {
    srcSet: entradas.join(', '),
    sizes,
  };
}

