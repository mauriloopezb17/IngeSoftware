import { useQuery } from '@tanstack/react-query';

import { SEDE_ACTUAL } from '../config/sede.js';
import { obtenerPublicacion, obtenerPublicaciones } from '../services/portal.js';
import { clavesPortal } from './clavesPortal.js';

export function usePublicaciones(filtros = {}, sede = SEDE_ACTUAL) {
  return useQuery({
    queryKey: clavesPortal.publicaciones(sede, filtros),
    queryFn: ({ signal }) => obtenerPublicaciones(sede, filtros, signal),
    enabled: Boolean(sede),
  });
}

export function usePublicacion(slug, sede = SEDE_ACTUAL) {
  return useQuery({
    queryKey: clavesPortal.publicacion(sede, slug),
    queryFn: ({ signal }) => obtenerPublicacion(sede, slug, signal),
    enabled: Boolean(sede && slug),
  });
}
