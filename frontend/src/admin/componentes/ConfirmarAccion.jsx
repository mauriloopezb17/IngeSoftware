import { Loader2, TriangleAlert } from 'lucide-react';

import Dialogo from './Dialogo.jsx';

// Confirmación de una acción que no se puede deshacer (eliminar, quitar...). Quien lo usa maneja
// la mutación y pasa `pendiente` y `error`; el motivo que da la API (por ejemplo, un 409) se muestra aquí.
export default function ConfirmarAccion({
  titulo,
  children,
  textoConfirmar = 'Eliminar',
  pendiente = false,
  error = null,
  onConfirmar,
  onCancelar,
}) {
  const detalles = error?.detalles ?? [];

  return (
    <Dialogo titulo={titulo} onCerrar={pendiente ? () => {} : onCancelar} ancho="max-w-md">
      <div className="text-sm text-charcoal">{children}</div>

      {error && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-md border border-redParish/30 bg-redParish/5 p-3 text-sm text-redParish"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <p>{error.message}</p>
            {detalles.map((detalle) => (
              <p key={`${detalle.campo}-${detalle.mensaje}`} className="mt-1">
                {detalle.mensaje}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={onCancelar}
          disabled={pendiente}
          className="rounded-md border border-borderSoft bg-white px-4 py-2 text-sm font-medium hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark disabled:opacity-60"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirmar}
          disabled={pendiente}
          className="flex items-center gap-2 rounded-md bg-redParish px-4 py-2 text-sm font-semibold text-white hover:bg-redParish/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-redParish disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pendiente && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {textoConfirmar}
        </button>
      </div>
    </Dialogo>
  );
}
