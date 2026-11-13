// Envoltorio del contenido de una publicación (docs/api/contenido.md). Sin importar BlockNote:
// este archivo se usa desde fuera del editor, que se carga de forma diferida.

// Lo que guarda la API: el documento del editor tal como lo entrega BlockNote (`editor.document`).
export const aContenido = (bloques) => ({ formato: 'blocknote', version: 1, bloques });

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
