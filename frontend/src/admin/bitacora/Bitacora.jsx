import { useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye, RotateCcw } from 'lucide-react';

import Paginacion from '../componentes/Paginacion.jsx';
import EstadoLista from '../contenido/componentes/EstadoLista.jsx';
import { usePermisos } from '../permisos/usePermisos.js';
import {
  ACCIONES_BITACORA,
  CLAVE_BITACORA,
  ENTIDADES_BITACORA,
  etiquetaAccion,
  formatearFechaHoraBitacora,
  listarBitacora,
} from './api.js';
import DetalleBitacora from './DetalleBitacora.jsx';

const CLASES_ACCION = {
  INSERT: 'bg-emerald-50 text-emerald-800',
  UPDATE: 'bg-goldPale text-goldDark',
  DELETE: 'bg-redParish/10 text-redParish',
};

export default function Bitacora() {
  const { usuario } = usePermisos();
  const esAdmin = usuario?.rol?.codigo === 'ADMINISTRADOR';

  const idEntidad = useId();
  const idEntidadId = useId();
  const idUsuario = useId();
  const idAccion = useId();
  const idDesde = useId();
  const idHasta = useId();

  const [entidad, setEntidad] = useState('');
  const [entidadId, setEntidadId] = useState('');
  const [usuarioId, setUsuarioId] = useState('');
  const [accion, setAccion] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [pagina, setPagina] = useState(1);
  const [seleccionado, setSeleccionado] = useState(null);

  const bitacoraQuery = useQuery({
    queryKey: [...CLAVE_BITACORA, { entidad, entidadId, usuarioId, accion, desde, hasta, pagina }],
    queryFn: () =>
      listarBitacora({
        entidad: entidad || undefined,
        entidadId: entidadId.trim() || undefined,
        usuario: usuarioId.trim() || undefined,
        accion: accion || undefined,
        desde: desde || undefined,
        hasta: hasta || undefined,
        pagina,
        porPagina: 10,
      }),
  });

  const registros = bitacoraQuery.data?.datos ?? [];
  const paginacion = bitacoraQuery.data?.paginacion ?? bitacoraQuery.data?.meta?.paginacion;
  const hayFiltros = Boolean(entidad || entidadId || usuarioId || accion || desde || hasta);

  function limpiarFiltros() {
    setEntidad('');
    setEntidadId('');
    setUsuarioId('');
    setAccion('');
    setDesde('');
    setHasta('');
    setPagina(1);
  }

  return (
    <section className="mx-auto max-w-5xl">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold text-ink">Bitácora</h1>
          <p className="mt-2 text-muted">
            {esAdmin
              ? 'Registro de auditoría de todos los cambios realizados en el sistema.'
              : 'Registro de auditoría de los cambios realizados en tu sede.'}
          </p>
        </div>

        {hayFiltros && (
          <button
            type="button"
            onClick={limpiarFiltros}
            className="flex items-center gap-1.5 rounded-md border border-borderSoft bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Limpiar filtros
          </button>
        )}
      </header>

      <div className="mt-6 grid gap-3 rounded-lg border border-borderSoft bg-white p-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={idEntidad} className="text-xs font-semibold text-muted">
            Entidad
          </label>
          <select
            id={idEntidad}
            value={entidad}
            onChange={(e) => {
              setEntidad(e.target.value);
              setPagina(1);
            }}
            className="rounded-md border border-borderSoft bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-goldDark"
          >
            <option value="">Todas las entidades</option>
            {ENTIDADES_BITACORA.map((ent) => (
              <option key={ent.codigo} value={ent.codigo}>
                {ent.nombre} ({ent.codigo})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={idEntidadId} className="text-xs font-semibold text-muted">
            ID de registro
          </label>
          <input
            id={idEntidadId}
            type="text"
            value={entidadId}
            onChange={(e) => {
              setEntidadId(e.target.value);
              setPagina(1);
            }}
            placeholder="Ej. 7"
            className="rounded-md border border-borderSoft bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-goldDark"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={idAccion} className="text-xs font-semibold text-muted">
            Acción
          </label>
          <select
            id={idAccion}
            value={accion}
            onChange={(e) => {
              setAccion(e.target.value);
              setPagina(1);
            }}
            className="rounded-md border border-borderSoft bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-goldDark"
          >
            <option value="">Todas las acciones</option>
            {ACCIONES_BITACORA.map((acc) => (
              <option key={acc.codigo} value={acc.codigo}>
                {acc.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={idUsuario} className="text-xs font-semibold text-muted">
            ID de usuario
          </label>
          <input
            id={idUsuario}
            type="text"
            value={usuarioId}
            onChange={(e) => {
              setUsuarioId(e.target.value);
              setPagina(1);
            }}
            placeholder="Ej. 2"
            className="rounded-md border border-borderSoft bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-goldDark"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={idDesde} className="text-xs font-semibold text-muted">
            Desde
          </label>
          <input
            id={idDesde}
            type="date"
            value={desde}
            onChange={(e) => {
              setDesde(e.target.value);
              setPagina(1);
            }}
            className="rounded-md border border-borderSoft bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-goldDark"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={idHasta} className="text-xs font-semibold text-muted">
            Hasta
          </label>
          <input
            id={idHasta}
            type="date"
            value={hasta}
            onChange={(e) => {
              setHasta(e.target.value);
              setPagina(1);
            }}
            className="rounded-md border border-borderSoft bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-goldDark"
          />
        </div>
      </div>

      <div className="mt-6">
        <EstadoLista
          cargando={bitacoraQuery.isPending}
          error={bitacoraQuery.isError ? bitacoraQuery.error : null}
          vacio={!bitacoraQuery.isPending && !bitacoraQuery.isError && registros.length === 0}
          textoCargando="Cargando registros de bitácora…"
          textoVacio="No hay cambios registrados para los filtros seleccionados."
          onReintentar={() => bitacoraQuery.refetch()}
        />

        {registros.length > 0 && (
          <ul aria-label="Registros de bitácora" className="flex flex-col gap-3">
            {registros.map((registro) => (
              <li
                key={registro.id}
                className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-borderSoft bg-white p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        CLASES_ACCION[registro.accion] ?? 'bg-stone text-charcoal'
                      }`}
                    >
                      {etiquetaAccion(registro.accion)}
                    </span>
                    <span className="font-semibold text-ink">
                      {registro.entidad} #{registro.entidadId}
                    </span>
                    <span className="text-xs text-muted">
                      {formatearFechaHoraBitacora(registro.fecha)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-charcoal">
                    Por:{' '}
                    <span className="font-medium">
                      {registro.usuario ? registro.usuario.nombreCompleto : 'Sistema'}
                    </span>
                    {registro.direccionIp && ` · IP ${registro.direccionIp}`}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSeleccionado(registro)}
                  aria-label={`Ver detalle del cambio #${registro.id}`}
                  className="flex items-center gap-1.5 rounded-md border border-borderSoft bg-cream px-3 py-2 text-sm font-medium text-ink hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark"
                >
                  <Eye className="size-4" aria-hidden="true" />
                  Ver detalle
                </button>
              </li>
            ))}
          </ul>
        )}

        {paginacion && (
          <Paginacion
            paginacion={paginacion}
            onCambiar={setPagina}
            nombre="Paginación de la bitácora"
          />
        )}
      </div>

      {seleccionado && (
        <DetalleBitacora
          registro={seleccionado}
          onCerrar={() => setSeleccionado(null)}
        />
      )}
    </section>
  );
}

