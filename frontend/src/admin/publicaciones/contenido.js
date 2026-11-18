// Envoltorio del contenido de una publicación (docs/api/contenido.md). Sin importar BlockNote:
// este archivo se usa desde fuera del editor, que se carga de forma diferida.

// Paleta de BlockNote aceptada por el backend (debe coincidir con `COLORES` en backend/src/validacion/blocknote.js).
export const COLORES_PERMITIDOS = [
  'default',
  'gray',
  'brown',
  'red',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
  'pink',
];

const COLORES_SET = new Set(COLORES_PERMITIDOS);
const CLAVES_COLOR = ['textColor', 'backgroundColor'];

function normalizarEstilos(styles) {
  if (!styles || typeof styles !== 'object') return styles;
  const resultado = { ...styles };
  for (const clave of CLAVES_COLOR) {
    if (clave in resultado && !COLORES_SET.has(resultado[clave])) {
      delete resultado[clave];
    }
  }
  return resultado;
}

function normalizarEnLinea(contenido) {
  if (!Array.isArray(contenido)) return contenido;
  return contenido.map((parte) => {
    if (!parte || typeof parte !== 'object') return parte;
    if (parte.type === 'link') {
      return {
        ...parte,
        ...(Array.isArray(parte.content) ? { content: normalizarEnLinea(parte.content) } : {}),
      };
    }
    if ('styles' in parte) {
      return { ...parte, styles: normalizarEstilos(parte.styles) };
    }
    return parte;
  });
}

function normalizarProps(props) {
  if (!props || typeof props !== 'object') return props;
  const resultado = { ...props };
  for (const clave of CLAVES_COLOR) {
    if (clave in resultado && resultado[clave] !== undefined && !COLORES_SET.has(resultado[clave])) {
      resultado[clave] = 'default';
    }
  }
  return resultado;
}

function normalizarBloque(bloque) {
  if (!bloque || typeof bloque !== 'object') return bloque;
  const resultado = { ...bloque };
  if ('props' in resultado) resultado.props = normalizarProps(resultado.props);
  if (Array.isArray(resultado.content)) resultado.content = normalizarEnLinea(resultado.content);
  if (Array.isArray(resultado.children)) resultado.children = resultado.children.map(normalizarBloque);
  return resultado;
}

// Normaliza los colores de los bloques antes de enviarlos a la API (p. ej. al pegar HTML con estilos CSS).
export function normalizarColores(bloques) {
  if (!Array.isArray(bloques)) return bloques;
  return bloques.map(normalizarBloque);
}

// Lo que guarda la API: el documento del editor tal como lo entrega BlockNote (`editor.document`).
export const aContenido = (bloques) => ({
  formato: 'blocknote',
  version: 1,
  bloques: normalizarColores(bloques),
});

// `initialContent` de BlockNote no acepta una lista vacía: se pasa `undefined`.
export const bloquesIniciales = (contenido) => (contenido?.bloques?.length ? contenido.bloques : undefined);

// BlockNote siempre tiene al menos un párrafo: un documento sin texto ni otros bloques es un documento vacío.
export const estaVacio = (bloques) =>
  !bloques?.length ||
  bloques.every(
    (bloque) =>
      bloque.type === 'paragraph' &&
      !bloque.children?.length &&
      (bloque.content ?? []).every((parte) => parte.type === 'text' && !parte.text.trim()),
  );
