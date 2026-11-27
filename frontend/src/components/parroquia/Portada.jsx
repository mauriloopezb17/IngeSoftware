import { ArrowRight } from 'lucide-react';

import '../../styles/portal.css';

import { BotonEnlace, Contenedor, Eyebrow, Reveal, RevealTitulo } from '../portal/index.js';
import EnlacePortal from './EnlacePortal.jsx';
import { CargandoSeccion, ErrorSeccion, SinResultados } from './EstadoSeccion.jsx';
import { IconoDinamico } from './IconoDinamico.jsx';
import { usePagina } from '../../hooks/index.js';

function debeMostrarSoloPoster() {
  if (typeof window === 'undefined') return false;
  const reduceMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = Boolean(navigator.connection?.saveData);
  return reduceMotion || saveData;
}

function Portada() {
  const { data: pagina, isPending, isError, refetch } = usePagina('inicio');

  const soloPoster = debeMostrarSoloPoster();

  const bloques = pagina?.bloques ?? [];
  const hero = bloques.find((bloque) => bloque.tipo === 'hero_video')?.contenido;
  const tarjetas = bloques.find((bloque) => bloque.tipo === 'tarjetas')?.contenido?.items ?? [];

  return (
    <section id="inicio" className="bg-white">
      <div className="relative flex min-h-[600px] items-center overflow-hidden bg-ink pt-36 pb-20 text-white md:min-h-[720px] md:pt-44 md:pb-28">
        {hero?.url_poster && (
          <img
            src={hero.url_poster}
            alt=""
            aria-hidden="true"
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}

        {hero?.url_video && !soloPoster && (
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={hero.url_poster || undefined}
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          >
            <source src={hero.url_video} type="video/mp4" />
          </video>
        )}

        {/* Único overlay oscuro para legibilidad WCAG sobre el video */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(90deg,rgba(35,31,30,0.9)_0%,rgba(35,31,30,0.65)_55%,rgba(35,31,30,0.38)_100%)]"
        />

        <Contenedor className="relative z-10">
          <div className="max-w-3xl">
            {isPending ? (
              <CargandoSeccion oscuro alturaMinima={300} etiqueta="Cargando portada" />
            ) : isError ? (
              <ErrorSeccion
                oscuro
                mensaje="No pudimos cargar la portada."
                onReintentar={refetch}
              />
            ) : !hero ? (
              <SinResultados oscuro mensaje="No hay contenido publicado para la portada." />
            ) : (
              <>
                {hero.etiqueta && (
                  <Eyebrow oscuro alCargar className="mb-4">
                    {hero.etiqueta}
                  </Eyebrow>
                )}

                <RevealTitulo
                  as="h1"
                  alCargar
                  duracion={1000}
                  retraso={140}
                  className="font-display text-display font-semibold text-balance text-white"
                >
                  {hero.titulo}
                </RevealTitulo>

                {hero.subtitulo && (
                  <p className="hero-entrada hero-entrada-retraso-1 mt-6 max-w-prose font-body text-lead text-pretty text-white/90">
                    {hero.subtitulo}
                  </p>
                )}

                {hero.botones?.length > 0 && (
                  <div className="hero-entrada hero-entrada-retraso-2 mt-8 flex flex-wrap items-center gap-4">
                    {hero.botones.map((boton, indice) => (
                      <BotonEnlace
                        key={boton.texto}
                        to={boton.enlace}
                        variante={indice === 0 ? 'primarioOscuro' : 'secundarioOscuro'}
                      >
                        <span>{boton.texto}</span>
                        {indice === 0 && <ArrowRight size={17} aria-hidden="true" />}
                      </BotonEnlace>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </Contenedor>
      </div>

      {/* Accesos rápidos sobre el borde inferior del hero */}
      {tarjetas.length > 0 && (
        <Contenedor className="relative z-20 -mt-10 pb-8 md:-mt-12 md:pb-12">
          <div data-portada-tarjetas="" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {tarjetas.map(({ titulo, subtitulo, icono, enlace }, indice) => (
              <Reveal key={titulo} variante="tarjeta" retraso={indice * 120}>
                <EnlacePortal
                  to={enlace || '/'}
                  aria-label={`Ir a ${titulo}`}
                  className="tarjeta-portal group flex h-full items-start gap-4 rounded-md border border-sand bg-white p-5 shadow-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-sm bg-gold-soft text-ink">
                    <IconoDinamico nombre={icono} size={20} strokeWidth={1.8} />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-h3 font-semibold text-ink">
                      {titulo}
                    </span>
                    {subtitulo && (
                      <span className="mt-1 block font-body text-meta text-muted">{subtitulo}</span>
                    )}
                  </span>

                  <ArrowRight
                    size={16}
                    aria-hidden="true"
                    className="mt-1 shrink-0 text-muted transition-transform duration-200 ease-salida group-hover:translate-x-1 group-hover:text-ink"
                  />
                </EnlacePortal>
              </Reveal>
            ))}
          </div>
        </Contenedor>
      )}
    </section>
  );
}

export default Portada;
