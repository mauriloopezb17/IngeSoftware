import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarX2, Clock, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';

import ConfirmarAccion from '../componentes/ConfirmarAccion.jsx';
import { usePermisos } from '../permisos/usePermisos.js';
import { CLAVE_CATALOGOS, obtenerCatalogos } from '../publicaciones/api.js';
import {
  Aviso,
  Boton,
  BotonExportarCsv,
  CampoSelect,
  EncabezadoPantalla,
  Insignia,
  TablaListado,
  useFiltrosListado,
  useToast,
} from '../ui/index.js';
import {
  CLAVE_EVENTOS,
  eliminarEvento,
  ESTADOS_EVENTO,
  listarEventos,
  parametrosEventos,
  VISTAS,
} from './api.js';
import { formatearCuandoEvento } from './formato.js';

const VARIANTE_ESTADO = {
  PUBLICADO: 'publicado',
  BORRADOR: 'borrador',
  ARCHIVADO: 'archivado',
};

// Calendario parroquial: próximos, finalizados (RF-09: ya no se ven en el portal) o todos.
export default function ListadoEventos() {
  const { puede } = usePermisos();
  const editable = puede('eventos.gestionar');
  const soloDetalle = !editable && puede('eventos.detalle');
  const clienteConsultas = useQueryClient();
  const toast = useToast();
  const tituloRef = useRef(null);
  const [porEliminar, setPorEliminar] = useState(null);

  const configFiltros = useMemo(
    () => ({
      vista: { defecto: 'proximos', validar: (v) => v in VISTAS },
      estado: { defecto: '', validar: (v) => v in ESTADOS_EVENTO },
      categoria: { defecto: '', validar: (v) => /^\d+$/.test(v) },
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
  });

  const catalogos = useQuery({ queryKey: CLAVE_CATALOGOS, queryFn: obtenerCatalogos, staleTime: 5 * 60 * 1000 });
  const { data, isPending, isError, error, isPlaceholderData, refetch } = useQuery({
    queryKey: [...CLAVE_EVENTOS, 'lista', filtrosActivos],
    queryFn: ({ signal }) => listarEventos(filtrosActivos, signal),
    placeholderData: keepPreviousData,
  });

  const eliminar = useMutation({
    mutationFn: (evento) => eliminarEvento(evento.id),
    onSuccess: (_, evento) => {
      clienteConsultas.invalidateQueries({ queryKey: CLAVE_EVENTOS });
      toast.exito(`Se eliminó el evento «${evento.titulo}».`);
      setPorEliminar(null);
      setTimeout(() => tituloRef.current?.focus(), 0);
    },
  });

  const eventos = data?.datos ?? [];
  const categorias = catalogos.data?.categoriasEvento ?? [];

  const columnas = [
    {
      id: 'evento',
      encabezado: 'Evento',
      render: (evento) => (
        <div className={evento.finalizado ? 'opacity-75' : ''}>
          <div className="flex flex-wrap items-center gap-2">
            <Insignia variante="borrador">
              <span
                aria-hidden="true"
                className="mr-1.5 inline-block size-2 rounded-full"
                style={{ backgroundColor: evento.categoria?.colorHex ?? '#6b625d' }}
              />
              {evento.categoria?.nombre ?? 'Sin categoría'}
            </Insignia>
            <Insignia variante={VARIANTE_ESTADO[evento.estado.codigo] ?? 'borrador'}>
              {evento.estado.nombre}
            </Insignia>
            {evento.finalizado && (
              <Insignia variante="rechazado">
                <span title="Ya no se muestra en el portal (RF-09)">Finalizado</span>
              </Insignia>
            )}
          </div>
          <p className="mt-2 font-semibold text-ink">{evento.titulo}</p>
        </div>
      ),
    },
    {
      id: 'cuando',
      encabezado: 'Fecha y lugar',
      render: (evento) => (
        <div className="space-y-1 text-sm">
          <p className="flex items-start gap-1.5 text-ink">
            <Clock className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
            <span>{formatearCuandoEvento(evento)}</span>
          </p>
          {evento.lugar && (
            <p className="flex items-start gap-1.5 text-muted">
              <MapPin className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
              <span>{evento.lugar}</span>
            </p>
          )}
        </div>
      ),
    },
    ...(editable || soloDetalle
      ? [
          {
            id: 'acciones',
            encabezado: <span className="sr-only">Acciones</span>,
            claseCelda: 'text-right sm:w-px sm:whitespace-nowrap',
            render: (evento) => (
              <div className="flex flex-wrap justify-end gap-2">
                <Boton
                  como={Link}
                  to={`/admin/eventos/${evento.id}/editar`}
                  variante="secundario"
                  tamano="sm"
                  icono={Pencil}
                  aria-label={editable ? `Editar «${evento.titulo}»` : `Editar página de «${evento.titulo}»`}
                >
                  {editable ? 'Editar' : 'Editar página'}
                </Boton>
                {editable && (
                  <Boton
                    variante="secundario"
                    tamano="sm"
                    icono={Trash2}
                    onClick={() => setPorEliminar(evento)}
                    aria-label={`Eliminar «${evento.titulo}»`}
                  >
                    Eliminar
                  </Boton>
                )}
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <section className="mx-auto max-w-5xl">
      <EncabezadoPantalla
        titulo="Eventos"
        descripcion="Calendario parroquial. Los eventos se publican directamente, sin revisión."
        headingRef={tituloRef}
        acciones={
          <>
            <BotonExportarCsv
              recurso="eventos"
              permiso="eventos.exportar"
              filtros={parametrosEventos(filtrosActivos)}
            />
            {editable && (
              <Boton como={Link} to="/admin/eventos/nuevo" variante="primario" icono={Plus}>
                Nuevo evento
              </Boton>
            )}
          </>
        }
      />

      {!editable && (
        <Aviso tipo={soloDetalle ? 'info' : 'soloLectura'} className="mt-4">
          <p>
            {soloDetalle ? (
              <>
                <strong className="font-semibold text-ink">Edición de página del evento.</strong> Puedes completar el
                contenido, programa, dirección y enlaces de cada evento; los datos de fecha y estado los gestiona
                secretaría.
              </>
            ) : (
              <>
                <strong className="font-semibold text-ink">Solo lectura.</strong> Tu rol puede consultar el calendario,
                pero no modificarlo.
              </>
            )}
          </p>
        </Aviso>
      )}

      <div className="mt-6">
        <TablaListado
          caption="Eventos"
          columnas={columnas}
          datos={eventos}
          paginacion={data?.paginacion}
          onCambiarPagina={setPagina}
          cargando={isPending}
          tenue={isPlaceholderData}
          error={isError && !data ? `No se pudieron cargar los eventos: ${error.message}` : null}
          onReintentar={refetch}
          busqueda={busqueda}
          onCambiarBusqueda={setBusqueda}
          placeholderBusqueda="Título o lugar"
          categoria={{
            etiqueta: 'Categoría',
            valor: valores.categoria,
            opciones: categorias.map((c) => ({ valor: String(c.id), etiqueta: c.nombre })),
            onCambiar: (v) => actualizarFiltro('categoria', v),
          }}
          filtrosExtra={
            <>
              <div role="group" aria-label="Mostrar eventos" className="flex w-full rounded-md border border-sand bg-panel p-0.5 sm:w-auto">
                {Object.entries(VISTAS).map(([clave, { etiqueta }]) => (
                  <button
                    key={clave}
                    type="button"
                    aria-pressed={valores.vista === clave}
                    onClick={() => actualizarFiltro('vista', clave)}
                    className={`min-h-11 flex-1 rounded px-3 py-2 text-sm font-medium transition-colors duration-150 ease-salida focus-visible:outline-2 focus-visible:outline-ink motion-reduce:transition-none lg:min-h-9 lg:py-1.5 ${
                      valores.vista === clave ? 'bg-gold font-semibold text-ink' : 'text-ink hover:bg-white'
                    }`}
                  >
                    {etiqueta}
                  </button>
                ))}
              </div>
              <div className="w-full sm:w-auto sm:min-w-[160px]">
                <CampoSelect
                  etiqueta="Estado"
                  value={valores.estado}
                  onChange={(e) => actualizarFiltro('estado', e.target.value)}
                  opciones={[['', 'Todos'], ...Object.entries(ESTADOS_EVENTO)]}
                />
              </div>
            </>
          }
          hayFiltrosActivos={hayFiltrosActivos}
          onLimpiarFiltros={limpiarFiltros}
          vacio={{
            icono: CalendarX2,
            titulo: 'No hay eventos con estos filtros.',
            descripcion: 'Ajusta los filtros o crea un evento nuevo para el calendario.',
            accion:
              editable && (
                <Boton como={Link} to="/admin/eventos/nuevo" variante="primario" icono={Plus}>
                  Nuevo evento
                </Boton>
              ),
          }}
          vacioConFiltros={{
            icono: CalendarX2,
            titulo: 'No hay eventos con estos filtros.',
            descripcion: 'Ajusta los filtros o crea un evento nuevo para el calendario.',
          }}
        />
      </div>

      {porEliminar && (
        <ConfirmarAccion
          titulo={`¿Eliminar «${porEliminar.titulo}»?`}
          pendiente={eliminar.isPending}
          error={eliminar.error}
          onConfirmar={() => eliminar.mutate(porEliminar)}
          onCancelar={() => {
            eliminar.reset();
            setPorEliminar(null);
          }}
        >
          Se quitará del calendario y del portal. Si solo quieres ocultarlo, edítalo y cámbialo a «Archivado».
        </ConfirmarAccion>
      )}
    </section>
  );
}
