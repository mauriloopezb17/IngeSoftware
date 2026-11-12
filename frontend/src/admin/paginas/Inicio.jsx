import { useSesion } from '../sesion/SesionContexto.js';

// Pantalla de inicio del panel (se muestra dentro del layout).
export default function Inicio() {
  const { usuario } = useSesion();

  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="font-display text-4xl font-semibold text-ink">Inicio</h1>
      <p className="mt-4 text-muted">Bienvenido, {usuario?.nombreCompleto}.</p>
    </section>
  );
}
