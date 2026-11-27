import { useMemo, useRef, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ExternalLink, Inbox, Pencil, Plus, Star, Trash2 } from 'lucide-react';

import ConfirmarAccion from '../../componentes/ConfirmarAccion.jsx';
import { usePermisos } from '../../permisos/usePermisos.js';
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
} from '../../ui/index.js';
import {
  CLAVE_VIDEOS,
  eliminarVideo,
  formatearDuracion,
  listarVideosPaginados,
  reordenarVideos,
} from './api.js';
import FormularioVideo from './FormularioVideo.jsx';

export default function Videos() {
  const queryClient = useQueryClient();
  const { puede } = usePermisos();
  const toast = useToast();
  const puedeGestionar = puede('videos.gestionar');

  const tituloRef = useRef(null);

  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState(null);
  const [porEliminar, setPorEliminar] = useState(null);

  const configFiltros = useMemo(
    () => ({
      destacado: { defecto: '', validar: (v) => v === 'true' || v === 'false' },
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

  const videosQuery = useQuery({
    queryKey: [...CLAVE_VIDEOS, 'lista', filtrosActivos],
    queryFn: ({ signal }) => listarVideosPaginados(filtrosActivos, signal),
    placeholderData: keepPreviousData,
  });

  const reordenarMut = useMutation({
    mutationFn: (ids) => reordenarVideos(ids),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLAVE_VIDEOS }),
  });

  const eliminarMut = useMutation({
    mutationFn: (video) => eliminarVideo(video.id),
    onSuccess: (_, video) => {
      queryClient.invalidateQueries({ queryKey: CLAVE_VIDEOS });
      toast.exito(`Se eliminó el video «${video.titulo}».`);
      setPorEliminar(null);
      setTimeout(() => tituloRef.current?.focus(), 0);
    },
  });

  const videos = videosQuery.data?.datos ?? [];
  const totalPaginas = videosQuery.data?.paginacion?.totalPaginas ?? 1;
  const puedeReordenar = !hayFiltrosActivos && totalPaginas <= 1;

  function mover(indice, direccion) {
    if (!puedeReordenar) return;
    const destino = indice + direccion;
    if (destino < 0 || destino >= videos.length) return;
    const ids = videos.map((v) => v.id);
    [ids[indice], ids[destino]] = [ids[destino], ids[indice]];
    reordenarMut.mutate(ids);
  }

  const columnas = [
    {
      id: 'video',
      encabezado: 'Video',
      render: (video) => {
        const duracion = formatearDuracion(video.duracionSegundos);
        return (
          <div>
            <p className="font-semibold text-ink">{video.titulo}</p>
            {video.descripcion && (
              <p className="mt-0.5 line-clamp-2 text-xs text-muted">{video.descripcion}</p>
            )}
            <p className="mt-1 text-xs tabular-nums text-muted">
              {duracion ? `Duración: ${duracion}` : 'Sin duración'}
            </p>
          </div>
        );
      },
    },
    {
      id: 'estado',
      encabezado: 'Destacado',
      render: (video) =>
        video.destacado ? (
          <Insignia variante="programado">
            <Star className="mr-1 inline size-3" aria-hidden="true" />
            Destacado
          </Insignia>
        ) : (
          <span className="text-xs text-muted">Normal</span>
        ),
    },
    {
      id: 'acciones',
      encabezado: <span className="sr-only">Acciones</span>,
      claseCelda: 'text-right sm:w-px sm:whitespace-nowrap',
      render: (video) => {
        const indice = videos.findIndex((v) => v.id === video.id);
        return (
          <div className="flex flex-wrap justify-end gap-1.5">
            <Boton
              como="a"
              href={video.urlYoutube}
              target="_blank"
              rel="noopener noreferrer"
              variante="secundario"
              tamano="sm"
              icono={ExternalLink}
              aria-label={`Ver «${video.titulo}» en YouTube`}
            >
              Ver
            </Boton>
            {puedeGestionar && (
              <>
                {puedeReordenar && (
                  <>
                    <Boton
                      variante="secundario"
                      tamano="sm"
                      icono={ArrowUp}
                      disabled={indice <= 0 || reordenarMut.isPending}
                      onClick={() => mover(indice, -1)}
                      aria-label={`Subir «${video.titulo}»`}
                    />
                    <Boton
                      variante="secundario"
                      tamano="sm"
                      icono={ArrowDown}
                      disabled={indice === videos.length - 1 || reordenarMut.isPending}
                      onClick={() => mover(indice, 1)}
                      aria-label={`Bajar «${video.titulo}»`}
                    />
                  </>
                )}
                <Boton
                  variante="secundario"
                  tamano="sm"
                  icono={Pencil}
                  onClick={() => setEditando(video)}
                  aria-label={`Editar «${video.titulo}»`}
                >
                  Editar
                </Boton>
                <Boton
                  variante="secundario"
                  tamano="sm"
                  icono={Trash2}
                  onClick={() => setPorEliminar(video)}
                  aria-label={`Eliminar «${video.titulo}»`}
                >
                  Eliminar
                </Boton>
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <section className="mx-auto max-w-5xl">
      <EncabezadoPantalla
        titulo="Videos"
        descripcion="Videos de YouTube mostrados en el portal parroquial."
        headingRef={tituloRef}
        acciones={
          <>
            <BotonExportarCsv
              recurso="videos"
              permiso="videos.exportar"
              filtros={filtrosActivos}
            />
            {puedeGestionar && (
              <Boton
                variante="primario"
                icono={Plus}
                onClick={() => setCreando(true)}
              >
                Nuevo video
              </Boton>
            )}
          </>
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

      {puedeGestionar && !puedeReordenar && (
        <Aviso tipo="info" className="mt-4">
          <p>Para reordenar los videos, quita los filtros y asegúrate de ver todos en una sola página.</p>
        </Aviso>
      )}

      <div className="mt-6">
        <TablaListado
          caption="Videos"
          nombrePaginacion="Paginación de videos"
          columnas={columnas}
          datos={videos}
          paginacion={videosQuery.data?.paginacion}
          onCambiarPagina={setPagina}
          cargando={videosQuery.isPending}
          tenue={videosQuery.isPlaceholderData}
          error={
            videosQuery.isError
              ? videosQuery.error?.message || 'No se pudieron cargar los datos.'
              : null
          }
          onReintentar={videosQuery.refetch}
          busqueda={busqueda}
          onCambiarBusqueda={setBusqueda}
          placeholderBusqueda="Título o descripción"
          filtrosExtra={
            <div className="min-w-[160px]">
              <CampoSelect
                etiqueta="Destacado"
                value={valores.destacado}
                onChange={(e) => actualizarFiltro('destacado', e.target.value)}
              >
                <option value="">Todos</option>
                <option value="true">Destacados</option>
                <option value="false">No destacados</option>
              </CampoSelect>
            </div>
          }
          hayFiltrosActivos={hayFiltrosActivos}
          onLimpiarFiltros={limpiarFiltros}
          vacio={{
            icono: Inbox,
            titulo: 'No hay videos registrados.',
            descripcion: 'Agrega un enlace de YouTube para mostrarlo en el portal.',
            accion:
              puedeGestionar && (
                <Boton variante="primario" icono={Plus} onClick={() => setCreando(true)}>
                  Nuevo video
                </Boton>
              ),
          }}
          vacioConFiltros={{
            icono: Inbox,
            titulo: 'No hay videos registrados con estos filtros.',
            descripcion: 'Prueba quitando el filtro o agrega un video nuevo.',
          }}
        />
      </div>

      {(creando || editando) && (
        <FormularioVideo
          video={editando}
          onGuardado={(guardado) => {
            const msg = editando
              ? `Se actualizó el video «${guardado.titulo}».`
              : `Se agregó el video «${guardado.titulo}».`;
            setCreando(false);
            setEditando(null);
            queryClient.invalidateQueries({ queryKey: CLAVE_VIDEOS });
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
          titulo={`¿Eliminar «${porEliminar.titulo}»?`}
          pendiente={eliminarMut.isPending}
          error={eliminarMut.error}
          onConfirmar={() => eliminarMut.mutate(porEliminar)}
          onCancelar={() => {
            eliminarMut.reset();
            setPorEliminar(null);
          }}
        >
          El video dejará de mostrarse en el portal público.
        </ConfirmarAccion>
      )}
    </section>
  );
}
