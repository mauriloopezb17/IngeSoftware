import { useRef } from 'react';

import Aviso from '../ui/Aviso.jsx';
import Boton from '../ui/Boton.jsx';
import Dialogo from './Dialogo.jsx';

// Confirmación de una acción que no se puede deshacer (eliminar, quitar...). Quien lo usa maneja
// la mutación y pasa `pendiente` y `error`; el motivo que da la API (por ejemplo, un 409) se muestra aquí.
export default function ConfirmarAccion({
  titulo,
  children,
  textoConfirmar = 'Eliminar',
  peligro = true,
  pendiente = false,
  error = null,
  onConfirmar,
  onCancelar,
}) {
  const refCancelar = useRef(null);
  const detalles = error?.detalles ?? [];

  return (
    <Dialogo titulo={titulo} onCerrar={pendiente ? () => {} : onCancelar} ancho="max-w-md" refInicial={refCancelar}>
      <div className="text-sm text-ink">{children}</div>

      {error && (
        <Aviso tipo="error" className="mt-4">
          <p>{error.message}</p>
          {detalles.map((detalle) => (
            <p key={`${detalle.campo}-${detalle.mensaje}`} className="mt-1">
              {detalle.mensaje}
            </p>
          ))}
        </Aviso>
      )}

      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <Boton ref={refCancelar} variante="secundario" onClick={onCancelar} disabled={pendiente}>
          Cancelar
        </Boton>
        <Boton
          variante={peligro ? 'peligro' : 'primario'}
          onClick={onConfirmar}
          cargando={pendiente}
        >
          {textoConfirmar}
        </Boton>
      </div>
    </Dialogo>
  );
}
