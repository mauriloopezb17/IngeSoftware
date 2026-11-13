import { Outlet } from 'react-router';

import { usePermisos } from '../permisos/usePermisos.js';
import SinPermiso from './SinPermiso.jsx';

// Ruta de layout de una sección: si el rol no puede entrar muestra «sin permiso» en lugar del contenido.
// Uso: <Route element={<GuardiaSeccion clave="usuarios" />}> ...rutas de la sección... </Route>
export default function GuardiaSeccion({ clave }) {
  const { puedeVerSeccion } = usePermisos();

  return puedeVerSeccion(clave) ? <Outlet /> : <SinPermiso />;
}
