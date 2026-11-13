import { useMemo } from 'react';

import { useSesion } from '../sesion/SesionContexto.js';
import { puede, puedeEliminarArchivo, puedeVerSeccion } from './matriz.js';

// Permisos del usuario en sesión, listos para usar en componentes:
//   const { puede } = usePermisos();  {puede('multimedia.subir') && <BotonSubir />}
export function usePermisos() {
  const { usuario } = useSesion();

  return useMemo(
    () => ({
      puede: (permiso) => puede(usuario, permiso),
      puedeVerSeccion: (clave) => puedeVerSeccion(usuario, clave),
      puedeEliminarArchivo: (archivo) => puedeEliminarArchivo(usuario, archivo),
    }),
    [usuario],
  );
}
