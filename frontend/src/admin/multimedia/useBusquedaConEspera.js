import { useEffect, useEffectEvent, useState } from 'react';

// Texto de un campo de búsqueda que se aplica cuando se deja de escribir un momento.
//   const [texto, setTexto] = useBusquedaConEspera(buscar, (nuevo) => setBuscar(nuevo));
export function useBusquedaConEspera(aplicado, alAplicar, espera = 400) {
  const [texto, setTexto] = useState(aplicado);
  const aplicar = useEffectEvent(alAplicar);

  useEffect(() => {
    const buscar = texto.trim();
    if (buscar === aplicado) return undefined;
    const temporizador = setTimeout(() => aplicar(buscar), espera);
    return () => clearTimeout(temporizador);
  }, [texto, aplicado, espera]);

  return [texto, setTexto];
}
