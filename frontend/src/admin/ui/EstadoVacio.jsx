import { Inbox } from 'lucide-react';

// Estado vacío claro con icono de contexto, mensaje breve y acción sugerida opcional.
export default function EstadoVacio({
  icono: Icono = Inbox,
  titulo,
  descripcion,
  accion = null,
  className = '',
}) {
  return (
    <div className={`rounded-lg border border-dashed border-sand bg-white px-6 py-12 text-center ${className}`}>
      <div className="mx-auto flex size-11 items-center justify-center rounded-md border border-sand bg-panel text-muted">
        <Icono className="size-5" aria-hidden="true" />
      </div>
      {titulo && <p className="mt-4 text-base font-semibold text-ink">{titulo}</p>}
      {descripcion && <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">{descripcion}</p>}
      {accion && <div className="mt-5 flex flex-wrap justify-center gap-3">{accion}</div>}
    </div>
  );
}
