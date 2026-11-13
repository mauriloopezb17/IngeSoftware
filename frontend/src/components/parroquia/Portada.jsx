import { useRef, useState } from 'react';

import { ArrowRight, Play, Pause } from 'lucide-react';

import Encabezado from './Encabezado.jsx';
import EnlacePortal from './EnlacePortal.jsx';
import { anchoContenido, EtiquetaSeccion } from './ElementosComunes.jsx';
import { CargandoSeccion, ErrorSeccion, SinResultados } from './EstadoSeccion.jsx';
import { IconoDinamico } from './IconoDinamico.jsx';
import { usePagina } from '../../hooks/index.js';

import '../../styles/Portada.css';

function Portada() {
  const referenciaVideo = useRef(null);
  const { data: pagina, isPending, isError, refetch } = usePagina('inicio');

  const [videoIniciado, setVideoIniciado] = useState(false);
  const [reproduciendo, setReproduciendo] = useState(false);

  const bloques = pagina?.bloques ?? [];
  const hero = bloques.find((bloque) => bloque.tipo === 'hero_video')?.contenido;
  const tarjetas = bloques.find((bloque) => bloque.tipo === 'tarjetas')?.contenido?.items ?? [];

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
        {hero?.url_poster && (
          <img
            src={hero.url_poster}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}

        {/* Video */}
        {hero?.url_video && (
          <video
            ref={referenciaVideo}
            muted
            loop
            playsInline
            preload="none"
            poster={hero.url_poster || undefined}
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
            <source src={hero.url_video} type="video/mp4" />
          </video>
        )}

        {/* Capa oscura */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(23,20,20,.78)_0%,rgba(23,20,20,.45)_55%,rgba(23,20,20,.22)_100%),linear-gradient(180deg,rgba(23,20,20,.62)_0%,transparent_38%,rgba(23,20,20,.76)_100%)]" />

        <div className="relative z-10">
          <Encabezado />

          <div className={`${anchoContenido} portada-contenido pt-32 md:pt-[150px]`}>
            {isPending ? (
              <CargandoSeccion oscuro alturaMinima={340} etiqueta="Cargando portada" />
            ) : isError ? (
              <ErrorSeccion
                oscuro
                mensaje="No pudimos cargar la portada."
                onReintentar={refetch}
              />
            ) : !hero ? (
              <SinResultados
                oscuro
                mensaje="No hay contenido publicado para la portada."
              />
            ) : (
              <>
                {hero.etiqueta && <EtiquetaSeccion light>{hero.etiqueta}</EtiquetaSeccion>}

                <h1 className="serif-title portada-titulo mt-5 max-w-[680px] text-[64px] leading-[.99] tracking-tight text-white md:text-[88px]">
                  {hero.titulo}
                </h1>

                {hero.subtitulo && (
                  <p className="portada-descripcion mt-7 max-w-[620px] text-[16px] leading-[1.8] text-white/90 md:text-lg">
                    {hero.subtitulo}
                  </p>
                )}

                {hero.botones?.length > 0 && (
                  <div className="portada-botones mt-9 flex flex-wrap items-center gap-4">
                    {hero.botones.map((boton, indice) => (
                      <EnlacePortal
                        key={boton.texto}
                        to={boton.enlace}
                        className={
                          indice === 0
                            ? 'static-cta'
                            : 'static-cta-outline portada-boton-secundario text-white'
                        }
                      >
                        {boton.texto}
                        {indice === 0 && <ArrowRight size={18} />}
                      </EnlacePortal>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {hero?.url_video && (
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
                    {hero.texto_video || 'Video institucional'}
                  </span>

                  {hero.detalle_video && (
                    <span className="portada-video-subtitulo">{hero.detalle_video}</span>
                  )}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Accesos rápidos */}
      {tarjetas.length > 0 && (
        <div className={`${anchoContenido} portada-accesos`}>
          {tarjetas.map(({ titulo, subtitulo, icono, enlace }) => (
            <EnlacePortal
              key={titulo}
              to={enlace || '#'}
              className="portada-acceso"
              aria-label={`Ir a ${titulo}`}
            >
              <span className="portada-acceso-icono">
                <IconoDinamico nombre={icono} size={22} />
              </span>

              <span className="portada-acceso-texto">
                <span className="portada-acceso-titulo">{titulo}</span>

                {subtitulo && (
                  <span className="portada-acceso-subtitulo">{subtitulo}</span>
                )}
              </span>
            </EnlacePortal>
          ))}
        </div>
      )}
    </section>
  );
}

export default Portada;
