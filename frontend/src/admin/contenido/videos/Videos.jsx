import { useId, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ExternalLink, Pencil, Plus, Star, Trash2 } from 'lucide-react';

import { usePermisos } from '../../permisos/usePermisos.js';
import BannerSoloLectura from '../componentes/BannerSoloLectura.jsx';
import ConfirmarBorrado from '../componentes/ConfirmarBorrado.jsx';
import EstadoLista from '../componentes/EstadoLista.jsx';
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
  const puedeGestionar = puede('videos.gestionar');

  const idFiltro = useId();
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

  const videos = videosQuery.data ?? [];

  function mover(indice, direccion) {
    const destino = indice + direccion;
    if (destino < 0 || destino >= videos.length) return;
    const ids = videos.map((v) => v.id);
    [ids[indice], ids[destino]] = [ids[destino], ids[indice]];
    reordenarMut.mutate(ids);
  }

  async function confirmarEliminacion() {
    await eliminarVideo(porEliminar.id);
    await queryClient.invalidateQueries({ queryKey: CLAVE_VIDEOS });
    setAviso(`Se eliminó el video «${porEliminar.titulo}».`);
    setPorEliminar(null);
    setTimeout(() => tituloRef.current?.focus(), 0);
  }

  return (
    <section className="mx-auto max-w-5xl">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1
            ref={tituloRef}
            tabIndex={-1}
            className="font-display text-4xl font-semibold text-ink outline-none"
          >
            Videos
          </h1>
          <p className="mt-2 text-muted">
            Videos de YouTube mostrados en el portal parroquial.
          </p>
        </div>

        {puedeGestionar && (
          <button
            type="button"
            onClick={() => {
              setAviso('');
              setCreando(true);
            }}
            className="flex items-center gap-2 rounded-md bg-gold px-4 py-2.5 text-sm font-semibold text-ink hover:bg-goldDark hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-goldDark"
          >
            <Plus className="size-4" aria-hidden="true" />
            Nuevo video
          </button>
        )}
      </header>

      {!puedeGestionar && <BannerSoloLectura recurso="los videos" />}

      <p
        role="status"
        className={aviso ? 'mt-4 rounded-md bg-goldPale px-3 py-2 text-sm text-goldDark' : 'sr-only'}
      >
        {aviso}
      </p>

      <div className="mt-6 flex flex-wrap gap-4 rounded-lg border border-borderSoft bg-white p-4">
        <div className="flex flex-col gap-1">
          <label htmlFor={idFiltro} className="text-xs font-semibold text-muted">
            Destacado
          </label>
          <select
            id={idFiltro}
            value={filtroDestacado}
            onChange={(e) => setFiltroDestacado(e.target.value)}
            className="rounded-md border border-borderSoft bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-goldDark"
          >
            <option value="">Todos</option>
            <option value="true">Destacados</option>
            <option value="false">No destacados</option>
          </select>
        </div>
      </div>

      <div className="mt-6" aria-busy={videosQuery.isPending}>
        <EstadoLista
          cargando={videosQuery.isPending}
          error={videosQuery.error}
          vacio={!videosQuery.isPending && !videosQuery.error && videos.length === 0}
          textoCargando="Cargando videos…"
          textoVacio="Todavía no hay videos de YouTube registrados."
          onReintentar={() => videosQuery.refetch()}
        />

        {videos.length > 0 && (
          <ul className="flex flex-col gap-3" aria-label="Videos de YouTube">
            {videos.map((video, i) => {
              const duracion = formatearDuracion(video.duracionSegundos);
              return (
                <li
                  key={video.id}
                  className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-borderSoft bg-white p-4"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    <img
                      src={video.urlMiniatura}
                      alt={video.titulo}
                      className="h-20 w-36 shrink-0 rounded-md bg-stone object-cover"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-display text-2xl font-semibold text-ink">
                          {video.titulo}
                        </h2>
                        {video.destacado && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-goldPale px-2.5 py-0.5 text-xs font-semibold text-goldDark">
                            <Star className="size-3" aria-hidden="true" />
                            Destacado
                          </span>
                        )}
                      </div>
                      {video.descripcion && (
                        <p className="mt-1 text-sm text-charcoal">{video.descripcion}</p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
                        <span>ID: {video.youtubeVideoId}</span>
                        {duracion && <span>Duración: {duracion}</span>}
                        {video.fechaPublicacion && <span>Fecha: {video.fechaPublicacion}</span>}
                        <a
                          href={video.urlVideo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-goldDark hover:underline"
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
                          <button
                            type="button"
                            onClick={() => mover(i, -1)}
                            disabled={i === 0 || reordenarMut.isPending}
                            aria-label={`Subir ${video.titulo}`}
                            className="rounded-md border border-borderSoft bg-white p-1.5 text-muted hover:bg-stone hover:text-ink disabled:opacity-40"
                          >
                            <ArrowUp className="size-3.5" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => mover(i, 1)}
                            disabled={i === videos.length - 1 || reordenarMut.isPending}
                            aria-label={`Bajar ${video.titulo}`}
                            className="rounded-md border border-borderSoft bg-white p-1.5 text-muted hover:bg-stone hover:text-ink disabled:opacity-40"
                          >
                            <ArrowDown className="size-3.5" aria-hidden="true" />
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setAviso('');
                          setEditando(video);
                        }}
                        aria-label={`Editar ${video.titulo}`}
                        className="flex items-center gap-1 rounded-md border border-borderSoft bg-white px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark"
                      >
                        <Pencil className="size-3.5" aria-hidden="true" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAviso('');
                          setPorEliminar(video);
                        }}
                        aria-label={`Eliminar ${video.titulo}`}
                        className="flex items-center gap-1 rounded-md border border-redParish/30 bg-white px-2.5 py-1.5 text-xs font-medium text-redParish hover:bg-redParish/5 focus-visible:outline-2 focus-visible:outline-redParish"
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                        Eliminar
                      </button>
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
            setCreando(false);
            setEditando(null);
            setAviso(
              editando
                ? `Se actualizó el video «${guardado.titulo}».`
                : `Se agregó el video «${guardado.titulo}».`,
            );
          }}
        />
      )}

      {porEliminar && (
        <ConfirmarBorrado
          titulo={`¿Eliminar «${porEliminar.titulo}»?`}
          descripcion="El video dejará de mostrarse en el portal. Esta acción no se puede deshacer."
          onConfirmar={confirmarEliminacion}
          onCancelar={() => setPorEliminar(null)}
        />
      )}
    </section>
  );
}

