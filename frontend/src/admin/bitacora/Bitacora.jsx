import { useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Eye, Inbox, RotateCcw } from 'lucide-react';

import { useSesion } from '../sesion/SesionContexto.js';
import {
  Boton,
  BotonExportarCsv,
  CampoSelect,
  CampoTexto,
  EncabezadoPantalla,
  Insignia,
  TablaListado,
  useFiltrosListado,
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
  EXPORT: 'borrador',
};

export default function Bitacora() {
  const { usuario } = useSesion();
  // El Administrador ve la bitácora de todas las sedes; el Párroco, solo la de la suya (admin.md §13).
  const esAdmin = usuario?.rol?.codigo === 'ADMINISTRADOR';
  const [seleccionado, setSeleccionado] = useState(null);

  const configFiltros = useMemo(
    () => ({
      entidad: { defecto: '', validar: (v) => ENTIDADES_BITACORA.some((e) => e.codigo === v) },
      entidadId: { defecto: '', validar: (v) => /^\d+$/.test(v) },
      usuario: { defecto: '', validar: (v) => /^\d+$/.test(v) },
      accion: { defecto: '', validar: (v) => ACCIONES_BITACORA.some((a) => a.codigo === v) },
      desde: { defecto: '' },
      hasta: { defecto: '' },
    }),
    [],
  );

  const {
    valores,
    setPagina,
    actualizarFiltro,
    limpiarFiltros,
    hayFiltrosActivos,
    filtrosActivos,
  } = useFiltrosListado({
    filtros: configFiltros,
    porPagina: 10,
    conBusqueda: false,
  });

  const bitacoraQuery = useQuery({
    queryKey: [...CLAVE_BITACORA, filtrosActivos],
    queryFn: () => listarBitacora(filtrosActivos),
    placeholderData: keepPreviousData,
  });

  const registros = bitacoraQuery.data?.datos ?? [];
  const paginacion = bitacoraQuery.data?.paginacion;

  const columnas = [
    {
      id: 'accion',
      encabezado: 'Acción',
      render: (registro) => (
        <Insignia variante={VARIANTE_ACCION[registro.accion] ?? 'borrador'}>
          {etiquetaAccion(registro.accion)}
        </Insignia>
      ),
    },
    {
      id: 'registro',
      encabezado: 'Registro',
      render: (registro) => (
        <div>
          <span className="font-semibold text-ink">
            {registro.entidad} #{registro.entidadId}
          </span>
          <p className="mt-1 text-xs text-muted">
            Por: <span className="font-medium text-ink">{registro.usuario ? registro.usuario.nombreCompleto : 'Sistema'}</span>
            {registro.direccionIp && ` · IP ${registro.direccionIp}`}
          </p>
        </div>
      ),
    },
    {
      id: 'fecha',
      encabezado: 'Fecha',
      claseCelda: 'whitespace-nowrap tabular-nums text-xs text-muted',
      render: (registro) => formatearFechaHoraBitacora(registro.fecha),
    },
    {
      id: 'acciones',
      encabezado: <span className="sr-only">Acciones</span>,
      claseCelda: 'text-right sm:w-px sm:whitespace-nowrap',
      render: (registro) => (
        <Boton
          variante="secundario"
          tamano="sm"
          icono={Eye}
          onClick={() => setSeleccionado(registro)}
          aria-label={`Ver detalle del cambio #${registro.id}`}
        >
          Ver detalle
        </Boton>
      ),
    },
  ];

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
          <>
            <BotonExportarCsv
              recurso="bitacora"
              permiso="bitacora.exportar"
              filtros={filtrosActivos}
            />
            {hayFiltrosActivos && (
              <Boton variante="secundario" icono={RotateCcw} onClick={limpiarFiltros}>
                Limpiar filtros
              </Boton>
            )}
          </>
        }
      />

      <div className="mt-6">
        <TablaListado
          caption="Registros de bitácora"
          columnas={columnas}
          datos={registros}
          paginacion={paginacion}
          onCambiarPagina={setPagina}
          cargando={bitacoraQuery.isPending}
          tenue={bitacoraQuery.isPlaceholderData}
          error={
            bitacoraQuery.isError
              ? bitacoraQuery.error?.message || 'No se pudieron cargar los datos.'
              : null
          }
          onReintentar={bitacoraQuery.refetch}
          filtrosExtra={
            <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <CampoSelect
                etiqueta="Entidad"
                value={valores.entidad}
                onChange={(e) => actualizarFiltro('entidad', e.target.value)}
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
                value={valores.entidadId}
                onChange={(e) => actualizarFiltro('entidadId', e.target.value)}
                placeholder="Ej. 7"
              />

              <CampoSelect
                etiqueta="Acción"
                value={valores.accion}
                onChange={(e) => actualizarFiltro('accion', e.target.value)}
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
                value={valores.usuario}
                onChange={(e) => actualizarFiltro('usuario', e.target.value)}
                placeholder="Ej. 2"
              />

              <CampoTexto
                etiqueta="Desde"
                type="date"
                value={valores.desde}
                onChange={(e) => actualizarFiltro('desde', e.target.value)}
              />

              <CampoTexto
                etiqueta="Hasta"
                type="date"
                value={valores.hasta}
                onChange={(e) => actualizarFiltro('hasta', e.target.value)}
              />
            </div>
          }
          hayFiltrosActivos={hayFiltrosActivos}
          onLimpiarFiltros={limpiarFiltros}
          vacio={{
            icono: Inbox,
            titulo: 'No hay cambios registrados para los filtros seleccionados.',
            descripcion: 'Ajusta los criterios de búsqueda o limpia los filtros.',
          }}
          vacioConFiltros={{
            icono: Inbox,
            titulo: 'No hay cambios registrados para los filtros seleccionados.',
            descripcion: 'Ajusta los criterios de búsqueda o limpia los filtros.',
          }}
        />
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
