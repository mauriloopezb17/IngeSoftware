import { useQuery } from '@tanstack/react-query';

import { SEDE_ACTUAL } from '../config/sede.js';
import { obtenerEventos } from '../services/portal.js';
import { clavesPortal } from './clavesPortal.js';

export function useEventos(filtros = {}, sede = SEDE_ACTUAL) {
  return useQuery({
    queryKey: clavesPortal.eventos(sede, filtros),
    queryFn: ({ signal }) => obtenerEventos(sede, filtros, signal),
    enabled: Boolean(sede),
  });
}
