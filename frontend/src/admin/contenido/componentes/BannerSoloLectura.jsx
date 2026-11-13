import { Eye } from 'lucide-react';

// Aviso discreto cuando el rol actual solo puede consultar la sección.
export default function BannerSoloLectura({ recurso = 'esta sección' }) {
  return (
    <p
      role="note"
      className="mt-4 flex items-center gap-2 rounded-md border border-borderSoft bg-stone/60 px-3.5 py-2.5 text-sm text-charcoal"
    >
      <Eye className="size-4 shrink-0 text-muted" aria-hidden="true" />
      Solo lectura: tu rol puede consultar {recurso}, pero no realizar cambios.
    </p>
  );
}

