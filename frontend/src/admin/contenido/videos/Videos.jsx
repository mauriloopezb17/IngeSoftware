import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ExternalLink, Inbox, Pencil, Plus, Star, Trash2 } from 'lucide-react';

import ConfirmarAccion from '../../componentes/ConfirmarAccion.jsx';
import { usePermisos } from '../../permisos/usePermisos.js';
import {
  Aviso,
  Boton,
  CampoSelect,
  EncabezadoPantalla,
  EsqueletoTarjetas,
  EstadoVacio,
  Insignia,
  useToast,
} from '../../ui/index.js';
import {
  CLAVE_VIDEOS,
  eliminarVideo,
  formatearDuracion,
  listarVideos,
  reordenarVideos,
} from './api.js';
import FormularioVideo from './FormularioVideo.jsx';

export default function Videos() {
  const queryClient = useQueryClient();
  const { puede } = usePermisos();
  const toast = useToast();
  const puedeGestionar = puede('videos.gestionar');

  const tituloRef = useRef(null);

  const [filtroDestacado, setFiltroDestacado] = useState('');
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState(null);
  const [porEliminar, setPorEliminar] = useState(null);
  const [aviso, setAviso] = useState('');

  const videosQuery = useQuery({
    queryKey: [...CLAVE_VIDEOS, { destacado: filtroDestacado }],
    queryFn: () => listarVideos({ destacado: filtroDestacado || undefined }),
  });

  const reordenarMut = useMutation({
    mutationFn: (ids) => reordenarVideos(ids),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLAVE_VIDEOS }),
  });

  const eliminarMut = useMutation({
    mutationFn: (video) => eliminarVideo(video.id),
    onSuccess: (_, video) => {
      queryClient.invalidateQueries({ queryKey: CLAVE_VIDEOS });
      const msg = `Se eliminó el video «${video.titulo}».`;
      setAviso(msg);
      toast.exito(msg);
      setPorEliminar(null);
      setTimeout(() => tituloRef.current?.focus(), 0);
    },
  });

  const videos = videosQuery.data ?? [];

  function mover(indice, direccion) {
    const destino = indice + direccion;
    if (destino < 0 || destino >= videos.length) return;
    const ids = videos.map((v) => v.id);
    [ids[indice], ids[destino]] = [ids[destino], ids[indice]];
    reordenarMut.mutate(ids);
  }

  return (
    <section className="mx-auto max-w-5xl">
      <EncabezadoPantalla
        titulo="Videos"
        descripcion="Videos de YouTube mostrados en el portal parroquial."
        headingRef={tituloRef}
        acciones={
          puedeGestionar && (
            <Boton
              variante="primario"
              icono={Plus}
              onClick={() => {
                setAviso('');
                setCreando(true);
              }}
            >
              Nuevo video
            </Boton>
          )
        }
      />

      {!puedeGestionar && (
        <Aviso tipo="soloLectura" className="mt-4">
          <p>
            <strong className="font-semibold text-ink">Solo lectura:</strong> tu rol puede consultar los videos, pero no
            realizar cambios.
          </p>
        </Aviso>
      )}

      {aviso ? (
        <Aviso tipo="exito" className="mt-4">
          {aviso}
        </Aviso>
      ) : (
        <p role="status" className="sr-only" />
      )}

      <div className="mt-6 rounded-lg border border-sand bg-white p-4 sm:max-w-xs">
        <CampoSelect
          etiqueta="Destacado"
          value={filtroDestacado}
          onChange={(e) => setFiltroDestacado(e.target.value)}
        >
          <option value="">Todos</option>
          <option value="true">Destacados</option>
          <option value="false">No destacados</option>
        </CampoSelect>
      </div>

      <div className="mt-6" aria-busy={videosQuery.isPending}>
        {videosQuery.isPending && (
          <EsqueletoTarjetas cantidad={3} columnas="grid-cols-1" etiqueta="Cargando videos…" />
        )}

        {videosQuery.error && (
          <Aviso
            tipo="error"
            accion={
              <Boton variante="secundario" tamano="sm" onClick={() => videosQuery.refetch()}>
                Reintentar
              </Boton>
            }
          >
            <p>{videosQuery.error.message || 'No se pudieron cargar los datos.'}</p>
          </Aviso>
        )}

        {!videosQuery.isPending && !videosQuery.error && videos.length === 0 && (
          <EstadoVacio
            icono={Inbox}
            titulo="Todavía no hay videos de YouTube registrados."
            descripcion="Agrega videos de transmisiones, homilías o mensajes parroquiales."
            accion={
              puedeGestionar && (
                <Boton
                  variante="primario"
                  icono={Plus}
                  onClick={() => {
                    setAviso('');
                    setCreando(true);
                  }}
                >
                  Agregar el primer video
                </Boton>
              )
            }
          />
        )}

        {videos.length > 0 && (
          <ul className="flex flex-col gap-3" aria-label="Videos de YouTube">
            {videos.map((video, i) => {
              const duracion = formatearDuracion(video.duracionSegundos);
              return (
                <li
                  key={video.id}
                  className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-sand bg-white p-5"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    <img
                      src={video.urlMiniatura}
                      alt={video.titulo}
                      className="aspect-video w-36 shrink-0 rounded-md border border-sand bg-panel object-cover"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-body text-base font-semibold text-ink">{video.titulo}</h2>
                        {video.destacado && (
                          <Insignia variante="programado">
                            <Star className="mr-1 size-3" aria-hidden="true" />
                            Destacado
                          </Insignia>
                        )}
                      </div>
                      {video.descripcion && <p className="mt-1 text-sm text-ink">{video.descripcion}</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
                        <span>ID: {video.youtubeVideoId}</span>
                        {duracion && <span className="tabular-nums">Duración: {duracion}</span>}
                        {video.fechaPublicacion && <span>Fecha: {video.fechaPublicacion}</span>}
                        <a
                          href={video.urlVideo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-ink underline-offset-2 hover:underline"
                        >
                          Ver en YouTube
                          <ExternalLink className="size-3" aria-hidden="true" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {puedeGestionar && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {!filtroDestacado && (
                        <>
                          <Boton
                            variante="secundario"
                            tamano="sm"
                            onClick={() => mover(i, -1)}
                            disabled={i === 0 || reordenarMut.isPending}
                            aria-label={`Subir ${video.titulo}`}
                          >
                            <ArrowUp className="size-3.5" aria-hidden="true" />
                          </Boton>
                          <Boton
                            variante="secundario"
                            tamano="sm"
                            onClick={() => mover(i, 1)}
                            disabled={i === videos.length - 1 || reordenarMut.isPending}
                            aria-label={`Bajar ${video.titulo}`}
                          >
                            <ArrowDown className="size-3.5" aria-hidden="true" />
                          </Boton>
                        </>
                      )}
                      <Boton
                        variante="secundario"
                        tamano="sm"
                        icono={Pencil}
                        onClick={() => {
                          setAviso('');
                          setEditando(video);
                        }}
                        aria-label={`Editar ${video.titulo}`}
                      >
                        Editar
                      </Boton>
                      <Boton
                        variante="secundario"
                        tamano="sm"
                        icono={Trash2}
                        onClick={() => {
                          setAviso('');
                          setPorEliminar(video);
                        }}
                        aria-label={`Eliminar ${video.titulo}`}
                      >
                        Eliminar
                      </Boton>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {(creando || editando) && (
        <FormularioVideo
          video={editando}
          onCerrar={() => {
            setCreando(false);
            setEditando(null);
          }}
          onGuardado={(guardado) => {
            const msg = editando
              ? `Se actualizó el video «${guardado.titulo}».`
              : `Se agregó el video «${guardado.titulo}».`;
            setCreando(false);
            setEditando(null);
            setAviso(msg);
            toast.exito(msg);
          }}
        />
      )}

      {porEliminar && (
        <ConfirmarAccion
          titulo={`¿Eliminar «${porEliminar.titulo}»?`}
          pendiente={eliminarMut.isPending}
          error={eliminarMut.error}
          onConfirmar={() => eliminarMut.mutate(porEliminar)}
          onCancelar={() => {
            eliminarMut.reset();
            setPorEliminar(null);
          }}
        >
          El video dejará de mostrarse en el portal. Esta acción no se puede deshacer.
        </ConfirmarAccion>
      )}
    </section>
  );
}
