import Dialogo from '../componentes/Dialogo.jsx';
import { Boton } from '../ui/index.js';
import {
  etiquetaAccion,
  formatearFechaHoraBitacora,
  formatearValorBitacora,
  nombreCampoLegible,
} from './api.js';

function ValorCelda({ valor }) {
  if (valor === '[oculto]') {
    return (
      <span className="inline-block rounded bg-panel px-2 py-0.5 font-mono text-xs text-muted">
        [oculto]
      </span>
    );
  }
  const texto = formatearValorBitacora(valor);
  const esVacio = valor === undefined || valor === null;
  return (
    <span className={esVacio ? 'text-muted' : 'break-words whitespace-pre-wrap text-ink'}>
      {texto}
    </span>
  );
}

export default function DetalleBitacora({ registro, onCerrar }) {
  const anteriores = registro.datosAnteriores ?? {};
  const nuevos = registro.datosNuevos ?? {};
  const campos = [...new Set([...Object.keys(anteriores), ...Object.keys(nuevos)])];

  return (
    <Dialogo
      titulo={`Detalle del cambio #${registro.id}`}
      onCerrar={onCerrar}
      ancho="max-w-3xl"
    >
      <dl className="grid gap-3 rounded-lg border border-sand bg-panel p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold text-muted">Acción</dt>
          <dd className="mt-0.5 font-medium text-ink">
            {etiquetaAccion(registro.accion)} ({registro.accion})
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-muted">Registro afectado</dt>
          <dd className="mt-0.5 font-medium text-ink">
            {registro.entidad} #{registro.entidadId}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-muted">Usuario</dt>
          <dd className="mt-0.5 text-ink">
            {registro.usuario ? registro.usuario.nombreCompleto : 'Sistema'}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-muted">Fecha y hora</dt>
          <dd className="mt-0.5 tabular-nums text-ink">{formatearFechaHoraBitacora(registro.fecha)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-muted">Dirección IP</dt>
          <dd className="mt-0.5 font-mono text-xs text-ink">{registro.direccionIp ?? '—'}</dd>
        </div>
      </dl>

      <div className="mt-5">
        <h3 className="text-sm font-semibold text-ink">Comparación de valores</h3>

        {registro.accion === 'INSERT' && (
          <p className="mt-1 text-xs text-muted">Registro nuevo (sin datos anteriores).</p>
        )}
        {registro.accion === 'DELETE' && (
          <p className="mt-1 text-xs text-muted">Registro eliminado (sin datos nuevos).</p>
        )}

        {campos.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No hay campos registrados en este cambio.</p>
        ) : (
          <div
            role="region"
            aria-label="Cambios registrados (se desplaza horizontalmente)"
            tabIndex={0}
            className="relative mt-3 overflow-x-auto rounded-lg border border-sand focus-visible:outline-2 focus-visible:outline-ink"
          >
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-panel text-xs font-semibold uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col" className="border-b border-sand px-3 py-2.5">
                    Campo
                  </th>
                  <th scope="col" className="border-b border-sand px-3 py-2.5">
                    Antes
                  </th>
                  <th scope="col" className="border-b border-sand px-3 py-2.5">
                    Después
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand bg-white">
                {campos.map((campo) => (
                  <tr key={campo}>
                    <th scope="row" className="px-3 py-2.5 align-top font-medium text-ink">
                      <span className="capitalize">{nombreCampoLegible(campo)}</span>
                    </th>
                    <td className="px-3 py-2.5 align-top">
                      <ValorCelda
                        valor={registro.datosAnteriores ? anteriores[campo] : null}
                      />
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <ValorCelda
                        valor={registro.datosNuevos ? nuevos[campo] : null}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-5 flex justify-end border-t border-sand pt-4">
        <Boton variante="secundario" onClick={onCerrar}>
          Cerrar detalle
        </Boton>
      </div>
    </Dialogo>
  );
}
