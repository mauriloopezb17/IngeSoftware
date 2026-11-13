import { useQuery } from '@tanstack/react-query';

import { SEDE_ACTUAL } from '../config/sede.js';
import { obtenerSede, obtenerSedes } from '../services/portal.js';
import { clavesPortal } from './clavesPortal.js';

export function useSede(sede = SEDE_ACTUAL) {
  return useQuery({
    queryKey: clavesPortal.sede(sede),
    queryFn: ({ signal }) => obtenerSede(sede, signal),
    enabled: Boolean(sede),
  });
}

export function useComunidades() {
  return useQuery({
    queryKey: clavesPortal.sedes(),
    queryFn: ({ signal }) => obtenerSedes(signal),
  });
}
