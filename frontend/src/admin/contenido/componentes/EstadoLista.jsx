import { AlertCircle, Inbox, Loader2 } from 'lucide-react';

// Estados de carga, error (con reintento) y lista vacía para las pantallas de contenido.
export default function EstadoLista({
  cargando,
  error,
  vacio,
  textoCargando = 'Cargando…',
  textoVacio = 'No hay registros todavía.',
  onReintentar,
  accionVacio,
}) {
  if (cargando) {
    return (
      <p role="status" className="flex items-center gap-2 py-10 text-sm text-muted">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" /> {textoCargando}
      </p>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="flex flex-col items-start gap-3 rounded-lg border border-redParish/30 bg-redParish/5 p-4 text-sm text-redParish"
      >
        <p className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error.message || 'No se pudieron cargar los datos.'}
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

  if (vacio) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-borderSoft bg-white py-12 text-center text-muted">
        <Inbox className="size-10" aria-hidden="true" />
        <p>{textoVacio}</p>
        {accionVacio}
      </div>
    );
  }

  return null;
}

