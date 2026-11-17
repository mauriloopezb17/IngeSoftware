import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';

import {
  EncabezadoSeccion,
  EnlaceFlecha,
  Reveal,
  Seccion,
} from '../portal/index.js';
import { CargandoSeccion, ErrorSeccion, SinResultados } from './EstadoSeccion.jsx';
import { construirAtributosImagen } from './imagenSrcSet.js';
import { usePublicaciones } from '../../hooks/index.js';
import { formatearFechaLarga } from '../../utils/formatoPortal.js';

function EnlaceNoticia({ noticia, children, className, ariaLabel }) {
  if (noticia.urlExterna) {
    return (
      <a
        href={noticia.urlExterna}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        aria-label={ariaLabel}
      >
        {children}
      </a>
    );
  }

  return (
    <Link to={`/noticias/${noticia.slug}`} className={className} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}

function VidaParroquial() {
  const { data, isPending, isError, refetch } = usePublicaciones({
    tipo: 'NOTICIA,NOTA_DE_PRENSA',
    porPagina: 3,
  });

  const noticias = data?.datos ?? [];
  const [destacada, ...secundarias] = noticias;

  return (
    <Seccion id="noticias" fondo="crema">
      <EncabezadoSeccion
        eyebrow="Noticias y notas de prensa"
        titulo="Vida parroquial"
        accion={<EnlaceFlecha to="/noticias">Ver todas las noticias</EnlaceFlecha>}
      />

      {isPending ? (
        <CargandoSeccion alturaMinima={360} etiqueta="Cargando noticias de vida parroquial" />
      ) : isError ? (
        <ErrorSeccion
          mensaje="No pudimos cargar las noticias de vida parroquial."
          onReintentar={refetch}
        />
      ) : noticias.length === 0 ? (
        <SinResultados mensaje="No hay noticias publicadas por el momento." />
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Noticia destacada */}
          {destacada && (
            <Reveal
              variante="tarjeta"
              as="article"
              className={`group flex flex-col overflow-hidden rounded-md border border-sand bg-white transition-[border-color,transform] duration-200 ease-out hover:-translate-y-1 hover:border-gold ${
                secundarias.length > 0 ? 'lg:col-span-7' : 'lg:col-span-12'
              }`}
            >
              {destacada.imagenPortada && (
                <div className="overflow-hidden bg-cream">
                  <img
                    src={destacada.imagenPortada.url}
                    {...construirAtributosImagen(
                      destacada.imagenPortada,
                      '(min-width: 1024px) 50vw, 100vw',
                    )}
                    alt={destacada.imagenPortada.textoAlternativo || destacada.titulo}
                    width={destacada.imagenPortada.ancho ?? undefined}
                    height={destacada.imagenPortada.alto ?? undefined}
                    className={`aspect-[16/10] w-full transition-transform duration-500 ease-out group-hover:scale-[1.04] ${
                      destacada.imagenPortada.alto > destacada.imagenPortada.ancho
                        ? 'object-contain'
                        : 'object-cover'
                    }`}
                    loading="lazy"
                  />
                </div>
              )}

              <div className="flex flex-1 flex-col justify-between p-6 md:p-8">
                <div>
                  <div className="flex flex-wrap items-center gap-2 font-body text-meta text-muted">
                    <span className="font-semibold text-ink">
                      {destacada.categoria?.nombre || destacada.tipo?.nombre}
                    </span>
                    <span aria-hidden="true">·</span>
                    <time dateTime={destacada.fechaPublicacion}>
                      {formatearFechaLarga(destacada.fechaPublicacion)}
                    </time>
                  </div>

                  <h3 className="mt-3 font-display text-h2 font-semibold text-ink">
                    {destacada.titulo}
                  </h3>

                  {destacada.resumen && (
                    <p className="mt-3 max-w-prose font-body text-body text-muted">
                      {destacada.resumen}
                    </p>
                  )}
                </div>

                <div className="mt-6">
                  <EnlaceNoticia
                    noticia={destacada}
                    ariaLabel={`Leer publicación: ${destacada.titulo}`}
                    className="inline-flex min-h-11 items-center gap-2 font-body text-button font-semibold text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  >
                    <span>Leer nota</span>
                    <ArrowRight
                      size={15}
                      aria-hidden="true"
                      className="transition-transform duration-200 ease-salida group-hover:translate-x-1"
                    />
                  </EnlaceNoticia>
                </div>
              </div>
            </Reveal>
          )}

          {/* Noticias secundarias en lista vertical */}
          {secundarias.length > 0 && (
            <div className="flex flex-col gap-6 lg:col-span-5">
              {secundarias.map((noticia, indice) => {
                const imagen = noticia.imagenPortada;
                return (
                  <Reveal
                    key={noticia.id}
                    variante="tarjeta"
                    retraso={(indice + 1) * 90}
                    as="article"
                    className="group flex flex-1 flex-col justify-between rounded-md border border-sand bg-white p-6 transition-[border-color,transform] duration-200 ease-out hover:-translate-y-1 hover:border-gold"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row">
                      {imagen && (
                        <div className="w-full shrink-0 overflow-hidden rounded-sm bg-cream sm:w-32">
                          <img
                            src={imagen.url}
                            {...construirAtributosImagen(
                              imagen,
                              '(min-width: 1024px) 15vw, 100vw',
                            )}
                            alt={imagen.textoAlternativo || noticia.titulo}
                            width={imagen.ancho ?? undefined}
                            height={imagen.alto ?? undefined}
                            className="aspect-[4/3] h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                            loading="lazy"
                          />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 font-body text-meta text-muted">
                          <span className="font-semibold text-ink">
                            {noticia.categoria?.nombre || noticia.tipo?.nombre}
                          </span>
                          <span aria-hidden="true">·</span>
                          <time dateTime={noticia.fechaPublicacion}>
                            {formatearFechaLarga(noticia.fechaPublicacion)}
                          </time>
                        </div>

                        <h3 className="mt-2 font-display text-h3 font-semibold text-ink">
                          {noticia.titulo}
                        </h3>

                        {noticia.resumen && (
                          <p className="mt-2 line-clamp-2 font-body text-meta text-muted">
                            {noticia.resumen}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4">
                      <EnlaceNoticia
                        noticia={noticia}
                        ariaLabel={`Leer publicación: ${noticia.titulo}`}
                        className="inline-flex min-h-11 items-center gap-2 font-body text-button font-semibold text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                      >
                        <span>Leer nota</span>
                        <ArrowRight
                          size={15}
                          aria-hidden="true"
                          className="transition-transform duration-200 ease-salida group-hover:translate-x-1"
                        />
                      </EnlaceNoticia>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Seccion>
  );
}

export default VidaParroquial;
