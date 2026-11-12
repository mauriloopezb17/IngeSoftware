import { useQuery } from '@tanstack/react-query';

import { SEDE_ACTUAL } from '../config/sede.js';
import { obtenerGruposPastorales } from '../services/portal.js';
import { clavesPortal } from './clavesPortal.js';

export function useGruposPastorales(sede = SEDE_ACTUAL) {
  return useQuery({
    queryKey: clavesPortal.gruposPastorales(sede),
    queryFn: ({ signal }) => obtenerGruposPastorales(sede, signal),
    enabled: Boolean(sede),
  });
}
