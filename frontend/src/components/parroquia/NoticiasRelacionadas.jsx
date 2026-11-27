import { useRef, useState } from 'react';
import { ArrowRight, ExternalLink } from 'lucide-react';
import { Link } from 'react-router';

import { Reveal, Seccion } from '../portal/index.js';
import { useNoticiasGrupo, useNoticiasServicio } from '../../hooks/index.js';
import { destinoLeerNota, formatearFechaLarga } from '../../utils/formatoPortal.js';
import { construirAtributosImagen } from './imagenSrcSet.js';
import PaginacionPortal from './PaginacionPortal.jsx';

const POR_PAGINA = 6;

/**
 * Muestra las noticias relacionadas a un sacramento/servicio o a un grupo pastoral.
 * Si no hay noticias publicadas relacionadas, no renderiza la sección.
 */
function NoticiasRelacionadas({ tipo, slug, fondo = 'blanco' }) {
  const clave = `${tipo}:${slug ?? ''}`;
  const [estadoPagina, setEstadoPagina] = useState({ clave, pagina: 1 });
  const paginaActual = estadoPagina.clave === clave ? estadoPagina.pagina : 1;
  const inicioListadoRef = useRef(null);

  const consultaServicio = useNoticiasServicio(
    tipo === 'servicio' ? slug : null,
    { pagina: paginaActual, porPagina: POR_PAGINA },
  );
  const consultaGrupo = useNoticiasGrupo(
    tipo === 'grupo' ? slug : null,
    { pagina: paginaActual, porPagina: POR_PAGINA },
  );

  const { data, isPending, isError } = tipo === 'servicio' ? consultaServicio : consultaGrupo;
  const publicaciones = data?.datos ?? [];
  const paginacion = data?.paginacion ?? {
    pagina: paginaActual,
    porPagina: POR_PAGINA,
    total: 0,
    totalPaginas: 0,
  };

  if (isPending || isError || publicaciones.length === 0) {
    return null;
  }

  return (
    <Seccion fondo={fondo}>
      <div ref={inicioListadoRef} tabIndex={-1} className="outline-none">
        <h2 className="mb-8 font-display text-h2 font-semibold text-ink">
          Noticias relacionadas
        </h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {publicaciones.map((noticia, indice) => {
            const destino = destinoLeerNota(noticia);
            const imagen = noticia.imagenPortada;
            const esAfiche = Boolean(
              imagen?.alto && imagen?.ancho && imagen.alto > imagen.ancho,
            );

            const contenidoImagen = imagen ? (
              <img
                src={imagen.url}
                {...construirAtributosImagen(
                  imagen,
                  '(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw',
                )}
                alt={imagen.textoAlternativo || noticia.titulo}
                width={imagen.ancho ?? undefined}
                height={imagen.alto ?? undefined}
                className={`foto-hover aspect-[16/10] w-full ${
                  esAfiche ? 'bg-cream object-contain' : 'object-cover'
                }`}
                loading="lazy"
              />
            ) : null;

            return (
              <Reveal
                key={noticia.id}
                variante="tarjeta"
                retraso={indice * 120}
                as="article"
                className="tarjeta-portal group flex flex-col overflow-hidden rounded-md border border-sand bg-white"
              >
                {contenidoImagen && (
                  <div className="overflow-hidden bg-cream">
                    {destino.esExterno ? (
                      <a
                        href={destino.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Abrir ${noticia.titulo} en enlace externo (se abre en otra pestaña)`}
                        className="block"
                      >
                        {contenidoImagen}
                      </a>
                    ) : (
                      <Link
                        to={destino.url}
                        aria-label={`Leer ${noticia.titulo}`}
                        className="block"
                      >
                        {contenidoImagen}
                      </Link>
                    )}
                  </div>
                )}

                <div className="flex flex-1 flex-col justify-between p-6">
                  <div>
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
                      <p className="mt-3 line-clamp-3 font-body text-body text-muted">
                        {noticia.resumen}
                      </p>
                    )}
                  </div>

                  <div className="mt-5 pt-3">
                    {destino.esExterno ? (
                      <a
                        href={destino.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Leer publicación: ${noticia.titulo} (se abre en otra pestaña)`}
                        className="inline-flex min-h-11 items-center gap-2 font-body text-button font-semibold text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                      >
                        <span>Leer nota</span>
                        <ExternalLink size={15} aria-hidden="true" />
                      </a>
                    ) : (
                      <Link
                        to={destino.url}
                        aria-label={`Leer publicación: ${noticia.titulo}`}
                        className="inline-flex min-h-11 items-center gap-2 font-body text-button font-semibold text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                      >
                        <span>Leer nota</span>
                        <ArrowRight
                          size={15}
                          aria-hidden="true"
                          className="transition-transform duration-200 ease-salida group-hover:translate-x-1"
                        />
                      </Link>
                    )}
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        <PaginacionPortal
          paginaActual={paginacion.pagina}
          totalPaginas={paginacion.totalPaginas}
          etiqueta="Paginación de noticias relacionadas"
          alCambiarPagina={(nueva) => setEstadoPagina({ clave, pagina: nueva })}
          destinoFocoRef={inicioListadoRef}
        />
      </div>
    </Seccion>
  );
}

export default NoticiasRelacionadas;
