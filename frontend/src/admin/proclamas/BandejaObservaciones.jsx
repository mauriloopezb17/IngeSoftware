import { useId, useState } from 'react';
import { useSearchParams } from 'react-router';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Inbox, Mail, MailOpen, MessageCircle, Phone, Trash2 } from 'lucide-react';

import ConfirmarAccion from '../componentes/ConfirmarAccion.jsx';
import Paginacion from '../componentes/Paginacion.jsx';
import { formatearFecha } from '../multimedia/formato.js';
import {
  Aviso,
  Boton,
  EncabezadoPantalla,
  EsqueletoTarjetas,
  EstadoVacio,
  Insignia,
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

function leerFiltros(parametros) {
  const estado = parametros.get('estado');
  const proclamaId = parametros.get('proclamaId') ?? '';
  const pagina = Number.parseInt(parametros.get('pagina'), 10);
  return {
    estado: estado === 'todas' ? 'todas' : 'no-leidas',
    proclamaId: /^\d+$/.test(proclamaId) ? proclamaId : '',
    pagina: pagina >= 1 ? pagina : 1,
  };
}

export default function BandejaObservaciones() {
  const [parametros, setParametros] = useSearchParams();
  const filtros = leerFiltros(parametros);
  const idFiltroProclama = useId();
  const clienteConsultas = useQueryClient();
  const toast = useToast();

  const [seleccionada, setSeleccionada] = useState(null);
  const [porEliminar, setPorEliminar] = useState(null);

  const { data: proclamasData } = useQuery({
    queryKey: ['admin', 'proclamas', 'filtro-observaciones'],
    queryFn: ({ signal }) => listarProclamas({ vista: 'todas', porPagina: 50 }, signal),
  });

  const { data, isPending, isError, error, isPlaceholderData, refetch } = useQuery({
    queryKey: [...CLAVE_OBSERVACIONES, 'lista', filtros],
    queryFn: ({ signal }) =>
      listarObservaciones(
        {
          estado: filtros.estado,
          proclamaId: filtros.proclamaId || undefined,
          pagina: filtros.pagina,
        },
        signal,
      ),
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

  function cambiar(cambios) {
    const siguiente = { ...filtros, pagina: 1, ...cambios };
    const nuevos = new URLSearchParams();
    if (siguiente.estado !== 'no-leidas') nuevos.set('estado', siguiente.estado);
    if (siguiente.proclamaId) nuevos.set('proclamaId', siguiente.proclamaId);
    if (siguiente.pagina > 1) nuevos.set('pagina', String(siguiente.pagina));
    setParametros(nuevos, { replace: true });
  }

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

      <div className="mt-5 flex flex-col gap-4 rounded-lg border border-sand bg-white p-4 sm:flex-row sm:items-end">
        <div role="group" aria-label="Estado de lectura" className="flex rounded-md border border-sand bg-panel p-0.5">
          {ESTADOS.map(({ clave, etiqueta }) => (
            <button
              key={clave}
              type="button"
              aria-pressed={filtros.estado === clave}
              onClick={() => cambiar({ estado: clave })}
              className={`flex-1 rounded px-3 py-2 text-sm font-medium transition-colors duration-150 ease-salida focus-visible:outline-2 focus-visible:outline-ink motion-reduce:transition-none ${
                filtros.estado === clave ? 'bg-gold font-semibold text-ink' : 'text-ink hover:bg-white'
              }`}
            >
              {etiqueta}
            </button>
          ))}
        </div>

        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor={idFiltroProclama} className="text-sm font-semibold text-ink">
            Filtrar por proclama
          </label>
          <select
            id={idFiltroProclama}
            value={filtros.proclamaId}
            onChange={(e) => cambiar({ proclamaId: e.target.value })}
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
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-6" aria-busy={isPending || isPlaceholderData}>
          {isPending && <EsqueletoTarjetas cantidad={3} columnas="grid-cols-1" etiqueta="Cargando observaciones…" />}
          {isError && !data && (
            <Aviso
              tipo="error"
              accion={
                <Boton variante="secundario" tamano="sm" onClick={() => refetch()}>
                  Reintentar
                </Boton>
              }
            >
              <p>No se pudieron cargar las observaciones: {error.message}</p>
            </Aviso>
          )}
          {data && (
            <>
              {lista.length ? (
                <ul aria-label="Observaciones recibidas" className={`flex flex-col gap-3 ${isPlaceholderData ? 'opacity-60' : ''}`}>
                  {lista.map((obs) => {
                    const activa = seleccionada?.id === obs.id;
                    const noLeida = !obs.leida;
                    return (
                      <li key={obs.id}>
                        <button
                          type="button"
                          onClick={() => abrirObservacion(obs)}
                          aria-current={activa ? 'true' : undefined}
                          className={`flex w-full flex-col gap-1.5 rounded-lg border p-4 text-left transition-colors duration-150 ease-salida focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink motion-reduce:transition-none ${
                            activa
                              ? 'border-ink bg-cream/60 ring-1 ring-ink'
                              : 'border-sand bg-white hover:border-ink/40'
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
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EstadoVacio
                  icono={Inbox}
                  titulo="No hay observaciones."
                  descripcion="No hay observaciones. Cuando alguien escriba sobre una proclama, aparecerá aquí."
                />
              )}

              <Paginacion
                paginacion={data.paginacion}
                nombre="Paginación de observaciones"
                onCambiar={(pagina) => cambiar({ pagina })}
              />
            </>
          )}
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

              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-[auto_1fr]">
                {seleccionada.correo && (
                  <>
                    <dt className="font-semibold text-ink">Correo</dt>
                    <dd className="text-muted">{seleccionada.correo}</dd>
                  </>
                )}
                {seleccionada.telefono && (
                  <>
                    <dt className="font-semibold text-ink">Teléfono</dt>
                    <dd className="text-muted">{seleccionada.telefono}</dd>
                  </>
                )}
              </dl>

              <div className="mt-5 rounded-md border border-sand bg-panel p-4">
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">
                  {seleccionada.mensaje}
                </p>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-sand pt-4">
                {hrefCorreo && (
                  <Boton como="a" href={hrefCorreo} variante="primario" tamano="sm" icono={Mail}>
                    Enviar correo
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
                {hrefTel && (
                  <Boton como="a" href={hrefTel} variante="secundario" tamano="sm" icono={Phone}>
                    Llamar
                  </Boton>
                )}
                <Boton
                  variante="secundario"
                  tamano="sm"
                  icono={Trash2}
                  onClick={() => setPorEliminar(seleccionada)}
                >
                  Eliminar
                </Boton>
              </div>
            </article>
          ) : (
            <div className="rounded-lg border border-dashed border-sand bg-white/60 p-8 text-center text-sm text-muted">
              Selecciona una observación de la lista para leerla y responder.
            </div>
          )}
        </div>
      </div>

      {porEliminar && (
        <ConfirmarAccion
          titulo={`¿Eliminar la observación de ${porEliminar.nombreCompleto}?`}
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
