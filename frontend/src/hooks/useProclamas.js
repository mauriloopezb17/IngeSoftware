import { useQuery } from '@tanstack/react-query';

import { SEDE_ACTUAL } from '../config/sede.js';
import { obtenerHistorialProclamas, obtenerProclamas } from '../services/portal.js';
import { clavesPortal } from './clavesPortal.js';

export function useProclamas(sede = SEDE_ACTUAL) {
  return useQuery({
    queryKey: clavesPortal.proclamas(sede),
    queryFn: ({ signal }) => obtenerProclamas(sede, signal),
    enabled: Boolean(sede),
  });
}

export function useHistorialProclamas(filtros = {}, sede = SEDE_ACTUAL) {
  return useQuery({
    queryKey: clavesPortal.historialProclamas(sede, filtros),
    queryFn: ({ signal }) => obtenerHistorialProclamas(sede, filtros, signal),
    enabled: Boolean(sede),
  });
}
