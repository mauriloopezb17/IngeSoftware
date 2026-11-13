// Búsqueda de texto sin distinguir mayúsculas ni acentos, sin depender de la extensión unaccent.
// En SQL se compara sinAcentosSql(columna) LIKE patronBusqueda(texto) ESCAPE '\'.

const CON_ACENTO = 'áàäâãéèëêíìïîóòöôõúùüûñç';
const SIN_ACENTO = 'aaaaaeeeeiiiiooooouuuunc';

// Expresión SQL de una columna en minúsculas y sin acentos (la base pasa a minúsculas en UTF-8).
export function sinAcentosSql(columna) {
  return `translate(lower(${columna}), '${CON_ACENTO}', '${SIN_ACENTO}')`;
}

// Texto del usuario -> patrón de LIKE: minúsculas, sin acentos, con %, _ y \ escapados.
export function patronBusqueda(texto) {
  const normalizado = texto
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
  return `%${normalizado.replace(/[\\%_]/g, (caracter) => `\\${caracter}`)}%`;
}
