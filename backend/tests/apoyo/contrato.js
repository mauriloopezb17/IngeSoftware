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

// Texto de una sección "## N. ..." de docs/api/autenticacion.md (hasta la siguiente "## ").
function seccionDeAutenticacion(numero) {
  const texto = readFileSync(`${DIRECTORIO_API}autenticacion.md`, 'utf8');
  const inicio = texto.search(new RegExp(`^## ${numero}\\. `, 'm'));
  if (inicio < 0) throw new Error(`No existe la sección ${numero} en docs/api/autenticacion.md`);

  const resto = texto.slice(inicio + 3);
  const fin = resto.search(/^## /m);
  return fin < 0 ? resto : resto.slice(0, fin);
}

const ROLES_EN_LA_MATRIZ = ['ADMINISTRADOR', 'PARROCO', 'SECRETARIA', 'MARKETING'];

// Matriz de permisos del contrato (sección 7): [{ permiso, roles: ['ADMINISTRADOR', ...] }],
// en el orden de la tabla. Una celda con ✓ significa que el rol tiene el permiso.
export function matrizDePermisosDelContrato() {
  const filas = [];

  for (const linea of seccionDeAutenticacion(7).split('\n')) {
    const celdas = linea.split('|').map((celda) => celda.trim());
    const permiso = /^`([a-z]+\.[a-z]+)`$/.exec(celdas[1] ?? '')?.[1];
    if (!permiso) continue;

    // celdas: ['', permiso, descripción, Administrador, Párroco, Secretaría, Marketing, '']
    const marcas = celdas.slice(3, 3 + ROLES_EN_LA_MATRIZ.length);
    filas.push({
      permiso,
      roles: ROLES_EN_LA_MATRIZ.filter((_rol, indice) => marcas[indice] === '✓'),
    });
  }

  if (filas.length === 0) throw new Error('No se encontró la matriz de permisos en el contrato');
  return filas;
}

// Roles del contrato (sección 5): [{ codigo: 'SECRETARIA', nombre: 'Secretaría' }].
export function rolesDelContrato() {
  return seccionDeAutenticacion(5)
    .split('\n')
    .map((linea) => linea.split('|').map((celda) => celda.trim()))
    .filter((celdas) => /^`[A-Z]+`$/.test(celdas[1] ?? ''))
    .map((celdas) => ({ codigo: celdas[1].replaceAll('`', ''), nombre: celdas[2] }));
}
