import { useQuery } from '@tanstack/react-query';

import { SEDE_ACTUAL } from '../config/sede.js';
import { buscarPortal } from '../services/portal.js';
import { clavesPortal } from './clavesPortal.js';

export function useBuscar(filtros = {}, sede = SEDE_ACTUAL) {
  const consulta = typeof filtros.q === 'string' ? filtros.q.trim() : '';

  return useQuery({
    queryKey: clavesPortal.buscar(sede, filtros),
    queryFn: ({ signal }) => buscarPortal(sede, filtros, signal),
    enabled: Boolean(sede && consulta.length >= 2),
  });
}
