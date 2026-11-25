import { useState } from 'react';
import { ArrowLeft, Check, ExternalLink, Share2 } from 'lucide-react';
import { Link, useParams } from 'react-router';

import { Boton, Contenedor, Eyebrow, RevealImagen, Seccion } from '../components/portal/index.js';
import ContenidoBlockNote from '../components/parroquia/ContenidoBlockNote.jsx';
import { CargandoSeccion, ErrorSeccion } from '../components/parroquia/EstadoSeccion.jsx';
import { construirAtributosImagen } from '../components/parroquia/imagenSrcSet.js';
import { usePublicacion } from '../hooks/index.js';
import { formatearFechaLarga } from '../utils/formatoPortal.js';

function NoticiaDetalle() {
  const { slug } = useParams();
  const { data: publicacion, isPending, isError, error, refetch } = usePublicacion(slug);
  const [copiado, setCopiado] = useState(false);

  const esNoEncontrado = error?.estado === 404 || error?.codigo === 'NO_ENCONTRADO';
  const imagen = publicacion?.imagenPortada;
  const esAfiche = Boolean(imagen?.alto && imagen?.ancho && imagen.alto > imagen.ancho);

  const tituloSeo = publicacion?.titulo
    ? `${publicacion.titulo} | Parroquia Señor de la Exaltación`
    : esNoEncontrado
      ? 'Noticia no encontrada | Parroquia Señor de la Exaltación'
      : 'Noticias | Parroquia Señor de la Exaltación';
  const descripcionSeo =
    publicacion?.resumen ||
    publicacion?.titulo ||
    'Publicaciones y vida parroquial de la Parroquia Señor de la Exaltación.';

  const compartir = async () => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: publicacion?.titulo, url });
        return;
      } catch {
        // Si el usuario cancela, continuamos sin error.
      }
    }
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    }
  };

  return (
    <>
      <title>{tituloSeo}</title>
      <meta name="description" content={descripcionSeo} />
      {publicacion && (
        <>
          <meta property="og:title" content={publicacion.titulo} />
          <meta property="og:description" content={descripcionSeo} />
          {imagen?.url && <meta property="og:image" content={imagen.url} />}
        </>
      )}

      {isPending ? (
        <Seccion fondo="blanco">
          <div className="mx-auto max-w-prose">
            <CargandoSeccion alturaMinima={360} etiqueta="Cargando noticia" />
          </div>
        </Seccion>
      ) : isError && esNoEncontrado ? (
        <Seccion fondo="blanco">
          <div className="max-w-2xl">
            <Eyebrow className="mb-4">Publicación no disponible</Eyebrow>
            <h1 className="font-display text-h1 font-semibold text-ink">
              No encontramos esta noticia
            </h1>
            <p className="mt-4 max-w-prose font-body text-lead text-muted">
              Es posible que haya sido retirada o que el enlace no corresponda a una publicación
              vigente.
            </p>
            <div className="mt-8 flex flex-wrap gap-6">
              <Link
                to="/noticias"
                className="inline-flex min-h-11 items-center gap-2 font-body text-button font-semibold text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                <ArrowLeft size={16} aria-hidden="true" />
                <span>Ver todas las noticias</span>
              </Link>
              <Link
                to="/"
                className="inline-flex min-h-11 items-center font-body text-button font-semibold text-muted underline-offset-4 hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                Volver al inicio
              </Link>
            </div>
          </div>
        </Seccion>
      ) : isError ? (
        <Seccion fondo="blanco">
          <div className="mx-auto max-w-prose">
            <ErrorSeccion mensaje="No pudimos cargar esta noticia." onReintentar={refetch} />
          </div>
        </Seccion>
      ) : (
        <article>
          <header className="border-b border-sand bg-cream py-12 md:py-20">
            <Contenedor>
              <div className="mx-auto max-w-prose">
                <nav
                  aria-label="Ruta de navegación"
                  className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 font-body text-meta text-muted"
                >
                  <Link
                    to="/"
                    className="inline-flex min-h-11 items-center text-ink/80 underline-offset-4 hover:text-ink hover:underline"
                  >
                    Inicio
                  </Link>
                  <span aria-hidden="true">/</span>
                  <Link
                    to="/noticias"
                    className="inline-flex min-h-11 items-center text-ink/80 underline-offset-4 hover:text-ink hover:underline"
                  >
                    Noticias
                  </Link>
                </nav>

                <div className="mb-4 flex flex-wrap items-center gap-2 font-body text-meta text-muted">
                  <span className="rounded-sm bg-gold-soft px-2.5 py-0.5 font-semibold text-ink">
                    {publicacion.categoria?.nombre || publicacion.tipo?.nombre}
                  </span>
                  <span aria-hidden="true">·</span>
                  <time dateTime={publicacion.fechaPublicacion}>
                    {formatearFechaLarga(publicacion.fechaPublicacion)}
                  </time>
                </div>

                <h1 className="font-display text-h1 font-semibold text-balance text-ink">
                  {publicacion.titulo}
                </h1>

                {publicacion.resumen && (
                  <p className="mt-4 font-body text-lead text-pretty text-muted">
                    {publicacion.resumen}
                  </p>
                )}

                {publicacion.urlExterna && (
                  <div className="mt-6">
                    <a
                      href={publicacion.urlExterna}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center gap-2.5 rounded-sm border border-ink/25 bg-white px-5 py-2.5 font-body text-button font-semibold text-ink touch-manipulation transition-[background-color,border-color,color,transform] duration-150 ease-salida hover:border-ink hover:bg-ink/5 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                    >
                      <span>Ver publicación original</span>{' '}
                      <span className="sr-only">(se abre en otra pestaña)</span>
                      <ExternalLink size={16} aria-hidden="true" />
                    </a>
                  </div>
                )}
              </div>
            </Contenedor>
          </header>

          <Seccion fondo="blanco">
            <div className="mx-auto max-w-prose">
              {imagen && (
                <figure className="mb-10 overflow-hidden rounded-md border border-sand bg-cream">
                  <RevealImagen lado="izquierda">
                    <img
                      src={imagen.url}
                      {...construirAtributosImagen(imagen, '(min-width: 768px) 720px, 100vw')}
                      alt={imagen.textoAlternativo || publicacion.titulo}
                      width={imagen.ancho ?? undefined}
                      height={imagen.alto ?? undefined}
                      className={`w-full ${
                        esAfiche ? 'mx-auto max-h-[560px] object-contain' : 'aspect-[16/10] object-cover'
                      }`}
                    />
                  </RevealImagen>
                </figure>
              )}

              <ContenidoBlockNote contenido={publicacion.contenido} />

              <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-sand pt-8">
                <Boton variante="secundario" onClick={compartir}>
                  {copiado ? (
                    <>
                      <Check size={16} aria-hidden="true" />
                      <span>Enlace copiado</span>
                    </>
                  ) : (
                    <>
                      <Share2 size={16} aria-hidden="true" />
                      <span>Compartir</span>
                    </>
                  )}
                </Boton>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-sand pt-6">
                <Link
                  to="/noticias"
                  className="inline-flex min-h-11 items-center gap-2 font-body text-button font-semibold text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  <ArrowLeft size={16} aria-hidden="true" />
                  <span>Ver todas las noticias</span>
                </Link>

                <Link
                  to="/"
                  className="inline-flex min-h-11 items-center font-body text-button font-semibold text-muted underline-offset-4 hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  Volver al inicio
                </Link>
              </div>
            </div>
          </Seccion>
        </article>
      )}
    </>
  );
}

export default NoticiaDetalle;
