import { useQuery } from '@tanstack/react-query';

import { SEDE_ACTUAL } from '../config/sede.js';
import { obtenerVideos } from '../services/portal.js';
import { clavesPortal } from './clavesPortal.js';

export function useVideos(sede = SEDE_ACTUAL) {
  return useQuery({
    queryKey: clavesPortal.videos(sede),
    queryFn: ({ signal }) => obtenerVideos(sede, signal),
    enabled: Boolean(sede),
  });
}
