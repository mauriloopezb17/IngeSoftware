import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  CLAVE_CERRAR_SESION,
  CLAVE_INICIAR_SESION,
  CLAVE_SESION,
  cerrarSesionApi,
  iniciarSesionApi,
  obtenerUsuarioActual,
} from './api.js';
import { SesionContexto } from './SesionContexto.js';
import { useSesionExpirada } from './useSesionExpirada.js';

// Sesión del panel: la query de /auth/yo es la única fuente de verdad.
export function SesionProvider({ children }) {
  const queryClient = useQueryClient();
  useSesionExpirada();

  const consulta = useQuery({
    queryKey: CLAVE_SESION,
    queryFn: ({ signal }) => obtenerUsuarioActual({ signal }),
    retry: false,
    staleTime: Infinity, // solo cambia al iniciar o cerrar sesión, o al recibir un 401
  });

  const { mutateAsync: iniciarSesion } = useMutation({
    mutationKey: CLAVE_INICIAR_SESION,
    mutationFn: iniciarSesionApi,
    // Se espera a que /auth/yo se recargue: al resolverse el login el usuario ya está disponible.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLAVE_SESION }),
  });

  const { mutateAsync: cerrarSesionApiMutacion } = useMutation({
    mutationKey: CLAVE_CERRAR_SESION,
    mutationFn: cerrarSesionApi,
    // Aunque falle la red, en pantalla la sesión queda cerrada y no sobran datos del usuario anterior.
    onSettled: () => {
      queryClient.setQueryData(CLAVE_SESION, null);
      queryClient.removeQueries({
        predicate: ({ queryKey }) => queryKey[0] === 'admin' && queryKey[1] !== 'sesion',
      });
      return queryClient.invalidateQueries({ queryKey: CLAVE_SESION });
    },
  });

  // Cerrar sesión nunca falla para quien la llama: si el servidor no responde, la sesión
  // igualmente queda cerrada en pantalla (la cookie vence sola).
  const cerrarSesion = useCallback(
    () => cerrarSesionApiMutacion().catch(() => undefined),
    [cerrarSesionApiMutacion],
  );

  const valor = useMemo(
    () => ({
      usuario: consulta.data ?? null,
      cargando: consulta.isPending,
      error: consulta.error,
      iniciarSesion,
      cerrarSesion,
    }),
    [consulta.data, consulta.isPending, consulta.error, iniciarSesion, cerrarSesion],
  );

  return <SesionContexto.Provider value={valor}>{children}</SesionContexto.Provider>;
}
