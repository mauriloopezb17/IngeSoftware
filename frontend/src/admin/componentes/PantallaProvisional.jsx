import { Construction } from 'lucide-react';

// Marcador de las secciones cuyo contenido llega en las próximas olas.
export default function PantallaProvisional({ titulo }) {
  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="font-display text-4xl font-semibold text-ink">{titulo}</h1>
      <div className="mt-6 flex items-start gap-3 rounded-lg border border-dashed border-borderSoft bg-white p-5 text-muted">
        <Construction className="mt-0.5 size-5 shrink-0 text-goldDark" aria-hidden="true" />
        <p>Esta sección está en construcción. Pronto podrás gestionarla desde aquí.</p>
      </div>
    </section>
  );
}
