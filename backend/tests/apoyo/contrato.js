// Lee los ejemplos JSON del contrato (docs/api/*.md) para compararlos con las respuestas reales.
// Si el contrato y la implementación se separan, las pruebas que lo usan fallan.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DIRECTORIO_API = fileURLToPath(new URL('../../../docs/api/', import.meta.url));

// Bloque JSON número `indice` (desde 0) de la sección que empieza en `encabezado`
// (ej. "## `GET /api/sedes/:sede`"). La sección termina en el siguiente "## ".
export function ejemploDelContrato(encabezado, indice = 0, documento = 'publico.md') {
  const texto = readFileSync(`${DIRECTORIO_API}${documento}`, 'utf8');
  const inicio = texto.indexOf(`\n${encabezado}\n`);
  if (inicio < 0) {
    throw new Error(`No existe la sección "${encabezado}" en docs/api/${documento}`);
  }

  const resto = texto.slice(inicio + encabezado.length + 2);
  const fin = resto.search(/\n## /);
  const seccion = fin < 0 ? resto : resto.slice(0, fin);
  const bloques = [...seccion.matchAll(/```json\n([\s\S]*?)```/g)];

  if (!bloques[indice]) {
    throw new Error(`La sección "${encabezado}" no tiene el ejemplo JSON n.º ${indice}`);
  }
  return JSON.parse(bloques[indice][1]);
}
