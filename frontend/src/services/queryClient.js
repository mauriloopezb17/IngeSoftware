import { QueryClient } from '@tanstack/react-query';

import { ErrorApi } from './clienteHttp.js';

export function crearQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
        // No se reintenta ante errores del cliente (404, 401…): no se arreglan solos.
        retry: (intentos, error) =>
          !(error instanceof ErrorApi && error.estado >= 400 && error.estado < 500) &&
          intentos < 2,
      },
    },
  });
}

export const queryClient = crearQueryClient();
