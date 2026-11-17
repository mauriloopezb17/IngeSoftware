import { useRef, useState } from 'react';
import { Clapperboard, ExternalLink, Pause, Play } from 'lucide-react';

import { BotonEnlace, EncabezadoSeccion, Seccion } from '../portal/index.js';
import { CargandoSeccion, ErrorSeccion, SinResultados } from './EstadoSeccion.jsx';
import { usePagina, useSede, useVideos } from '../../hooks/index.js';

const POSTER_RESPALDO = '/media/seed/altar.webp';

function obtenerBaseYoutube(redesSociales) {
  const youtube = redesSociales?.find((red) => red.icono === 'youtube');
  if (!youtube?.url) return null;
  return youtube.url.replace(/\/videos\/?$/, '');
}

function VideoInstitucional() {
  const videoRef = useRef(null);
  const [reproduciendo, setReproduciendo] = useState(false);

  const { data: videos = [], isPending: cargandoVideos, isError, refetch } = useVideos();
  const { data: paginaInicio, isPending: cargandoInicio } = usePagina('inicio');
  const { data: sede } = useSede();

  const hero = paginaInicio?.bloques?.find((bloque) => bloque.tipo === 'hero_video')?.contenido;
  const videoYoutube = videos[0] ?? null;
  const canalBase = obtenerBaseYoutube(sede?.redesSociales);

  const alternarReproduccion = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      try {
        await video.play();
      } catch {
        setReproduciendo(false);
      }
    } else {
      video.pause();
    }
  };

  return (
    <Seccion id="video-institucional" fondo="tinta">
      <EncabezadoSeccion
        oscuro
        centrado
        eyebrow="Conoce nuestro templo"
        titulo="Un recorrido por nuestra parroquia"
      />

      {cargandoVideos || (!videoYoutube && cargandoInicio) ? (
        <CargandoSeccion oscuro alturaMinima={360} etiqueta="Cargando video institucional" />
      ) : isError ? (
        <ErrorSeccion
          oscuro
          mensaje="No pudimos cargar el video institucional."
          onReintentar={refetch}
        />
      ) : videoYoutube ? (
        <div className="mx-auto max-w-4xl overflow-hidden rounded-md border border-white/15 bg-ink-soft">
          <iframe
            className="aspect-video w-full border-0"
            src={videoYoutube.urlInsercion}
            title={videoYoutube.titulo || 'Video institucional'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : !hero?.url_video ? (
        <SinResultados oscuro mensaje="No hay un video institucional disponible." />
      ) : (
        <div className="mx-auto max-w-4xl overflow-hidden rounded-md border border-white/15 bg-ink-soft">
          <div className="relative">
            <video
              ref={videoRef}
              className="video-institucional-video aspect-video w-full object-cover"
              src={hero.url_video}
              poster={POSTER_RESPALDO}
              preload="metadata"
              playsInline
              onPlay={() => setReproduciendo(true)}
              onPause={() => setReproduciendo(false)}
              onEnded={() => setReproduciendo(false)}
            />

            <button
              type="button"
              onClick={alternarReproduccion}
              aria-label={reproduciendo ? 'Pausar video' : 'Reproducir video'}
              className="absolute inset-0 m-auto inline-flex size-16 cursor-pointer items-center justify-center rounded-full border border-white/40 bg-ink/80 text-white transition-colors duration-150 hover:border-gold hover:text-gold focus-visible:outline-2 focus-visible:outline-gold"
            >
              {reproduciendo ? (
                <Pause size={28} aria-hidden="true" />
              ) : (
                <Play size={28} aria-hidden="true" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 border-t border-white/10 px-5 py-3 font-body text-meta text-muted-on-dark">
            <Clapperboard size={16} aria-hidden="true" className="text-gold" />
            <span>
              {hero.detalle_video
                ? `Recorrido aéreo y del templo · ${hero.detalle_video.split('·').pop().trim()}`
                : 'Recorrido aéreo y del templo · 0:30'}
            </span>
          </div>
        </div>
      )}

      {canalBase && (
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <BotonEnlace to={`${canalBase}/videos`} variante="primarioOscuro">
            <span>Ver en YouTube</span>
            <ExternalLink size={16} aria-hidden="true" />
          </BotonEnlace>

          <BotonEnlace to={`${canalBase}?sub_confirmation=1`} variante="secundarioOscuro">
            Suscribirse al canal
          </BotonEnlace>
        </div>
      )}
    </Seccion>
  );
}

export default VideoInstitucional;
