import { useQuery } from '@tanstack/react-query';

import { SEDE_ACTUAL } from '../config/sede.js';
import { obtenerBoletines } from '../services/portal.js';
import { clavesPortal } from './clavesPortal.js';

export function useBoletines(filtros = {}, sede = SEDE_ACTUAL) {
  return useQuery({
    queryKey: clavesPortal.boletines(sede, filtros),
    queryFn: ({ signal }) => obtenerBoletines(sede, filtros, signal),
    enabled: Boolean(sede),
  });
}
