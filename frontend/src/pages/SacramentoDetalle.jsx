import { useState } from 'react';
import { ChevronDown, Clock3, MessageCircle, Phone } from 'lucide-react';
import { Link, useParams } from 'react-router';

import {
  BotonEnlace,
  Contenedor,
  EncabezadoPagina,
  EncabezadoSeccion,
  EnlaceFlecha,
  Reveal,
  RevealImagen,
  Seccion,
} from '../components/portal/index.js';
import { BloqueVideoYoutube } from '../components/parroquia/BloquesPagina.jsx';
import ContenidoBlockNote from '../components/parroquia/ContenidoBlockNote.jsx';
import { CargandoSeccion, ErrorSeccion } from '../components/parroquia/EstadoSeccion.jsx';
import { IconoDinamico } from '../components/parroquia/IconoDinamico.jsx';
import { construirAtributosImagen } from '../components/parroquia/imagenSrcSet.js';
import VisorGaleria from '../components/parroquia/VisorGaleria.jsx';
import { TIPOS_HORARIO } from '../config/sede.js';
import { useHorarios, useSede, useServicio, useServicios } from '../hooks/index.js';
import { armarHrefTelefono, formatearRangoHorario } from '../utils/formatoPortal.js';
import NoEncontrado from './NoEncontrado.jsx';

