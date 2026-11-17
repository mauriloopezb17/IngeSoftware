import { Link } from 'react-router';
import { ShieldAlert } from 'lucide-react';

import { useSesion } from '../sesion/SesionContexto.js';
import { Boton } from '../ui/index.js';

export default function SinPermiso() {
  const { usuario } = useSesion();

  return (
    <section className="mx-auto max-w-xl py-12 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-lg border border-danger/20 bg-danger-soft text-danger">
        <ShieldAlert className="size-7" aria-hidden="true" />
      </div>
      <h1 className="mt-5 font-body text-2xl font-semibold text-ink sm:text-[28px]">Sin permiso</h1>
      <p className="mt-3 text-sm text-muted">
        {usuario ? `Tu rol (${usuario.rol.nombre}) no tiene acceso a esta sección.` : 'No tienes acceso a esta sección.'}{' '}
        Si crees que es un error, consulta con el equipo técnico.
      </p>
      <div className="mt-6">
        <Boton como={Link} to="/admin/inicio" variante="primario">
          Volver al inicio
        </Boton>
      </div>
    </section>
  );
}
