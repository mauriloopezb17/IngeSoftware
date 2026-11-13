// Ejemplos y esquemas de los bloques de página, leídos del contrato (docs/api/contenido.md) y del
// seed (database/seed/db_portal_cms_datos_iniciales.sql), para que las pruebas fallen si se separan.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const leer = (ruta) => readFileSync(fileURLToPath(new URL(ruta, import.meta.url)), 'utf8');

// { hero_video: [ejemplo, ...], tarjetas: [ejemplo1, ejemplo2, ejemplo3], ... }
// Cada sección «### `tipo` · Nombre» de «Bloques de página» con sus bloques de código JSON.
export function ejemplosDeBloques() {
  const texto = leer('../../../docs/api/contenido.md');
  const desde = texto.indexOf('\n## Bloques de página\n');
  const secciones = texto
    .slice(desde)
    .split(/\n### `/)
    .slice(1);

  return Object.fromEntries(
    secciones.map((seccion) => {
      const codigo = seccion.slice(0, seccion.indexOf('`'));
      const ejemplos = [...seccion.matchAll(/```json\n([\s\S]*?)```/g)].map((m) =>
        JSON.parse(m[1]),
      );
      return [codigo, ejemplos];
    }),
  );
}

// { hero_video: <esquema_validacion>, ... } tal como los carga el seed.
export function esquemasDelSeed() {
  const sql = leer('../../../database/seed/db_portal_cms_datos_iniciales.sql');
  const inicio = sql.indexOf('INSERT INTO tipo_bloque');
  const bloque = sql.slice(inicio, sql.indexOf(';', inicio));

  return Object.fromEntries(
    [...bloque.matchAll(/\('(\w+)', '[^']*', '(\{.*\})'\)/g)].map((m) => [m[1], JSON.parse(m[2])]),
  );
}
