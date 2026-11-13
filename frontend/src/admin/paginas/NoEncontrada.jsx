import { Link } from 'react-router';

// Ruta desconocida dentro del panel (con sesión abierta).
export default function NoEncontrada() {
  return (
    <section className="mx-auto max-w-xl py-10 text-center">
      <h1 className="font-display text-4xl font-semibold text-ink">Página no encontrada</h1>
      <p className="mt-3 text-muted">La sección que buscas no existe en el panel.</p>
      <Link
        to="/admin/inicio"
        className="mt-6 inline-block rounded-md bg-gold px-4 py-2.5 font-semibold text-ink hover:bg-goldDark hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-goldDark"
      >
        Volver al inicio
      </Link>
    </section>
  );
}
