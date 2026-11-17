import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye, Inbox, RotateCcw } from 'lucide-react';

import Paginacion from '../componentes/Paginacion.jsx';
import { useSesion } from '../sesion/SesionContexto.js';
import {
  Aviso,
  Boton,
  CampoSelect,
  CampoTexto,
  EncabezadoPantalla,
  EsqueletoTarjetas,
  EstadoVacio,
  Insignia,
} from '../ui/index.js';
import {
  ACCIONES_BITACORA,
  CLAVE_BITACORA,
  ENTIDADES_BITACORA,
  etiquetaAccion,
  formatearFechaHoraBitacora,
  listarBitacora,
} from './api.js';
import DetalleBitacora from './DetalleBitacora.jsx';

const VARIANTE_ACCION = {
  INSERT: 'publicado',
  UPDATE: 'programado',
  DELETE: 'rechazado',
};

export default function Bitacora() {
  const { usuario } = useSesion();
  // El Administrador ve la bitácora de todas las sedes; el Párroco, solo la de la suya (admin.md §13).
  const esAdmin = usuario?.rol?.codigo === 'ADMINISTRADOR';

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
  const paginacion = bitacoraQuery.data?.paginacion;
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
      <EncabezadoPantalla
        titulo="Bitácora"
        descripcion={
          esAdmin
            ? 'Registro de auditoría de todos los cambios realizados en el sistema.'
            : 'Registro de auditoría de los cambios realizados en tu sede.'
        }
        acciones={
          hayFiltros && (
            <Boton variante="secundario" icono={RotateCcw} onClick={limpiarFiltros}>
              Limpiar filtros
            </Boton>
          )
        }
      />

      <div className="mt-6 grid gap-3 rounded-lg border border-sand bg-white p-4 sm:grid-cols-2 lg:grid-cols-3">
        <CampoSelect
          etiqueta="Entidad"
          value={entidad}
          onChange={(e) => {
            setEntidad(e.target.value);
            setPagina(1);
          }}
        >
          <option value="">Todas las entidades</option>
          {ENTIDADES_BITACORA.map((ent) => (
            <option key={ent.codigo} value={ent.codigo}>
              {ent.nombre} ({ent.codigo})
            </option>
          ))}
        </CampoSelect>

        <CampoTexto
          etiqueta="ID de registro"
          value={entidadId}
          onChange={(e) => {
            setEntidadId(e.target.value);
            setPagina(1);
          }}
          placeholder="Ej. 7"
        />

        <CampoSelect
          etiqueta="Acción"
          value={accion}
          onChange={(e) => {
            setAccion(e.target.value);
            setPagina(1);
          }}
        >
          <option value="">Todas las acciones</option>
          {ACCIONES_BITACORA.map((acc) => (
            <option key={acc.codigo} value={acc.codigo}>
              {acc.nombre}
            </option>
          ))}
        </CampoSelect>

        <CampoTexto
          etiqueta="ID de usuario"
          value={usuarioId}
          onChange={(e) => {
            setUsuarioId(e.target.value);
            setPagina(1);
          }}
          placeholder="Ej. 2"
        />

        <CampoTexto
          etiqueta="Desde"
          type="date"
          value={desde}
          onChange={(e) => {
            setDesde(e.target.value);
            setPagina(1);
          }}
        />

        <CampoTexto
          etiqueta="Hasta"
          type="date"
          value={hasta}
          onChange={(e) => {
            setHasta(e.target.value);
            setPagina(1);
          }}
        />
      </div>

      <div className="mt-6" aria-busy={bitacoraQuery.isPending}>
        {bitacoraQuery.isPending && (
          <EsqueletoTarjetas cantidad={4} columnas="grid-cols-1" etiqueta="Cargando registros de bitácora…" />
        )}

        {bitacoraQuery.isError && (
          <Aviso
            tipo="error"
            accion={
              <Boton variante="secundario" tamano="sm" onClick={() => bitacoraQuery.refetch()}>
                Reintentar
              </Boton>
            }
          >
            <p>{bitacoraQuery.error?.message || 'No se pudieron cargar los datos.'}</p>
          </Aviso>
        )}

        {!bitacoraQuery.isPending && !bitacoraQuery.isError && registros.length === 0 && (
          <EstadoVacio
            icono={Inbox}
            titulo="No hay cambios registrados para los filtros seleccionados."
            descripcion="Ajusta los criterios de búsqueda o limpia los filtros."
          />
        )}

        {registros.length > 0 && (
          <ul aria-label="Registros de bitácora" className="flex flex-col gap-3">
            {registros.map((registro) => (
              <li
                key={registro.id}
                className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-sand bg-white p-5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Insignia variante={VARIANTE_ACCION[registro.accion] ?? 'borrador'}>
                      {etiquetaAccion(registro.accion)}
                    </Insignia>
                    <span className="font-semibold text-ink">
                      {registro.entidad} #{registro.entidadId}
                    </span>
                    <span className="text-xs tabular-nums text-muted">
                      {formatearFechaHoraBitacora(registro.fecha)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-ink">
                    Por:{' '}
                    <span className="font-medium">
                      {registro.usuario ? registro.usuario.nombreCompleto : 'Sistema'}
                    </span>
                    {registro.direccionIp && ` · IP ${registro.direccionIp}`}
                  </p>
                </div>

                <Boton
                  variante="secundario"
                  tamano="sm"
                  icono={Eye}
                  onClick={() => setSeleccionado(registro)}
                  aria-label={`Ver detalle del cambio #${registro.id}`}
                >
                  Ver detalle
                </Boton>
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
