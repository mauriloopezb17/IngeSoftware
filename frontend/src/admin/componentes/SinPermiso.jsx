import { Link } from 'react-router';
import { ShieldAlert } from 'lucide-react';

import { useSesion } from '../sesion/SesionContexto.js';

export default function SinPermiso() {
  const { usuario } = useSesion();

  return (
    <section className="mx-auto max-w-xl py-10 text-center">
      <ShieldAlert className="mx-auto size-12 text-terracotta" aria-hidden="true" />
      <h1 className="mt-4 font-display text-4xl font-semibold text-ink">Sin permiso</h1>
      <p className="mt-3 text-muted">
        {usuario ? `Tu rol (${usuario.rol.nombre}) no tiene acceso a esta sección.` : 'No tienes acceso a esta sección.'}{' '}
        Si crees que es un error, consulta con el equipo técnico.
      </p>
      <Link
        to="/admin/inicio"
        className="mt-6 inline-block rounded-md bg-gold px-4 py-2.5 font-semibold text-ink hover:bg-goldDark hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-goldDark"
      >
        Volver al inicio
      </Link>
    </section>
  );
}
