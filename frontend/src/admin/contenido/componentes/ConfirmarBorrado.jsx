import { useState } from 'react';
import { Loader2, TriangleAlert } from 'lucide-react';

import { ErrorApi } from '../../../services/clienteHttp.js';
import Dialogo from '../../componentes/Dialogo.jsx';

// Diálogo reutilizable de confirmación antes de eliminar un registro.
export default function ConfirmarBorrado({
  titulo,
  descripcion = 'Esta acción no se puede deshacer.',
  onConfirmar,
  onCancelar,
}) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  async function confirmar() {
    setError(null);
    setCargando(true);
    try {
      await onConfirmar();
    } catch (e) {
      setError(e);
      setCargando(false);
    }
  }

  const detalles = error instanceof ErrorApi ? (error.detalles ?? []) : [];

  return (
    <Dialogo titulo={titulo} onCerrar={cargando ? () => {} : onCancelar} ancho="max-w-md">
      <p className="text-sm text-charcoal">{descripcion}</p>

      {error && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-md border border-redParish/30 bg-redParish/5 p-3 text-sm text-redParish"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <p>{error.message}</p>
            {detalles.map((d) => (
              <p key={d.mensaje} className="mt-1">
                {d.mensaje}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancelar}
          disabled={cargando}
          className="rounded-md border border-borderSoft bg-white px-4 py-2 text-sm font-medium hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={confirmar}
          disabled={cargando}
          className="flex items-center gap-2 rounded-md bg-redParish px-4 py-2 text-sm font-semibold text-white hover:bg-redParish/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-redParish disabled:cursor-not-allowed disabled:opacity-60"
        >
          {cargando && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {cargando ? 'Eliminando…' : 'Eliminar'}
        </button>
      </div>
    </Dialogo>
  );
}

