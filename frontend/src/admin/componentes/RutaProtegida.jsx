import { Navigate, Outlet, useLocation } from 'react-router';
import { Loader2 } from 'lucide-react';

import { useSesion } from '../sesion/SesionContexto.js';

// Ruta de layout: solo deja pasar con sesión abierta. Sin sesión (o si un 401 la cierra
// mientras se usa el panel) lleva al login guardando la ruta original para volver después.
export default function RutaProtegida() {
  const { usuario, cargando, error } = useSesion();
  const { pathname, search, hash } = useLocation();

  if (cargando) {
    return (
      <p role="status" className="flex min-h-screen items-center justify-center gap-2 bg-panel font-body text-sm text-muted">
        <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Comprobando la sesión…
      </p>
    );
  }

  // Solo falla de verdad si la comprobación no pudo hacerse (servidor caído); un 401 es "sin sesión".
  if (!usuario && error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-panel px-4 font-body">
        <p role="alert" className="max-w-md text-center text-danger">
          No se pudo comprobar la sesión: {error.message} Recarga la página para intentarlo de nuevo.
        </p>
      </main>
    );
  }

  if (!usuario) {
    return <Navigate to="/admin/login" replace state={{ desde: `${pathname}${search}${hash}` }} />;
  }

  return <Outlet />;
}
