
import { useRef, useState } from 'react';
import {
  Play,
  Pause,
  ExternalLink,
  Clapperboard,
} from 'lucide-react';

import {
  anchoContenido,
  TituloSeccion,
} from './ElementosComunes.jsx';

import imagenAltar from '../../assets/parroquia/imagenes/altar.webp';
import videoParroquia from '../../assets/parroquia/videos/portada-final.mp4';

import '../../styles/VideoInstitucional.css';

const canalYoutube = 'https://www.youtube.com/@ArquidiocesisdeLaPaz';

function VideoInstitucional() {
  const videoRef = useRef(null);
  const [reproduciendo, setReproduciendo] = useState(false);

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

        <div className="video-institucional-reproductor">
          <video
            ref={videoRef}
            className="video-institucional-video"
            src={videoParroquia}
            poster={imagenAltar}
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
            <span>Recorrido aéreo y del templo · 0:30</span>
          </div>
        </div>

        <div className="video-institucional-acciones">
          <a
            href={`${canalYoutube}/videos`}
            target="_blank"
            rel="noopener noreferrer"
            className="video-institucional-boton-principal"
          >
            Ver en YouTube
            <ExternalLink size={16} />
          </a>

          <a
            href={`${canalYoutube}?sub_confirmation=1`}
            target="_blank"
            rel="noopener noreferrer"
            className="video-institucional-boton-secundario"
          >
            Suscribirse al canal
          </a>
        </div>
      </div>
    </section>
  );
}

export default VideoInstitucional;
