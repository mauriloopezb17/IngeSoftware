import { useQuery } from '@tanstack/react-query';

import { SEDE_ACTUAL } from '../config/sede.js';
import { obtenerServicio, obtenerServicios } from '../services/portal.js';
import { clavesPortal } from './clavesPortal.js';

export function useServicios(sede = SEDE_ACTUAL) {
  return useQuery({
    queryKey: clavesPortal.servicios(sede),
    queryFn: ({ signal }) => obtenerServicios(sede, signal),
    enabled: Boolean(sede),
  });
}

export function useServicio(slug, sede = SEDE_ACTUAL) {
  return useQuery({
    queryKey: clavesPortal.servicio(sede, slug),
    queryFn: ({ signal }) => obtenerServicio(sede, slug, signal),
    enabled: Boolean(sede && slug),
  });
}
