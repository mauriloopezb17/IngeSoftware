import { useId, useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Inbox, Mail, MailOpen, MessageCircle, Phone, Trash2 } from 'lucide-react';

import ConfirmarAccion from '../componentes/ConfirmarAccion.jsx';
import { formatearFecha } from '../multimedia/formato.js';
import {
  Aviso,
  Boton,
  EncabezadoPantalla,
  Insignia,
  TablaListado,
  useFiltrosListado,
  useToast,
} from '../ui/index.js';
import {
  CLAVE_OBSERVACIONES,
  eliminarObservacion,
  listarObservaciones,
  listarProclamas,
  marcarObservacionLeida,
} from './api.js';
import { armarHrefCorreo, armarHrefWhatsApp, formatearFechaRelativa } from './observacionesEnlaces.js';
import PestanasProclamas from './PestanasProclamas.jsx';

const ESTADOS = [
  { clave: 'no-leidas', etiqueta: 'No leídas' },
  { clave: 'todas', etiqueta: 'Todas' },
];

export default function BandejaObservaciones() {
  const idFiltroProclama = useId();
  const clienteConsultas = useQueryClient();
  const toast = useToast();

  const [seleccionada, setSeleccionada] = useState(null);
  const [porEliminar, setPorEliminar] = useState(null);

  const configFiltros = useMemo(
    () => ({
      estado: { defecto: 'no-leidas', validar: (v) => v === 'no-leidas' || v === 'todas' },
      proclamaId: { defecto: '', validar: (v) => /^\d+$/.test(v) },
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

  const { data: proclamasData } = useQuery({
    queryKey: ['admin', 'proclamas', 'filtro-observaciones'],
    queryFn: ({ signal }) => listarProclamas({ vista: 'todas', porPagina: 50 }, signal),
  });

  const { data, isPending, isError, error, isPlaceholderData, refetch } = useQuery({
    queryKey: [...CLAVE_OBSERVACIONES, 'lista', filtrosActivos],
    queryFn: ({ signal }) => listarObservaciones(filtrosActivos, signal),
    placeholderData: keepPreviousData,
  });

  const marcar = useMutation({
    mutationFn: ({ id, leida }) => marcarObservacionLeida(id, leida),
    onSuccess: (actualizada) => {
      clienteConsultas.invalidateQueries({ queryKey: CLAVE_OBSERVACIONES });
      setSeleccionada((actual) => (actual?.id === actualizada.id ? actualizada : actual));
    },
  });

  const eliminar = useMutation({
    mutationFn: (obs) => eliminarObservacion(obs.id),
    onSuccess: (_, obs) => {
      clienteConsultas.invalidateQueries({ queryKey: CLAVE_OBSERVACIONES });
      if (seleccionada?.id === obs.id) setSeleccionada(null);
      setPorEliminar(null);
      toast.exito('Observación eliminada.');
    },
  });

  function abrirObservacion(obs) {
    setSeleccionada(obs);
    if (!obs.leida) {
      marcar.mutate({ id: obs.id, leida: true });
    }
  }

  const lista = data?.datos ?? [];
  const proclamas = proclamasData?.datos ?? [];

  const hrefCorreo = armarHrefCorreo(seleccionada);
  const hrefWhatsApp = armarHrefWhatsApp(seleccionada);
  const hrefTel = seleccionada?.telefono ? `tel:${seleccionada.telefono.replace(/[^\d+]/g, '')}` : null;

  const columnas = [
    {
      id: 'observacion',
      encabezado: 'Observaciones recibidas',
      render: (obs) => {
        const activa = seleccionada?.id === obs.id;
        const noLeida = !obs.leida;
        return (
          <button
            type="button"
            onClick={() => abrirObservacion(obs)}
            aria-current={activa ? 'true' : undefined}
            className={`flex w-full flex-col gap-1.5 rounded-md p-1 text-left transition-colors duration-150 ease-salida focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink motion-reduce:transition-none ${
              activa ? 'bg-cream/60' : ''
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 text-sm text-ink">
                {noLeida && (
                  <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-gold" />
                )}
                <span className={noLeida ? 'font-bold' : 'font-semibold'}>{obs.nombreCompleto}</span>
                {noLeida && <Insignia variante="programado">Sin leer</Insignia>}
              </span>
              <span className="text-xs text-muted">
                {formatearFechaRelativa(obs.fechaEnvio)} · {formatearFecha(obs.fechaEnvio)}
              </span>
            </div>
            <p className="text-xs font-medium text-muted">
              {obs.proclama.contrayente1} y {obs.proclama.contrayente2}
            </p>
            <p className={`line-clamp-2 text-sm text-ink ${noLeida ? 'font-medium' : ''}`}>
              {obs.mensaje}
            </p>
          </button>
        );
      },
    },
  ];

  return (
    <section className="mx-auto max-w-5xl">
      <EncabezadoPantalla
        titulo="Proclamas"
        descripcion="Observaciones confidenciales recibidas para el párroco."
      />

      <PestanasProclamas />

      <Aviso tipo="soloLectura" className="mt-4">
        <p>Estas observaciones son confidenciales. Solo el párroco puede verlas.</p>
      </Aviso>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <TablaListado
            caption="Observaciones recibidas"
            columnas={columnas}
            datos={lista}
            paginacion={data?.paginacion}
            onCambiarPagina={setPagina}
            cargando={isPending}
            tenue={isPlaceholderData}
            error={isError && !data ? `No se pudieron cargar las observaciones: ${error.message}` : null}
            onReintentar={refetch}
            busqueda={busqueda}
            onCambiarBusqueda={setBusqueda}
            placeholderBusqueda="Nombre o mensaje"
            claseTabla="min-w-full"
            filtrosExtra={
              <>
                <div role="group" aria-label="Estado de lectura" className="flex w-full rounded-md border border-sand bg-panel p-0.5 sm:w-auto">
                  {ESTADOS.map(({ clave, etiqueta }) => (
                    <button
                      key={clave}
                      type="button"
                      aria-pressed={valores.estado === clave}
                      onClick={() => actualizarFiltro('estado', clave)}
                      className={`min-h-11 flex-1 rounded px-3 py-2 text-sm font-medium transition-colors duration-150 ease-salida focus-visible:outline-2 focus-visible:outline-ink motion-reduce:transition-none lg:min-h-9 lg:py-1.5 ${
                        valores.estado === clave ? 'bg-gold font-semibold text-ink' : 'text-ink hover:bg-white'
                      }`}
                    >
                      {etiqueta}
                    </button>
                  ))}
                </div>

                <div className="w-full sm:w-auto sm:min-w-[200px] sm:flex-1">
                  <label htmlFor={idFiltroProclama} className="mb-1.5 block text-sm font-semibold text-ink">
                    Filtrar por proclama
                  </label>
                  <select
                    id={idFiltroProclama}
                    value={valores.proclamaId}
                    onChange={(e) => actualizarFiltro('proclamaId', e.target.value)}
                    className="min-h-11 w-full rounded-md border border-sand bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink"
                  >
                    <option value="">Todas las proclamas</option>
                    {proclamas.map((p) => (
                      <option key={p.id} value={String(p.id)}>
                        {p.contrayente1} y {p.contrayente2}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            }
            hayFiltrosActivos={hayFiltrosActivos}
            onLimpiarFiltros={limpiarFiltros}
            vacio={{
              icono: Inbox,
              titulo: 'No hay observaciones.',
              descripcion: 'No hay observaciones. Cuando alguien escriba sobre una proclama, aparecerá aquí.',
            }}
          />
        </div>

        <div className="lg:col-span-6">
          {seleccionada ? (
            <article
              aria-label={`Observación de ${seleccionada.nombreCompleto}`}
              className="rounded-lg border border-sand bg-white p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-sand pb-4">
                <div>
                  <h2 className="text-base font-semibold text-ink">{seleccionada.nombreCompleto}</h2>
                  <p className="mt-0.5 text-sm text-muted">
                    Sobre: {seleccionada.proclama.contrayente1} y {seleccionada.proclama.contrayente2}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {formatearFechaRelativa(seleccionada.fechaEnvio)} · {formatearFecha(seleccionada.fechaEnvio)}
                  </p>
                </div>
                {seleccionada.leida && (
                  <Boton
                    variante="secundario"
                    tamano="sm"
                    icono={MailOpen}
                    cargando={marcar.isPending}
                    onClick={() => marcar.mutate({ id: seleccionada.id, leida: false })}
                  >
                    Marcar como no leída
                  </Boton>
                )}
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <p className="font-semibold text-ink">Datos de contacto</p>
                <div className="flex flex-wrap gap-3 text-muted">
                  {seleccionada.telefono && (
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="size-4" aria-hidden="true" />
                      {seleccionada.telefono}
                    </span>
                  )}
                  {seleccionada.correo && (
                    <span className="inline-flex items-center gap-1.5">
                      <Mail className="size-4" aria-hidden="true" />
                      {seleccionada.correo}
                    </span>
                  )}
                </div>

                {(hrefTel || hrefWhatsApp || hrefCorreo) && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {hrefTel && (
                      <Boton como="a" href={hrefTel} variante="secundario" tamano="sm" icono={Phone}>
                        Llamar
                      </Boton>
                    )}
                    {hrefWhatsApp && (
                      <Boton
                        como="a"
                        href={hrefWhatsApp}
                        target="_blank"
                        rel="noopener noreferrer"
                        variante="secundario"
                        tamano="sm"
                        icono={MessageCircle}
                      >
                        Escribir por WhatsApp
                      </Boton>
                    )}
                    {hrefCorreo && (
                      <Boton
                        como="a"
                        href={hrefCorreo}
                        target="_blank"
                        rel="noopener noreferrer"
                        variante="secundario"
                        tamano="sm"
                        icono={Mail}
                      >
                        Enviar correo
                      </Boton>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-5 border-t border-sand pt-4">
                <p className="text-sm font-semibold text-ink">Mensaje</p>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink">
                  {seleccionada.mensaje}
                </p>
              </div>

              <div className="mt-6 border-t border-sand pt-4">
                <Boton
                  variante="peligro"
                  tamano="sm"
                  icono={Trash2}
                  onClick={() => setPorEliminar(seleccionada)}
                >
                  Eliminar
                </Boton>
              </div>
            </article>
          ) : (
            <div className="flex h-full min-h-48 items-center justify-center rounded-lg border border-dashed border-sand bg-white p-6 text-center">
              <p className="text-sm text-muted">
                Elige una observación de la lista para leerla completa y ver los datos de contacto.
              </p>
            </div>
          )}
        </div>
      </div>

      {porEliminar && (
        <ConfirmarAccion
          titulo="¿Eliminar esta observación?"
          pendiente={eliminar.isPending}
          error={eliminar.error}
          onConfirmar={() => eliminar.mutate(porEliminar)}
          onCancelar={() => {
            eliminar.reset();
            setPorEliminar(null);
          }}
        >
          Se eliminará la observación de forma permanente.
        </ConfirmarAccion>
      )}
    </section>
  );
}
