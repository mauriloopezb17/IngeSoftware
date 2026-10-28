
import { useRef, useState } from 'react';

import {
  ArrowRight,
  Play,
  Pause,
  Clock3,
  Droplet,
  CalendarDays,
  ScrollText,
} from 'lucide-react';

import Encabezado from './Encabezado.jsx';

import {
  anchoContenido,
  EtiquetaSeccion,
} from './ElementosComunes.jsx';

import '../../styles/Portada.css';

import videoPortada from '../../assets/parroquia/videos/portada-final.mp4';
import imagenExterior from '../../assets/parroquia/imagenes/exterior-parroquia.webp';

const accesosRapidos = [
  {
    nombre: 'Horarios de Misa',
    subtitulo: 'Toda la semana',
    icono: Clock3,
    enlace: '#horarios',
  },
  {
    nombre: 'Sacramentos',
    subtitulo: 'Requisitos y fechas',
    icono: Droplet,
    enlace: '#sacramentos',
  },
  {
    nombre: 'Calendario',
    subtitulo: 'Próximas actividades',
    icono: CalendarDays,
    enlace: '#agenda',
  },
  {
    nombre: 'Proclamas',
    subtitulo: 'Vigentes esta semana',
    icono: ScrollText,
    enlace: '#proclamas',
  },
];

function Portada() {
  const referenciaVideo = useRef(null);

  const [videoIniciado, setVideoIniciado] = useState(false);
  const [reproduciendo, setReproduciendo] = useState(false);

  const alternarReproduccion = async () => {
    const video = referenciaVideo.current;

    if (!video) return;

    if (!video.paused) {
      video.pause();
      return;
    }

    try {
      await video.play();
    } catch (error) {
      console.error('No se pudo reproducir el video:', error);
    }
  };

  return (
    <section id="inicio" className="portada relative bg-cream">
      <div className="portada-fondo relative min-h-[860px] overflow-hidden bg-deep">
        {/* Imagen inicial */}
        <img
          src={imagenExterior}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />

        {/* Video */}
        <video
          ref={referenciaVideo}
          muted
          loop
          playsInline
          preload="none"
          poster={imagenExterior}
          aria-hidden="true"
          onPlay={() => {
            setVideoIniciado(true);
            setReproduciendo(true);
          }}
          onPause={() => setReproduciendo(false)}
          onEnded={() => setReproduciendo(false)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
            videoIniciado ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <source src={videoPortada} type="video/mp4" />
        </video>

        {/* Capa oscura */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(23,20,20,.78)_0%,rgba(23,20,20,.45)_55%,rgba(23,20,20,.22)_100%),linear-gradient(180deg,rgba(23,20,20,.62)_0%,transparent_38%,rgba(23,20,20,.76)_100%)]" />

        <div className="relative z-10">
          <Encabezado />

          <div className={`${anchoContenido} portada-contenido pt-32 md:pt-[150px]`}>
            <EtiquetaSeccion light>
              Parroquia Pasionista · Obrajes, La Paz
            </EtiquetaSeccion>

            <h1 className="serif-title portada-titulo mt-5 text-[64px] leading-[.99] tracking-tight text-white md:text-[88px]">
              Señor de la
              <br />
              Exaltación
            </h1>

            <p className="portada-descripcion mt-7 max-w-[620px] text-[16px] leading-[1.8] text-white/90 md:text-lg">
              Una comunidad que camina junto a Cristo crucificado y
              resucitado. Te esperamos en casa, con las puertas
              siempre abiertas.
            </p>

            {/* Botones de navegación */}
            <div className="portada-botones mt-9 flex flex-wrap items-center gap-4">
              <a href="#horarios" className="static-cta">
                Ver horarios de misa
                <ArrowRight size={18} />
              </a>

              <a
                href="#nosotros"
                className="static-cta-outline portada-boton-secundario text-white"
              >
                Conócenos
              </a>
            </div>
          </div>

          {/* Control del video */}
          <div className={`${anchoContenido} portada-video-wrap`}>
            <button
              type="button"
              onClick={alternarReproduccion}
              aria-label={
                reproduciendo
                  ? 'Pausar video institucional'
                  : 'Reproducir video institucional'
              }
              aria-pressed={reproduciendo}
              className="portada-video-chip"
            >
              <span className="portada-video-icono">
                {reproduciendo ? (
                  <Pause size={18} fill="currentColor" />
                ) : (
                  <Play size={18} fill="currentColor" />
                )}
              </span>

              <span className="portada-video-texto">
                <span className="portada-video-titulo">
                  Video institucional
                </span>

                <span className="portada-video-subtitulo">
                  Recorrido aéreo · 0:30
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className={`${anchoContenido} portada-accesos`}>
        {accesosRapidos.map(
          ({ nombre, subtitulo, icono: Icono, enlace }) => (
            <a
              key={nombre}
              href={enlace}
              className="portada-acceso"
              aria-label={`Ir a ${nombre}`}
            >
              <span className="portada-acceso-icono">
                <Icono size={22} />
              </span>

              <span className="portada-acceso-texto">
                <span className="portada-acceso-titulo">
                  {nombre}
                </span>

                <span className="portada-acceso-subtitulo">
                  {subtitulo}
                </span>
              </span>
            </a>
          )
        )}
      </div>
    </section>
  );
}

export default Portada;
