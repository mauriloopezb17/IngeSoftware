import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { CLAVE_MULTIMEDIA, listarMultimedia } from './api.js';

// Página de la biblioteca para unos filtros. Al cambiar de filtro o de página se conserva
// la lista anterior mientras llega la nueva (`isPlaceholderData`), sin parpadeos.
export function useBiblioteca(filtros) {
  return useQuery({
    queryKey: [...CLAVE_MULTIMEDIA, 'lista', filtros],
    queryFn: ({ signal }) => listarMultimedia(filtros, signal),
    placeholderData: keepPreviousData,
  });
}
