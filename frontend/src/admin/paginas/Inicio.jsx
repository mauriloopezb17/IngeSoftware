import { useSesion } from '../sesion/SesionContexto.js';

// Pantalla de inicio del panel. Los commits siguientes la envuelven con el layout y el menú.
export default function Inicio() {
  const { usuario } = useSesion();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16 font-body">
      <h1 className="font-display text-4xl font-semibold text-ink">Inicio</h1>
      <p className="mt-4 text-muted">Bienvenido, {usuario?.nombreCompleto}.</p>
    </main>
  );
}
