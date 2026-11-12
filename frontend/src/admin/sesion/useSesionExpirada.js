import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { CLAVE_SESION, esErrorNoAutenticado } from './api.js';

const esDeSesion = (clave) => clave?.[0] === CLAVE_SESION[0] && clave?.[1] === CLAVE_SESION[1];

// Un 401 en cualquier petición del panel significa que la sesión venció: se descarta el
// usuario y las rutas protegidas devuelven al login. Se escuchan las consultas y las
// mutaciones del QueryClient compartido (sin modificarlo) y se deja de escuchar al desmontar.
//
// Quedan fuera las operaciones de sesión (clave ['admin','sesion', ...]): un 401 del login
// son credenciales malas, no una sesión vencida.
export function useSesionExpirada() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const expirar = () => queryClient.setQueryData(CLAVE_SESION, null);

    const dejarDeEscucharConsultas = queryClient.getQueryCache().subscribe((evento) => {
      if (
        evento.type === 'updated' &&
        evento.action.type === 'error' &&
        !esDeSesion(evento.query.queryKey) &&
        esErrorNoAutenticado(evento.action.error)
      ) {
        expirar();
      }
    });

    const dejarDeEscucharMutaciones = queryClient.getMutationCache().subscribe((evento) => {
      if (
        evento.type === 'updated' &&
        evento.action.type === 'error' &&
        !esDeSesion(evento.mutation.options.mutationKey) &&
        esErrorNoAutenticado(evento.action.error)
      ) {
        expirar();
      }
    });

    return () => {
      dejarDeEscucharConsultas();
      dejarDeEscucharMutaciones();
    };
  }, [queryClient]);
}