function SacramentoDetalle() {
  const { slug } = useParams();
  const { data: servicio, isPending, isError, error, refetch } = useServicio(slug);
  const { data: todosServicios = [] } = useServicios();
  const { data: sede } = useSede();
  const { data: horarios = [] } = useHorarios();
  const [indiceVisor, setIndiceVisor] = useState(null);

  const esNoEncontrado = error?.estado === 404 || error?.codigo === 'NO_ENCONTRADO';

  if (!isPending && isError && esNoEncontrado) {
    return <NoEncontrado />;
  }

  if (!isPending && !isError && !servicio) {
    return <NoEncontrado />;
  }

  const datos = servicio?.contenido?.datos ?? [];
  const preguntas = servicio?.preguntasFrecuentes ?? [];
  const tieneContenidoEnriquecido = Boolean(servicio?.detalle?.contenido?.bloques?.length);
  const videoYoutubeId = servicio?.detalle?.videoYoutubeId ?? null;
  const galeria = servicio?.galeria ?? [];
  const otrosServicios = todosServicios.filter((item) => item.slug !== slug);
  const secretaria = horarios.find((grupo) => grupo.tipo?.nombre === TIPOS_HORARIO.SECRETARIA);
  const telefono = sede?.telefono;
  const hrefTelefono = armarHrefTelefono(telefono);
  const whatsappUrl = sede?.whatsapp
    ? `https://wa.me/${sede.whatsapp.replace(/\D/g, '')}`
    : null;

  const tituloSeo = servicio?.nombre
    ? `${servicio.nombre} | Sacramentos | Parroquia Señor de la Exaltación`
    : 'Sacramentos | Parroquia Señor de la Exaltación';

  return (
    <>
      <title>{tituloSeo}</title>
      <meta
        name="description"
        content={
          servicio?.descripcionCorta ||
          'Requisitos, preparación y documentación para sacramentos en la Parroquia Señor de la Exaltación.'
        }
      />

      {isPending ? (
        <Seccion fondo="blanco">
          <CargandoSeccion alturaMinima={360} etiqueta="Cargando información del sacramento" />
        </Seccion>
      ) : isError ? (
        <Seccion fondo="blanco">
          <ErrorSeccion
            mensaje="No pudimos cargar los detalles de este sacramento."
            onReintentar={refetch}
          />
        </Seccion>
      ) : (
        <>
          <EncabezadoPagina
            migas={[
              { texto: 'Inicio', enlace: '/' },
              { texto: 'Sacramentos', enlace: '/sacramentos' },
              { texto: servicio.nombre },
            ]}
            eyebrow="Sacramentos y catequesis"
            titulo={servicio.nombre}
            bajada={servicio.descripcionCorta}
          />

          <Seccion fondo="blanco">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
              <div className="space-y-12 lg:col-span-8">
                {servicio.imagen && (
                  <figure className="overflow-hidden rounded-md border border-sand bg-cream">
                    <RevealImagen lado="izquierda">
                      <img
                        {...construirAtributosImagen(
                          servicio.imagen,
                          '(min-width: 1024px) 58vw, 100vw',
                        )}
                        alt={servicio.imagen.textoAlternativo || servicio.nombre}
                        width={servicio.imagen.ancho ?? undefined}
                        height={servicio.imagen.alto ?? undefined}
                        className="aspect-4/3 w-full object-cover"
                      />
                    </RevealImagen>
                  </figure>
                )}

                {tieneContenidoEnriquecido && (
                  <div className="max-w-prose">
                    <ContenidoBlockNote contenido={servicio.detalle.contenido} />
                  </div>
                )}

                {videoYoutubeId && (
                  <BloqueVideoYoutube
                    contenido={{
                      youtube_video_id: videoYoutubeId,
                      titulo: `Video de ${servicio.nombre}`,
                    }}
                  />
                )}

                <section aria-labelledby="titulo-requisitos">
                  <div className="mb-6 flex items-center gap-3">
                    <span className="inline-flex size-11 items-center justify-center rounded-sm bg-gold-soft text-ink">
                      <IconoDinamico
                        nombre={servicio.icono || 'heart-handshake'}
                        size={22}
                        strokeWidth={1.8}
                      />
                    </span>
                    <h2 id="titulo-requisitos" className="font-display text-h2 font-semibold text-ink">
                      Información y requisitos
                    </h2>
                  </div>

                  {datos.length > 0 ? (
                    <dl className="divide-y divide-sand border-y border-sand">
                      {datos.map((fila, indice) => (
                        <div
                          key={`${fila.etiqueta}-${indice}`}
                          className="grid grid-cols-1 gap-2 py-4 sm:grid-cols-12 sm:gap-6"
                        >
                          <dt className="font-body text-body font-semibold text-ink sm:col-span-4">
                            {fila.etiqueta}
                          </dt>
                          <dd className="max-w-prose font-body text-body text-muted sm:col-span-8">
                            {fila.valor}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="max-w-prose font-body text-body text-muted">
                      Para conocer los requisitos detallados y fechas vigentes, acércate a la
                      secretaría parroquial en nuestros horarios de atención.
                    </p>
                  )}
                </section>

                {preguntas.length > 0 && (
                  <section aria-labelledby="titulo-preguntas">
                    <h2 id="titulo-preguntas" className="mb-6 font-display text-h2 font-semibold text-ink">
                      Preguntas frecuentes
                    </h2>

                    <div className="divide-y divide-sand border-y border-sand">
                      {preguntas.map((item) => (
                        <details key={item.id ?? item.pregunta} className="group py-4">
                          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-body text-body font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink [&::-webkit-details-marker]:hidden">
                            <span>{item.pregunta}</span>
                            <ChevronDown
                              size={18}
                              aria-hidden="true"
                              className="shrink-0 text-muted transition-transform duration-200 ease-salida group-open:rotate-180"
                            />
                          </summary>
                          <p className="mt-3 max-w-prose font-body text-body text-muted">
                            {item.respuesta}
                          </p>
                        </details>
                      ))}
                    </div>
                  </section>
                )}

                {slug === 'matrimonio' && (
                  <div className="rounded-md border border-sand bg-cream p-6">
                    <h3 className="font-display text-h3 font-semibold text-ink">
                      Proclamas matrimoniales
                    </h3>
                    <p className="mt-2 font-body text-body text-muted">
                      Consulta las proclamas vigentes publicadas esta semana y el registro histórico
                      de la parroquia.
                    </p>
                    <div className="mt-4">
                      <EnlaceFlecha to="/proclamas">Ir a proclamas matrimoniales</EnlaceFlecha>
                    </div>
                  </div>
                )}
              </div>

              <aside className="lg:col-span-4">
                <div className="rounded-md border border-sand bg-cream p-6 lg:sticky lg:top-28">
                  <h2 className="font-display text-h3 font-semibold text-ink">
                    ¿Dudas? Consulta en secretaría
                  </h2>
                  <p className="mt-2 font-body text-body text-muted">
                    Te orientamos sobre documentos, fechas disponibles e inscripciones.
                  </p>

                  {secretaria?.filas?.length > 0 && (
                    <div className="mt-5 border-t border-sand pt-5">
                      <p className="flex items-center gap-2 font-body text-meta font-semibold text-ink">
                        <Clock3 size={16} aria-hidden="true" />
                        <span>Horario de atención</span>
                      </p>
                      <ul className="mt-2 space-y-1.5 font-body text-meta text-muted">
                        {secretaria.filas.map((fila) => (
                          <li key={fila.etiqueta}>
                            <span className="font-semibold text-ink">{fila.etiqueta}:</span>{' '}
                            <span className="tabular-nums">
                              {fila.horarios
                                .map((h) => formatearRangoHorario(h.horaInicio, h.horaFin))
                                .join(' · ')}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-6 flex flex-col gap-3">
                    {telefono && (
                      <BotonEnlace to={hrefTelefono} variante="primario">
                        <Phone size={16} aria-hidden="true" />
                        Llamar: {telefono}
                      </BotonEnlace>
                    )}
                    {whatsappUrl && (
                      <BotonEnlace to={whatsappUrl} variante="secundario">
                        <MessageCircle size={16} aria-hidden="true" />
                        {sede?.configuracion?.textoWhatsapp || 'WhatsApp Secretaría'}
                      </BotonEnlace>
                    )}
                    <EnlaceFlecha to="/contacto">Ver dirección y mapa</EnlaceFlecha>
                  </div>
                </div>
              </aside>
            </div>
          </Seccion>

          {galeria.length > 0 && (
            <Seccion fondo="crema">
              <EncabezadoSeccion eyebrow="Galería" titulo="Fotos y videos" />
              <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {galeria.map((item, indice) => {
                  const esVideo = item.tipoMime?.startsWith('video/');
                  const alt = item.textoAlternativo || `Archivo ${indice + 1} de ${servicio.nombre}`;
                  return (
                    <Reveal
                      key={item.id ?? indice}
                      as="li"
                      variante="tarjeta"
                      retraso={indice * 120}
                    >
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
                            {...construirAtributosImagen(
                              item,
                              '(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw',
                            )}
                            alt={alt}
                            width={item.ancho ?? undefined}
                            height={item.alto ?? undefined}
                            className="aspect-4/3 w-full object-cover transition-transform duration-700 ease-salida group-hover:scale-[1.04] motion-reduce:transition-none"
                          />
                        </button>
                      )}
                    </Reveal>
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

          {otrosServicios.length > 0 && (
            <section className="border-t border-sand bg-cream py-16 md:py-24">
              <Contenedor>
                <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                  <h2 className="font-display text-h2 font-semibold text-ink">
                    Otros sacramentos y servicios
                  </h2>
                  <EnlaceFlecha to="/sacramentos">Ver todos</EnlaceFlecha>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {otrosServicios.map((item, indice) => (
                    <Reveal key={item.id} variante="tarjeta" retraso={indice * 120}>
                      <Link
                        to={`/sacramentos/${item.slug}`}
                        className="tarjeta-portal flex h-full flex-col justify-between rounded-md border border-sand bg-white p-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                      >
                        <div>
                          <h3 className="font-display text-h3 font-semibold text-ink">
                            {item.nombre}
                          </h3>
                          <p className="mt-2 font-body text-meta text-muted">
                            {item.descripcionCorta}
                          </p>
                        </div>
                        <span className="mt-4 font-body text-meta font-semibold text-ink">
                          Ver requisitos →
                        </span>
                      </Link>
                    </Reveal>
                  ))}
                </div>
              </Contenedor>
            </section>
          )}
        </>
      )}
    </>
  );
}

export default SacramentoDetalle;
