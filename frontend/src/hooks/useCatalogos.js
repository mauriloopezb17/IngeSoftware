import { useQuery } from '@tanstack/react-query';

import { obtenerCategorias, obtenerCategoriasEvento } from '../services/portal.js';
import { clavesPortal } from './clavesPortal.js';

export function useCategorias() {
  return useQuery({
    queryKey: clavesPortal.categorias(),
    queryFn: ({ signal }) => obtenerCategorias(signal),
  });
}

export function useCategoriasEvento() {
  return useQuery({
    queryKey: clavesPortal.categoriasEvento(),
    queryFn: ({ signal }) => obtenerCategoriasEvento(signal),
  });
}
