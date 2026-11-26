import { useQuery } from '@tanstack/react-query';

import { SEDE_ACTUAL } from '../config/sede.js';
import { obtenerEvento, obtenerEventos } from '../services/portal.js';
import { clavesPortal } from './clavesPortal.js';

export function useEventos(filtros = {}, sede = SEDE_ACTUAL, opciones = {}) {
  return useQuery({
    queryKey: clavesPortal.eventos(sede, filtros),
    queryFn: ({ signal }) => obtenerEventos(sede, filtros, signal),
    enabled: Boolean(sede) && (opciones.enabled ?? true),
  });
}

export function useEvento(id, sede = SEDE_ACTUAL) {
  return useQuery({
    queryKey: clavesPortal.evento(sede, id),
    queryFn: ({ signal }) => obtenerEvento(sede, id, signal),
    enabled: Boolean(sede && id),
  });
}
