// Utilidades de texto compartidas en las pantallas de contenido del panel.
export function pluralizar(cantidad, singular, plural = `${singular}s`) {
  return `${cantidad} ${cantidad === 1 ? singular : plural}`;
}

