import { Link } from 'react-router';

import { Boton } from '../ui/index.js';

// Ruta desconocida dentro del panel (con sesión abierta).
export default function NoEncontrada() {
  return (
    <section className="mx-auto max-w-xl py-12 text-center">
      <h1 className="font-body text-2xl font-semibold text-ink sm:text-[28px]">Página no encontrada</h1>
      <p className="mt-3 text-sm text-muted">La sección que buscas no existe en el panel.</p>
      <div className="mt-6">
        <Boton como={Link} to="/admin/inicio" variante="primario">
          Volver al inicio
        </Boton>
      </div>
    </section>
  );
}
