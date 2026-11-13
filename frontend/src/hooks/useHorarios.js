import { useQuery } from '@tanstack/react-query';

import { SEDE_ACTUAL } from '../config/sede.js';
import { obtenerHorarios } from '../services/portal.js';
import { clavesPortal } from './clavesPortal.js';

export function useHorarios(sede = SEDE_ACTUAL) {
  return useQuery({
    queryKey: clavesPortal.horarios(sede),
    queryFn: ({ signal }) => obtenerHorarios(sede, signal),
    enabled: Boolean(sede),
  });
}
