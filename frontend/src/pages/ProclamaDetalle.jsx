import { useState } from 'react';
import { ArrowLeft, Calendar, ExternalLink, MapPin } from 'lucide-react';
import { Link, useParams } from 'react-router';

import {
  EncabezadoPagina,
  EncabezadoSeccion,
  Eyebrow,
  Reveal,
  Seccion,
} from '../components/portal/index.js';
import ContenidoBlockNote from '../components/parroquia/ContenidoBlockNote.jsx';
import { CargandoSeccion, ErrorSeccion } from '../components/parroquia/EstadoSeccion.jsx';
import { construirAtributosImagen } from '../components/parroquia/imagenSrcSet.js';
import VisorGaleria from '../components/parroquia/VisorGaleria.jsx';
import { useProclama, useSede } from '../hooks/index.js';
import { formatearFechaBoda, formatearFechaLarga } from '../utils/formatoPortal.js';

function ProclamaDetalle() {
  const { id } = useParams();
  const { data: proclama, isPending, isError, error, refetch } = useProclama(id);
  const { data: sede } = useSede();
  const [indiceVisor, setIndiceVisor] = useState(null);

  const esNoEncontrado = error?.estado === 404 || error?.codigo === 'NO_ENCONTRADO';
  const nombres = proclama ? `${proclama.contrayente1} y ${proclama.contrayente2}` : '';

  const tituloSeo = proclama
    ? `${nombres} — Proclama matrimonial | Parroquia Señor de la Exaltación`
    : esNoEncontrado
      ? 'Proclama no encontrada | Parroquia Señor de la Exaltación'
      : 'Proclamas matrimoniales | Parroquia Señor de la Exaltación';

  const descripcionSeo = proclama
    ? `Proclama matrimonial de ${nombres}. Fecha del matrimonio, lugar y publicaciones.`
    : 'Proclama matrimonial de la Parroquia Señor de la Exaltación en Obrajes, La Paz.';

  const lugarExterno = proclama?.detalle?.lugar ?? null;
  const nombreTemplo = lugarExterno ? lugarExterno.templo : sede?.nombre || 'Parroquia Señor de la Exaltación';
  const direccionTemplo = lugarExterno ? lugarExterno.direccion : sede?.direccion || null;
  const enlaceMapa = lugarExterno?.enlaceMapa ?? null;

  const tieneContenido = Boolean(proclama?.detalle?.contenido?.bloques?.length);
  const galeria = proclama?.galeria ?? [];
  const tieneBloquePrincipal = Boolean(proclama?.imagen || tieneContenido);

  return (
    <>
      <title>{tituloSeo}</title>
      <meta name="description" content={descripcionSeo} />

      {isPending ? (
        <Seccion fondo="blanco">
          <CargandoSeccion alturaMinima={320} etiqueta="Cargando proclama matrimonial" />
        </Seccion>
      ) : isError && esNoEncontrado ? (
        <Seccion fondo="blanco">
          <div className="max-w-2xl">
            <Eyebrow className="mb-4">Proclama no disponible</Eyebrow>
            <h1 className="font-display text-h1 font-semibold text-ink">No encontramos esta proclama</h1>
            <p className="mt-4 max-w-prose font-body text-lead text-muted">
              Es posible que aún no haya sido publicada o que el enlace no corresponda a una proclama vigente o del
              historial.
            </p>
            <div className="mt-8">
              <Link
                to="/proclamas"
                className="inline-flex min-h-11 items-center gap-2 font-body text-button font-semibold text-ink underline underline-offset-4 hover:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
              >
                <ArrowLeft size={16} aria-hidden="true" />
                <span>Volver a proclamas</span>
              </Link>
            </div>
          </div>
        </Seccion>
      ) : isError ? (
        <Seccion fondo="blanco">
          <ErrorSeccion mensaje="No pudimos cargar esta proclama." onReintentar={refetch} />
        </Seccion>
      ) : (
        <>
          <EncabezadoPagina
            migas={[
              { texto: 'Inicio', enlace: '/' },
              { texto: 'Proclamas', enlace: '/proclamas' },
              { texto: nombres },
            ]}
            eyebrow="Proclama matrimonial"
            titulo={nombres}
          />

          <Seccion fondo="blanco">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
              {tieneBloquePrincipal && (
                <div className="lg:col-span-7">
                  {proclama.imagen && (
                    <Reveal>
                      <figure className="overflow-hidden rounded-md border border-sand bg-cream">
                        <img
                          {...construirAtributosImagen(proclama.imagen, '(min-width: 1024px) 58vw, 100vw')}
                          alt={proclama.imagen.textoAlternativo || nombres}
                          className="aspect-4/3 w-full object-cover"
                        />
                      </figure>
                    </Reveal>
                  )}

                  {tieneContenido && (
                    <div className={proclama.imagen ? 'mt-8 max-w-prose' : 'max-w-prose'}>
                      <ContenidoBlockNote contenido={proclama.detalle.contenido} />
                    </div>
                  )}
                </div>
              )}

              <aside
                aria-label="Datos del matrimonio"
                className={tieneBloquePrincipal ? 'lg:col-span-5' : 'lg:col-span-8'}
              >
                <div className="rounded-md border border-sand bg-cream p-6 md:p-8">
                  <span className="inline-flex items-center rounded-sm bg-gold-soft px-3 py-1 font-body text-meta font-semibold text-ink">
                    {`${proclama.numeroProclama}.ª proclama`}
                  </span>

                  <div className="mt-6 flex items-start gap-3">
                    <Calendar size={20} className="mt-1 shrink-0 text-ink" aria-hidden="true" />
                    <div>
                      <p className="font-body text-meta font-semibold text-muted">Fecha y hora del matrimonio</p>
                      <p className="mt-1 font-display text-h3 font-semibold text-ink lining-nums tabular-nums">
                        {formatearFechaBoda(proclama.fechaMatrimonio)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex items-start gap-3 border-t border-sand pt-6">
                    <MapPin size={20} className="mt-1 shrink-0 text-ink" aria-hidden="true" />
                    <div>
                      <p className="font-body text-meta font-semibold text-muted">Lugar de la celebración</p>
                      <p className="mt-1 font-body text-body font-semibold text-ink">{nombreTemplo}</p>
                      {direccionTemplo && (
                        <p className="mt-1 font-body text-meta text-muted">{direccionTemplo}</p>
                      )}
                      {enlaceMapa && (
                        <a
                          href={enlaceMapa}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex min-h-11 items-center gap-1.5 font-body text-button font-semibold text-ink underline underline-offset-4 hover:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
                        >
                          <span>Cómo llegar</span>
                          <ExternalLink size={15} aria-hidden="true" />
                        </a>
                      )}
                    </div>
                  </div>

                  {proclama.publicaciones?.length > 0 && (
                    <div className="mt-6 border-t border-sand pt-6">
                      <p className="font-body text-meta font-semibold text-muted">Publicaciones</p>
                      <ul className="mt-2 flex flex-col gap-1.5 font-body text-meta text-ink">
                        {proclama.publicaciones.map((pub) => (
                          <li key={pub.numero}>
                            <strong className="font-semibold">{pub.numero}.ª proclama:</strong>{' '}
                            {formatearFechaLarga(pub.fecha)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </aside>
            </div>

            <div className="mt-12 border-t border-sand pt-8">
              <Link
                to="/proclamas"
                className="inline-flex min-h-11 items-center gap-2 font-body text-button font-semibold text-ink underline underline-offset-4 hover:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
              >
                <ArrowLeft size={16} aria-hidden="true" />
                <span>Volver a proclamas</span>
              </Link>
            </div>
          </Seccion>

          {galeria.length > 0 && (
            <Seccion fondo="crema">
              <EncabezadoSeccion eyebrow="Galería" titulo="Fotos y videos" />
              <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {galeria.map((item, indice) => {
                  const esVideo = item.tipoMime?.startsWith('video/');
                  const alt = item.textoAlternativo || `Archivo ${indice + 1} de ${nombres}`;
                  return (
                    <li key={item.id ?? indice}>
                      {esVideo ? (
                        <div className="overflow-hidden rounded-md border border-sand bg-white">
                          <video
                            src={item.url}
                            controls
                            preload="metadata"
                            aria-label={alt}
                            className="aspect-4/3 w-full bg-ink object-cover"
                          >
                            Tu navegador no admite la reproducción de video.
                          </video>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIndiceVisor(indice)}
                          aria-label={`Ampliar imagen: ${alt}`}
                          className="group block w-full cursor-pointer overflow-hidden rounded-md border border-sand bg-white text-left transition-colors duration-200 ease-salida hover:border-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
                        >
                          <img
                            {...construirAtributosImagen(item, '(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw')}
                            alt={alt}
                            className="aspect-4/3 w-full object-cover transition-transform duration-700 ease-salida group-hover:scale-[1.04] motion-reduce:transition-none"
                          />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Seccion>
          )}

          {indiceVisor !== null && (
            <VisorGaleria
              elementos={galeria}
              indice={indiceVisor}
              alCambiar={setIndiceVisor}
              alCerrar={() => setIndiceVisor(null)}
            />
          )}
        </>
      )}
    </>
  );
}

export default ProclamaDetalle;
