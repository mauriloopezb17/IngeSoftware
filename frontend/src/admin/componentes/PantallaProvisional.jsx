import { Construction } from 'lucide-react';

import { EncabezadoPantalla } from '../ui/index.js';

// Marcador de las secciones cuyo contenido llega en las próximas olas.
export default function PantallaProvisional({ titulo }) {
  return (
    <section className="mx-auto max-w-3xl">
      <EncabezadoPantalla titulo={titulo} />
      <div className="mt-6 flex items-start gap-3 rounded-lg border border-dashed border-sand bg-white p-5 text-sm text-muted">
        <Construction className="mt-0.5 size-5 shrink-0 text-ink" aria-hidden="true" />
        <p>Esta sección está en construcción. Pronto podrás gestionarla desde aquí.</p>
      </div>
    </section>
  );
}
