import { AlertCircle, Eye, Loader2 } from 'lucide-react';

// Estados comunes de una pantalla que consulta la API: cargando, error con «Reintentar» y
// el aviso de solo lectura para quien puede consultar pero no modificar (matriz de permisos).

export function Cargando({ texto }) {
  return (
    <p role="status" className="flex items-center gap-2 py-10 text-sm text-muted">
      <Loader2 className="size-4 animate-spin" aria-hidden="true" /> {texto}
    </p>
  );
}

export function ErrorConsulta({ texto, error, onReintentar }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-lg border border-redParish/30 bg-redParish/5 p-4 text-sm text-redParish"
    >
      <p className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {texto}: {error?.message ?? 'error desconocido.'}
      </p>
      {onReintentar && (
        <button
          type="button"
          onClick={onReintentar}
          className="rounded-md border border-redParish/40 bg-white px-3 py-1.5 font-medium hover:bg-redParish/5 focus-visible:outline-2 focus-visible:outline-redParish"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}

export function AvisoSoloLectura({ children }) {
  return (
    <p
      role="note"
      className="mt-4 flex items-start gap-2 rounded-md border border-borderSoft bg-stone px-3 py-2 text-sm text-charcoal"
    >
      <Eye className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>
        <strong className="font-semibold">Solo lectura.</strong> {children}
      </span>
    </p>
  );
}

// Mensaje de confirmación tras guardar o eliminar (se anuncia a los lectores de pantalla).
// Con el `ref` de useEnfocarAviso recibe el foco al aparecer.
export function AvisoExito({ children, ref }) {
  if (!children) return null;
  return (
    <p
      ref={ref}
      role="status"
      tabIndex={-1}
      className="mt-4 rounded-md bg-goldPale px-3 py-2 text-sm text-goldDark outline-none focus-visible:outline-2 focus-visible:outline-goldDark"
    >
      {children}
    </p>
  );
}
