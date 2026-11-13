import { useRef, useState } from 'react';
import { Play, Pause, ExternalLink, Clapperboard } from 'lucide-react';

import { anchoContenido, TituloSeccion } from './ElementosComunes.jsx';
import { CargandoSeccion, ErrorSeccion, SinResultados } from './EstadoSeccion.jsx';
import { usePagina, useSede, useVideos } from '../../hooks/index.js';

import '../../styles/VideoInstitucional.css';

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
      } catch (error) {
        console.error('No se pudo reproducir el video:', error);
      }
    } else {
      video.pause();
    }
  };

  return (
    <section id="video-institucional" className="video-institucional">
      <div className={`${anchoContenido} video-institucional-contenedor`}>
        <TituloSeccion
          overline="Conoce nuestro templo"
          title="Un recorrido por nuestra parroquia"
          center
          light
        />

        {cargandoVideos || (!videoYoutube && cargandoInicio) ? (
          <CargandoSeccion
            oscuro
            alturaMinima={420}
            etiqueta="Cargando video institucional"
          />
        ) : isError ? (
          <ErrorSeccion
            oscuro
            mensaje="No pudimos cargar el video institucional."
            onReintentar={refetch}
          />
        ) : videoYoutube ? (
          <div className="video-institucional-reproductor">
            <iframe
              className="video-institucional-video"
              src={videoYoutube.urlInsercion}
              title={videoYoutube.titulo || 'Video institucional'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : !hero?.url_video ? (
          <SinResultados oscuro mensaje="No hay un video institucional disponible." />
        ) : (
          <div className="video-institucional-reproductor">
            <video
              ref={videoRef}
              className="video-institucional-video"
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
              className={`video-institucional-reproducir ${
                reproduciendo ? 'video-institucional-reproduciendo' : ''
              }`}
              onClick={alternarReproduccion}
              aria-label={reproduciendo ? 'Pausar video' : 'Reproducir video'}
            >
              {reproduciendo ? (
                <Pause size={29} fill="currentColor" />
              ) : (
                <Play size={29} fill="currentColor" />
              )}
            </button>

            <div className="video-institucional-descripcion">
              <Clapperboard size={16} />
              <span>
                {hero.detalle_video
                  ? `Recorrido aéreo y del templo · ${hero.detalle_video.split('·').pop().trim()}`
                  : 'Recorrido aéreo y del templo · 0:30'}
              </span>
            </div>
          </div>
        )}

        {canalBase && (
          <div className="video-institucional-acciones">
            <a
              href={`${canalBase}/videos`}
              target="_blank"
              rel="noopener noreferrer"
              className="video-institucional-boton-principal"
            >
              Ver en YouTube
              <ExternalLink size={16} />
            </a>

            <a
              href={`${canalBase}?sub_confirmation=1`}
              target="_blank"
              rel="noopener noreferrer"
              className="video-institucional-boton-secundario"
            >
              Suscribirse al canal
            </a>
          </div>
        )}
      </div>
    </section>
  );
}

export default VideoInstitucional;
