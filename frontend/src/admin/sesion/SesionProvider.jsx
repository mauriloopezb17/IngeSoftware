import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  CLAVE_CERRAR_SESION,
  CLAVE_INICIAR_SESION,
  CLAVE_SESION,
  CLAVE_SESION_VENCIDA,
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

  // true tras un 401 con el panel abierto (ver useSesionExpirada). Vive en la caché para que también la marque
  // quien no está dentro del contexto (por ejemplo, la subida del editor).
  const { data: sesionVencida } = useQuery({
    queryKey: CLAVE_SESION_VENCIDA,
    queryFn: () => false,
    initialData: false,
    enabled: false,
    staleTime: Infinity,
  });

  const { mutateAsync: iniciarSesion } = useMutation({
    mutationKey: CLAVE_INICIAR_SESION,
    mutationFn: iniciarSesionApi,
    // Se espera a que /auth/yo se recargue: al resolverse el login el usuario ya está disponible.
    onSuccess: async () => {
      queryClient.setQueryData(CLAVE_SESION_VENCIDA, false);
      await queryClient.invalidateQueries({ queryKey: CLAVE_SESION, exact: true });
    },
  });

  const { mutateAsync: cerrarSesionApiMutacion } = useMutation({
    mutationKey: CLAVE_CERRAR_SESION,
    mutationFn: cerrarSesionApi,
    // Aunque falle la red, en pantalla la sesión queda cerrada y no sobran datos del usuario anterior.
    onSettled: () => {
      queryClient.setQueryData(CLAVE_SESION_VENCIDA, false);
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

  // «Seguir»: el contrato no tiene un endpoint de renovación, pero un login nuevo emite otra cookie con otro
  // `sesionExpiraEn`. Se vuelve a entrar como el mismo usuario (pidiendo su contraseña) sin salir de la pantalla,
  // así no se pierde lo que no se guardó.
  const correo = consulta.data?.correo;
  const renovarSesion = useCallback(
    (contrasena) => iniciarSesion({ correo, contrasena }),
    [iniciarSesion, correo],
  );

  const valor = useMemo(
    () => ({
      usuario: consulta.data ?? null,
      cargando: consulta.isPending,
      error: consulta.error,
      sesionVencida: Boolean(sesionVencida),
      iniciarSesion,
      renovarSesion,
      cerrarSesion,
    }),
    [consulta.data, consulta.isPending, consulta.error, sesionVencida, iniciarSesion, renovarSesion, cerrarSesion],
  );

  return <SesionContexto.Provider value={valor}>{children}</SesionContexto.Provider>;
}
