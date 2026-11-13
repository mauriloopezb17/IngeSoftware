// Slugs de los recursos del panel (convenciones.md, sección 2): minúsculas, sin acentos y con
// guiones. Se generan desde el título cuando no se envían y son únicos dentro de cada sede: si el
// generado ya existe, se le agrega un sufijo (-2, -3…).
import slugify from 'slugify';

// Texto -> slug, recortado a "largoMaximo" sin dejar un guion al final. Si el texto no tiene
// ninguna letra ni número (ej. "¡¡!!"), se usa "respaldo".
export function slugDesde(texto, { largoMaximo = 200, respaldo = 'sin-titulo' } = {}) {
  const base = slugify(String(texto ?? ''), { lower: true, strict: true, locale: 'es', trim: true })
    .replace(/-+/g, '-')
    .slice(0, largoMaximo)
    .replace(/^-+|-+$/g, '');
  return base || respaldo;
}

// Primer slug libre a partir de "base": base, base-2, base-3… "ocupados" son los slugs que ya
// existen en la sede. El sufijo nunca hace pasar el slug de "largoMaximo": se recorta la base.
export function slugLibre(base, ocupados, { largoMaximo = 200 } = {}) {
  const tomados = new Set(ocupados);
  if (!tomados.has(base)) return base;

  for (let numero = 2; ; numero++) {
    const sufijo = `-${numero}`;
    const recortada = base.slice(0, largoMaximo - sufijo.length).replace(/-+$/, '');
    const candidato = `${recortada}${sufijo}`;
    if (!tomados.has(candidato)) return candidato;
  }
}
