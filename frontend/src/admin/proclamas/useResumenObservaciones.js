import { useQuery } from '@tanstack/react-query';

import { usePermisos } from '../permisos/usePermisos.js';
import { CLAVE_OBSERVACIONES, obtenerResumenObservaciones } from './api.js';

export function useResumenObservaciones() {
  const { puede } = usePermisos();
  const permitido = puede('proclamas.observaciones');

  return useQuery({
    queryKey: [...CLAVE_OBSERVACIONES, 'resumen'],
    queryFn: ({ signal }) => obtenerResumenObservaciones(signal),
    enabled: permitido,
    staleTime: 30_000,
  });
}
