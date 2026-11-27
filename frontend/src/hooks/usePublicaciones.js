import { useQuery } from '@tanstack/react-query';

import { SEDE_ACTUAL } from '../config/sede.js';
import {
  obtenerNoticiasGrupo,
  obtenerNoticiasServicio,
  obtenerPublicacion,
  obtenerPublicaciones,
} from '../services/portal.js';
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

export function useNoticiasServicio(slug, filtros = {}, sede = SEDE_ACTUAL) {
  return useQuery({
    queryKey: clavesPortal.noticiasServicio(sede, slug, filtros),
    queryFn: ({ signal }) => obtenerNoticiasServicio(sede, slug, filtros, signal),
    enabled: Boolean(sede && slug),
  });
}

export function useNoticiasGrupo(slug, filtros = {}, sede = SEDE_ACTUAL) {
  return useQuery({
    queryKey: clavesPortal.noticiasGrupo(sede, slug, filtros),
    queryFn: ({ signal }) => obtenerNoticiasGrupo(sede, slug, filtros, signal),
    enabled: Boolean(sede && slug),
  });
}
