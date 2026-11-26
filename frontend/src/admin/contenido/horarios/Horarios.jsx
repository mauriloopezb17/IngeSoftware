import { useMemo, useRef, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock3, Inbox, Pencil, Plus, Trash2 } from 'lucide-react';

import ConfirmarAccion from '../../componentes/ConfirmarAccion.jsx';
import { usePermisos } from '../../permisos/usePermisos.js';
import {
  Aviso,
  Boton,
  CampoSelect,
  EncabezadoPantalla,
  Insignia,
  TablaListado,
  useFiltrosListado,
  useToast,
} from '../../ui/index.js';
import {
  CLAVE_CATALOGOS,
  CLAVE_HORARIOS,
  eliminarHorario,
  listarHorariosPaginados,
  nombreDia,
  obtenerCatalogos,
} from './api.js';
import FormularioHorario from './FormularioHorario.jsx';

export default function Horarios() {
  const queryClient = useQueryClient();
  const { puede } = usePermisos();
  const toast = useToast();
  const puedeGestionar = puede('horarios.gestionar');

  const tituloRef = useRef(null);

  const [editando, setEditando] = useState(null);
  const [creando, setCreando] = useState(false);
  const [porEliminar, setPorEliminar] = useState(null);

  const configFiltros = useMemo(
    () => ({
      tipo: { defecto: '', validar: (v) => /^\d+$/.test(v) },
      activo: { defecto: '', validar: (v) => v === 'true' || v === 'false' },
    }),
    [],
  );

  const {
    valores,
    busqueda,
    setBusqueda,
    setPagina,
    actualizarFiltro,
    limpiarFiltros,
    hayFiltrosActivos,
    filtrosActivos,
  } = useFiltrosListado({
    filtros: configFiltros,
    porPagina: 15,
  });

  const catalogosQuery = useQuery({
    queryKey: CLAVE_CATALOGOS,
    queryFn: () => obtenerCatalogos(),
  });

  const horariosQuery = useQuery({
    queryKey: [...CLAVE_HORARIOS, 'lista', filtrosActivos],
    queryFn: ({ signal }) => listarHorariosPaginados(filtrosActivos, signal),
    placeholderData: keepPreviousData,
  });

  const eliminarMut = useMutation({
    mutationFn: (horario) => eliminarHorario(horario.id),
    onSuccess: (_, horario) => {
      queryClient.invalidateQueries({ queryKey: CLAVE_HORARIOS });
      toast.exito(`Se eliminó el horario de ${horario.tipo.nombre} (${nombreDia(horario.diaSemana)}, ${horario.horaInicio}).`);
      setPorEliminar(null);
      setTimeout(() => tituloRef.current?.focus(), 0);
    },
  });

  const tiposHorario = catalogosQuery.data?.tiposHorario ?? [];
  const horarios = horariosQuery.data?.datos ?? [];

  const columnas = [
    {
      id: 'tipo',
      encabezado: 'Tipo',
      render: (h) => <span className="font-semibold text-ink">{h.tipo.nombre}</span>,
    },
    {
      id: 'dia',
      encabezado: 'Día',
      render: (h) => nombreDia(h.diaSemana),
    },
    {
      id: 'horario',
      encabezado: 'Horario',
      render: (h) => (
        <div>
          <span className="inline-flex items-center gap-1.5 font-medium tabular-nums text-ink">
            <Clock3 className="size-3.5 text-muted" aria-hidden="true" />
            {h.horaFin ? `${h.horaInicio} – ${h.horaFin}` : h.horaInicio}
          </span>
          {h.descripcion && <p className="mt-0.5 text-xs text-muted">{h.descripcion}</p>}
        </div>
      ),
    },
    {
      id: 'estado',
      encabezado: 'Estado',
      render: (h) => (
        <Insignia variante={h.activo ? 'publicado' : 'archivado'}>
          {h.activo ? 'Activo' : 'Inactivo'}
        </Insignia>
      ),
    },
    ...(puedeGestionar
      ? [
          {
            id: 'acciones',
            encabezado: <span className="sr-only">Acciones</span>,
            claseCelda: 'text-right sm:w-px sm:whitespace-nowrap',
            render: (h) => (
              <div className="flex flex-wrap justify-end gap-2">
                <Boton
                  variante="secundario"
                  tamano="sm"
                  icono={Pencil}
                  onClick={() => setEditando(h)}
                  aria-label={`Editar horario ${h.tipo.nombre} ${nombreDia(h.diaSemana)} ${h.horaInicio}`}
                >
                  Editar
                </Boton>
                <Boton
                  variante="secundario"
                  tamano="sm"
                  icono={Trash2}
                  onClick={() => setPorEliminar(h)}
                  aria-label={`Eliminar horario ${h.tipo.nombre} ${nombreDia(h.diaSemana)} ${h.horaInicio}`}
                >
                  Eliminar
                </Boton>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <section className="mx-auto max-w-5xl">
      <EncabezadoPantalla
        titulo="Horarios"
        descripcion="Horarios de misas, confesiones, adoración y atención en secretaría."
        headingRef={tituloRef}
        acciones={
          puedeGestionar && (
            <Boton
              variante="primario"
              icono={Plus}
              disabled={!tiposHorario.length}
              onClick={() => setCreando(true)}
            >
              Nuevo horario
            </Boton>
          )
        }
      />

      {!puedeGestionar && (
        <Aviso tipo="soloLectura" className="mt-4">
          <p>
            <strong className="font-semibold text-ink">Solo lectura:</strong> tu rol puede consultar los horarios, pero
            no realizar cambios.
          </p>
        </Aviso>
      )}

      <div className="mt-6">
        <TablaListado
          caption="Horarios"
          nombrePaginacion="Paginación de horarios"
          columnas={columnas}
          datos={horarios}
          paginacion={horariosQuery.data?.paginacion}
          onCambiarPagina={setPagina}
          cargando={horariosQuery.isPending}
          tenue={horariosQuery.isPlaceholderData}
          error={
            horariosQuery.isError
              ? horariosQuery.error?.message || 'No se pudieron cargar los datos.'
              : null
          }
          onReintentar={horariosQuery.refetch}
          busqueda={busqueda}
          onCambiarBusqueda={setBusqueda}
          placeholderBusqueda="Nota del horario"
          categoria={
            tiposHorario.length > 0
              ? {
                  etiqueta: 'Tipo de horario',
                  valor: valores.tipo,
                  todasEtiqueta: 'Todos los tipos',
                  opciones: tiposHorario.map((t) => ({ valor: String(t.id), etiqueta: t.nombre })),
                  onCambiar: (v) => actualizarFiltro('tipo', v),
                }
              : undefined
          }
          filtrosExtra={
            <div className="w-full sm:w-auto sm:min-w-[150px]">
              <CampoSelect
                etiqueta="Estado"
                value={valores.activo}
                onChange={(e) => actualizarFiltro('activo', e.target.value)}
              >
                <option value="">Todos</option>
                <option value="true">Activos</option>
                <option value="false">Inactivos</option>
              </CampoSelect>
            </div>
          }
          hayFiltrosActivos={hayFiltrosActivos}
          onLimpiarFiltros={limpiarFiltros}
          vacio={{
            icono: Inbox,
            titulo: 'No hay horarios registrados con estos filtros.',
            descripcion: 'Prueba quitando algún filtro o agrega un horario nuevo.',
            accion:
              puedeGestionar && (
                <Boton variante="primario" icono={Plus} onClick={() => setCreando(true)}>
                  Nuevo horario
                </Boton>
              ),
          }}
          vacioConFiltros={{
            icono: Inbox,
            titulo: 'No hay horarios registrados con estos filtros.',
            descripcion: 'Prueba quitando algún filtro o agrega un horario nuevo.',
          }}
        />
      </div>

      {(creando || editando) && (
        <FormularioHorario
          horario={editando}
          tiposHorario={tiposHorario}
          onGuardado={(guardado) => {
            const msg = editando
              ? `Se actualizó el horario de ${guardado.tipo.nombre} (${nombreDia(guardado.diaSemana)}).`
              : `Se agregó el horario de ${guardado.tipo.nombre} (${nombreDia(guardado.diaSemana)}).`;
            setCreando(false);
            setEditando(null);
            queryClient.invalidateQueries({ queryKey: CLAVE_HORARIOS });
            toast.exito(msg);
          }}
          onCerrar={() => {
            setCreando(false);
            setEditando(null);
          }}
        />
      )}

      {porEliminar && (
        <ConfirmarAccion
          titulo="¿Eliminar horario?"
          pendiente={eliminarMut.isPending}
          error={eliminarMut.error}
          onConfirmar={() => eliminarMut.mutate(porEliminar)}
          onCancelar={() => {
            eliminarMut.reset();
            setPorEliminar(null);
          }}
        >
          Se quitará el horario de {porEliminar.tipo.nombre} ({nombreDia(porEliminar.diaSemana)},{' '}
          {porEliminar.horaInicio}) del portal público.
        </ConfirmarAccion>
      )}
    </section>
  );
}
