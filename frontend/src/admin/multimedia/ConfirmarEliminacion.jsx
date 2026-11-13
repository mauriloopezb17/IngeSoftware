import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, TriangleAlert } from 'lucide-react';

import { ErrorApi } from '../../services/clienteHttp.js';
import Dialogo from '../componentes/Dialogo.jsx';
import { CLAVE_MULTIMEDIA, eliminarArchivo } from './api.js';

// Confirmación previa a eliminar un archivo. Si la API responde con un error (por ejemplo 409
// porque el archivo pasó a estar en uso) se muestra aquí, con el motivo que da el servidor.
export default function ConfirmarEliminacion({ archivo, onEliminado, onCancelar }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState(null);

  const { mutate, isPending } = useMutation({
    mutationKey: [...CLAVE_MULTIMEDIA, 'eliminar'],
    mutationFn: () => eliminarArchivo(archivo.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLAVE_MULTIMEDIA });
      onEliminado(archivo);
    },
    onError: setError,
  });

  const detalles = error instanceof ErrorApi ? (error.detalles ?? []) : [];

  return (
    <Dialogo titulo={`¿Eliminar «${archivo.nombreOriginal}»?`} onCerrar={isPending ? () => {} : onCancelar} ancho="max-w-md">
      <p className="text-sm text-charcoal">
        Se borrará de la biblioteca y del almacenamiento. Esta acción no se puede deshacer.
      </p>

      {error && (
        <div role="alert" className="mt-4 flex items-start gap-2 rounded-md border border-redParish/30 bg-redParish/5 p-3 text-sm text-redParish">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <p>{error.message}</p>
            {detalles.map((detalle) => (
              <p key={detalle.mensaje} className="mt-1">
                {detalle.mensaje}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancelar}
          disabled={isPending}
          className="rounded-md border border-borderSoft bg-white px-4 py-2 text-sm font-medium hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => {
            setError(null);
            mutate();
          }}
          disabled={isPending}
          className="flex items-center gap-2 rounded-md bg-redParish px-4 py-2 text-sm font-semibold text-white hover:bg-redParish/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-redParish disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {isPending ? 'Eliminando…' : 'Eliminar'}
        </button>
      </div>
    </Dialogo>
  );
}
