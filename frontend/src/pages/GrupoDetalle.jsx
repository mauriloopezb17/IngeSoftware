import { useState } from 'react';
import { ArrowLeft, Clock3, Mail, MessageCircle, Phone, User } from 'lucide-react';
import { Link, useParams } from 'react-router';

import {
  BotonEnlace,
  EncabezadoPagina,
  EncabezadoSeccion,
  Eyebrow,
  Reveal,
  RevealImagen,
  Seccion,
} from '../components/portal/index.js';
import { BloqueVideoYoutube } from '../components/parroquia/BloquesPagina.jsx';
import ContenidoBlockNote from '../components/parroquia/ContenidoBlockNote.jsx';
import { CargandoSeccion, ErrorSeccion } from '../components/parroquia/EstadoSeccion.jsx';
import { construirAtributosImagen } from '../components/parroquia/imagenSrcSet.js';
import VisorGaleria from '../components/parroquia/VisorGaleria.jsx';
import { useGrupoPastoral, useSede } from '../hooks/index.js';
import { armarHrefTelefono } from '../utils/formatoPortal.js';
import { armarHrefCorreoGrupo, armarHrefWhatsAppGrupo } from './grupoContacto.js';

function GrupoDetalle() {
  const { slug } = useParams();
  const { data: grupo, isPending, isError, error, refetch } = useGrupoPastoral(slug);
  const { data: sede } = useSede();
  const [indiceVisor, setIndiceVisor] = useState(null);

  const esNoEncontrado = error?.estado === 404 || error?.codigo === 'NO_ENCONTRADO';

  const tituloSeo = grupo
    ? `${grupo.nombre} — Comunidad | Parroquia Señor de la Exaltación`
    : esNoEncontrado
      ? 'Grupo no encontrado | Parroquia Señor de la Exaltación'
      : 'Grupos y pastorales | Parroquia Señor de la Exaltación';

  const descripcionSeo = grupo?.descripcion
    ? grupo.descripcion.slice(0, 160)
    : grupo
      ? `Conoce ${grupo.nombre}, sus horarios de reunión y cómo comunicarte con su responsable.`
      : 'Grupos pastorales de la Parroquia Señor de la Exaltación en Obrajes, La Paz.';

  const tieneContenido = Boolean(grupo?.detalle?.contenido?.bloques?.length);
  const videoYoutubeId = grupo?.detalle?.videoYoutubeId ?? null;
  const galeria = grupo?.galeria ?? [];
  const tieneBloquePrincipal = Boolean(
    grupo?.imagen || grupo?.descripcion || tieneContenido || videoYoutubeId,
  );

  const whatsappGrupo = grupo ? armarHrefWhatsAppGrupo(grupo.whatsapp, grupo.nombre) : null;
  const correoGrupo = grupo ? armarHrefCorreoGrupo(grupo.correo, grupo.nombre) : null;
  const tieneContactoDirecto = Boolean(whatsappGrupo || correoGrupo);

  const whatsappSecretaria = sede?.whatsapp
    ? armarHrefWhatsAppGrupo(sede.whatsapp, grupo?.nombre ?? 'un grupo pastoral')
    : null;
  const correoSecretaria = sede?.correo
    ? armarHrefCorreoGrupo(sede.correo, grupo?.nombre ?? 'un grupo pastoral')
    : null;
  const telefonoSecretaria = armarHrefTelefono(sede?.telefono);

  return (
    <>
      <title>{tituloSeo}</title>
      <meta name="description" content={descripcionSeo} />

      {isPending ? (
        <Seccion fondo="blanco">
          <CargandoSeccion alturaMinima={320} etiqueta="Cargando grupo pastoral" />
        </Seccion>
      ) : isError && esNoEncontrado ? (
        <Seccion fondo="blanco">
          <div className="max-w-2xl">
            <Eyebrow className="mb-4">Grupo no disponible</Eyebrow>
            <h1 className="font-display text-h1 font-semibold text-ink">
              No encontramos este grupo pastoral
            </h1>
            <p className="mt-4 max-w-prose font-body text-lead text-muted">
              Es posible que el enlace haya cambiado o que el grupo no esté publicado en este momento.
            </p>
            <div className="mt-8">
              <Link
                to="/comunidad"
                className="inline-flex min-h-11 items-center gap-2 font-body text-button font-semibold text-ink underline underline-offset-4 hover:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
              >
                <ArrowLeft size={16} aria-hidden="true" />
                <span>Volver a comunidad</span>
              </Link>
            </div>
          </div>
        </Seccion>
      ) : isError ? (
        <Seccion fondo="blanco">
          <ErrorSeccion mensaje="No pudimos cargar este grupo pastoral." onReintentar={refetch} />
        </Seccion>
      ) : (
        <>
          <EncabezadoPagina
            migas={[
              { texto: 'Inicio', enlace: '/' },
              { texto: 'Comunidad', enlace: '/comunidad' },
              { texto: grupo.nombre },
            ]}
            eyebrow="Grupo pastoral"
            titulo={grupo.nombre}
          />

          <Seccion fondo="blanco">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
              {tieneBloquePrincipal && (
                <div className="flex flex-col gap-8 lg:col-span-7">
                  {grupo.imagen && (
                    <figure className="overflow-hidden rounded-md border border-sand bg-cream">
                      <RevealImagen lado="izquierda">
                        <img
                          {...construirAtributosImagen(
                            grupo.imagen,
                            '(min-width: 1024px) 58vw, 100vw',
                          )}
                          alt={grupo.imagen.textoAlternativo || grupo.nombre}
                          width={grupo.imagen.ancho ?? undefined}
                          height={grupo.imagen.alto ?? undefined}
                          className="aspect-4/3 w-full object-cover"
                        />
                      </RevealImagen>
                    </figure>
                  )}

                  {grupo.descripcion && (
                    <p className="max-w-prose font-body text-lead text-ink">{grupo.descripcion}</p>
                  )}

                  {tieneContenido && (
                    <div className="max-w-prose">
                      <ContenidoBlockNote contenido={grupo.detalle.contenido} />
                    </div>
                  )}

                  {videoYoutubeId && (
                    <BloqueVideoYoutube
                      contenido={{
                        youtube_video_id: videoYoutubeId,
                        titulo: `Video de ${grupo.nombre}`,
                      }}
                    />
                  )}
                </div>
              )}

              <aside
                aria-label="Horario y contacto"
                className={tieneBloquePrincipal ? 'lg:col-span-5' : 'lg:col-span-8'}
              >
                <div className="rounded-md border border-sand bg-cream p-6 md:p-8">
                  {grupo.horarioReunion && (
                    <div className="flex items-start gap-3 border-b border-sand pb-6">
                      <Clock3 size={20} className="mt-1 shrink-0 text-ink" aria-hidden="true" />
                      <div>
                        <p className="font-body text-meta font-semibold text-muted">
                          Horario de reunión
                        </p>
                        <p className="mt-1 font-display text-h3 font-semibold text-ink">
                          {grupo.horarioReunion}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className={grupo.horarioReunion ? 'pt-6' : ''}>
                    <h2 className="font-display text-h3 font-semibold text-ink">Contacto</h2>

                    {grupo.responsable && (
                      <div className="mt-4 flex items-center gap-2.5 text-ink">
                        <User size={18} className="shrink-0 text-muted" aria-hidden="true" />
                        <p className="font-body text-body font-medium">{grupo.responsable}</p>
                      </div>
                    )}

                    {tieneContactoDirecto ? (
                      <div className="mt-5 flex flex-col gap-3">
                        {whatsappGrupo && (
                          <a
                            href={whatsappGrupo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm bg-gold px-5 py-2.5 font-body text-button font-semibold text-ink transition-colors duration-200 ease-salida hover:bg-gold-dark active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
                          >
                            <MessageCircle size={18} aria-hidden="true" />
                            <span>Escribir por WhatsApp</span>
                          </a>
                        )}
                        {correoGrupo && (
                          <a
                            href={correoGrupo}
                            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm border border-ink px-5 py-2.5 font-body text-button font-semibold text-ink transition-colors duration-200 ease-salida hover:bg-ink hover:text-white active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
                          >
                            <Mail size={18} aria-hidden="true" />
                            <span>Enviar correo</span>
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="mt-4 flex flex-col gap-3">
                        <p className="font-body text-body text-muted">
                          Escríbele a la secretaría para recibir información y sumarte al grupo.
                        </p>
                        {whatsappSecretaria && (
                          <a
                            href={whatsappSecretaria}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm bg-gold px-5 py-2.5 font-body text-button font-semibold text-ink transition-colors duration-200 ease-salida hover:bg-gold-dark active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
                          >
                            <MessageCircle size={18} aria-hidden="true" />
                            <span>Escribir a secretaría</span>
                          </a>
                        )}
                        {correoSecretaria && (
                          <a
                            href={correoSecretaria}
                            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm border border-ink px-5 py-2.5 font-body text-button font-semibold text-ink transition-colors duration-200 ease-salida hover:bg-ink hover:text-white active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
                          >
                            <Mail size={18} aria-hidden="true" />
                            <span>Enviar correo</span>
                          </a>
                        )}
                        {!whatsappSecretaria && telefonoSecretaria && (
                          <BotonEnlace to={telefonoSecretaria} variante="primario">
                            <Phone size={16} aria-hidden="true" />
                            <span>Llamar: {sede.telefono}</span>
                          </BotonEnlace>
                        )}
                        {!whatsappSecretaria && !correoSecretaria && !telefonoSecretaria && (
                          <BotonEnlace to="/contacto" variante="primario">
                            <span>Ver contacto de secretaría</span>
                          </BotonEnlace>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </aside>
            </div>

            <div className="mt-12 border-t border-sand pt-8">
              <Link
                to="/comunidad"
                className="inline-flex min-h-11 items-center gap-2 font-body text-button font-semibold text-ink underline underline-offset-4 hover:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
              >
                <ArrowLeft size={16} aria-hidden="true" />
                <span>Volver a comunidad</span>
              </Link>
            </div>
          </Seccion>

          {galeria.length > 0 && (
            <Seccion fondo="crema">
              <EncabezadoSeccion eyebrow="Galería" titulo="Fotos y videos" />
              <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {galeria.map((item, indice) => {
                  const esVideo = item.tipoMime?.startsWith('video/');
                  const alt = item.textoAlternativo || `Archivo ${indice + 1} de ${grupo.nombre}`;
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

          {/* Espacio reservado (ola 2): Noticias del grupo (Agente A) */}
        </>
      )}
    </>
  );
}

export default GrupoDetalle;
