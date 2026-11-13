import { useQuery } from '@tanstack/react-query';

import { SEDE_ACTUAL } from '../config/sede.js';
import { obtenerMenuPaginas, obtenerPagina } from '../services/portal.js';
import { clavesPortal } from './clavesPortal.js';

export function useMenuPaginas(sede = SEDE_ACTUAL) {
  return useQuery({
    queryKey: clavesPortal.menuPaginas(sede),
    queryFn: ({ signal }) => obtenerMenuPaginas(sede, signal),
    enabled: Boolean(sede),
  });
}

export function usePagina(slug, sede = SEDE_ACTUAL) {
  return useQuery({
    queryKey: clavesPortal.pagina(sede, slug),
    queryFn: ({ signal }) => obtenerPagina(sede, slug, signal),
    enabled: Boolean(sede && slug),
  });
}
