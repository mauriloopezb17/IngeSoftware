import { useEffect, useRef } from 'react';

// Devuelve un `ref` para el aviso de confirmación y le da el foco cuando aparece o cambia el mensaje. Tras
// eliminar algo, el botón que se usó desaparece y el foco se perdería en <body>; llevarlo al mensaje deja a quien
// navega con teclado en un lugar lógico y hace que se lea. El efecto corre después de cerrarse el diálogo
// (que devuelve el foco a su botón, ya sin sentido) y después de pintarse el mensaje.
export function useEnfocarAviso(mensaje) {
  const ref = useRef(null);
  useEffect(() => {
    if (mensaje) ref.current?.focus();
  }, [mensaje]);
  return ref;
}
