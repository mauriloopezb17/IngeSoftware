import { Clock3, ExternalLink, Mail, MapPin, MessageCircle, Navigation, Phone } from 'lucide-react';

import {
  BotonEnlace,
  EncabezadoPagina,
  Reveal,
  Seccion,
} from '../components/portal/index.js';
import { CargandoSeccion, ErrorSeccion, SinResultados } from '../components/parroquia/EstadoSeccion.jsx';
import { IconoRedSocial } from '../components/parroquia/IconoDinamico.jsx';
import { TIPOS_HORARIO } from '../config/sede.js';
import { useHorarios, useSede } from '../hooks/index.js';
import {
  armarHrefGmail,
  armarHrefTelefono,
  formatearRangoHorario,
} from '../utils/formatoPortal.js';

function ContactoPagina() {
  const { data: sede, isPending, isError, refetch } = useSede();
  const { data: horarios = [] } = useHorarios();

  const configuracion = sede?.configuracion ?? {};
  const enlaceGoogleMaps = configuracion.enlaceComoLlegar;
  const enlaceMessenger = configuracion.enlaceMessenger;
  const urlMapaEmbed = configuracion.urlMapaEmbed || null;
  const telefono = sede?.telefono;
  const hrefTelefono = armarHrefTelefono(telefono);
  const whatsappUrl = sede?.whatsapp
    ? `https://wa.me/${sede.whatsapp.replace(/\D/g, '')}`
    : null;
  const redesSociales = sede?.redesSociales ?? [];
  const secretaria = horarios.find((grupo) => grupo.tipo?.nombre === TIPOS_HORARIO.SECRETARIA);

  return (
    <>
      <title>Contacto | Parroquia Señor de la Exaltación</title>
      <meta
        name="description"
        content="Dirección, teléfono, correo electrónico, horarios de secretaría y cómo llegar a la Parroquia Señor de la Exaltación en Obrajes, La Paz."
      />

      <EncabezadoPagina
        migas={[{ texto: 'Inicio', enlace: '/' }, { texto: 'Contacto' }]}
        eyebrow="Ubicación y secretaría"
        titulo="Visítanos o escríbenos"
        bajada="Atendemos consultas sobre sacramentos, certificados, intenciones de misa y actividades parroquiales."
      />

      <Seccion fondo="blanco">
        {isPending ? (
          <CargandoSeccion alturaMinima={320} etiqueta="Cargando información de contacto" />
        ) : isError ? (
          <ErrorSeccion
            mensaje="No pudimos cargar la información de contacto."
            onReintentar={refetch}
          />
        ) : !sede ? (
          <SinResultados mensaje="No hay información de contacto disponible." />
        ) : (
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            {/* Canales de contacto y horarios de secretaría */}
            <Reveal variante="izquierda" className="space-y-8 lg:col-span-6">
              <dl className="divide-y divide-sand border-y border-sand">
                {sede.direccion && (
                  <div className="flex items-start gap-4 py-5">
                    <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-sm bg-gold-soft text-ink">
                      <MapPin size={20} aria-hidden="true" />
                    </span>
                    <div>
                      <dt className="font-body text-meta font-semibold uppercase tracking-[0.12em] text-muted">
                        Dirección
                      </dt>
                      <dd className="mt-1 font-body text-body text-ink">{sede.direccion}</dd>
                    </div>
                  </div>
                )}

                {telefono && (
                  <div className="flex items-start gap-4 py-5">
                    <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-sm bg-gold-soft text-ink">
                      <Phone size={20} aria-hidden="true" />
                    </span>
                    <div>
                      <dt className="font-body text-meta font-semibold uppercase tracking-[0.12em] text-muted">
                        Teléfono
                      </dt>
                      <dd className="mt-1">
                        <a
                          href={hrefTelefono}
                          className="font-body text-body font-semibold tabular-nums text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                        >
                          {telefono}
                        </a>
                      </dd>
                    </div>
                  </div>
                )}

                {whatsappUrl && (
                  <div className="flex items-start gap-4 py-5">
                    <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-sm bg-gold-soft text-ink">
                      <MessageCircle size={20} aria-hidden="true" />
                    </span>
                    <div>
                      <dt className="font-body text-meta font-semibold uppercase tracking-[0.12em] text-muted">
                        WhatsApp
                      </dt>
                      <dd className="mt-1">
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-body text-body font-semibold text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                        >
                          {configuracion.textoWhatsapp || 'WhatsApp Secretaría'}
                        </a>
                      </dd>
                    </div>
                  </div>
                )}

                {sede.correo && (
                  <div className="flex items-start gap-4 py-5">
                    <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-sm bg-gold-soft text-ink">
                      <Mail size={20} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <dt className="font-body text-meta font-semibold uppercase tracking-[0.12em] text-muted">
                        Correo electrónico
                      </dt>
                      <dd className="mt-1">
                        <a
                          href={armarHrefGmail(sede.correo)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="break-all font-body text-body font-semibold text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                        >
                          {sede.correo}
                        </a>
                      </dd>
                    </div>
                  </div>
                )}

                {configuracion.textoMessenger && enlaceMessenger && (
                  <div className="flex items-start gap-4 py-5">
                    <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-sm bg-gold-soft text-ink">
                      <MessageCircle size={20} aria-hidden="true" />
                    </span>
                    <div>
                      <dt className="font-body text-meta font-semibold uppercase tracking-[0.12em] text-muted">
                        Facebook Messenger
                      </dt>
                      <dd className="mt-1">
                        <a
                          href={enlaceMessenger}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-body text-body font-semibold text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                        >
                          {configuracion.textoMessenger}
                        </a>
                      </dd>
                    </div>
                  </div>
                )}
              </dl>

              {secretaria?.filas?.length > 0 && (
                <div className="rounded-md border border-sand bg-cream p-6">
                  <h2 className="flex items-center gap-2 font-display text-h3 font-semibold text-ink">
                    <Clock3 size={20} aria-hidden="true" />
                    <span>Horarios de secretaría</span>
                  </h2>
                  <ul className="mt-4 divide-y divide-sand">
                    {secretaria.filas.map((fila) => (
                      <li
                        key={fila.etiqueta}
                        className="flex flex-wrap items-baseline justify-between gap-2 py-2.5 font-body text-body"
                      >
                        <span className="font-semibold text-ink">{fila.etiqueta}</span>
                        <span className="tabular-nums text-muted">
                          {fila.horarios
                            .map((h) => formatearRangoHorario(h.horaInicio, h.horaFin))
                            .join(' · ')}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {redesSociales.length > 0 && (
                <div>
                  <h2 className="font-body text-eyebrow font-semibold uppercase tracking-[0.2em] text-muted">
                    Redes sociales
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {redesSociales.map(({ nombre, url, icono }) => (
                      <BotonEnlace key={nombre} to={url} variante="secundario">
                        <IconoRedSocial nombre={icono} size={16} />
                        <span>{nombre}</span>
                        <ExternalLink size={14} aria-hidden="true" />
                      </BotonEnlace>
                    ))}
                  </div>
                </div>
              )}
            </Reveal>

            {/* Ubicación y mapa */}
            <div className="lg:col-span-6">
              <div className="overflow-hidden rounded-md border border-sand bg-cream">
                {urlMapaEmbed ? (
                  <iframe
                    src={urlMapaEmbed}
                    title={`Mapa de ${sede.nombre}`}
                    loading="lazy"
                    className="aspect-[4/3] w-full border-0"
                  />
                ) : (
                  <div className="relative">
                    {sede.imagenPortada?.url && (
                      <img
                        src={sede.imagenPortada.url}
                        alt={sede.imagenPortada.textoAlternativo || sede.nombre}
                        width={sede.imagenPortada.ancho ?? undefined}
                        height={sede.imagenPortada.alto ?? undefined}
                        className="aspect-[16/10] w-full object-cover"
                        loading="lazy"
                      />
                    )}
                    <div className="p-6 md:p-8">
                      <p className="font-body text-eyebrow font-semibold uppercase tracking-[0.2em] text-muted">
                        Cómo llegar
                      </p>
                      <h2 className="mt-2 font-display text-h2 font-semibold text-ink">
                        {sede.nombre}
                      </h2>
                      {sede.direccion && (
                        <p className="mt-2 font-body text-body text-muted">{sede.direccion}</p>
                      )}
                      {sede.ubicacion?.latitud != null && sede.ubicacion?.longitud != null && (
                        <p className="mt-2 font-body text-meta tabular-nums text-muted">
                          Coordenadas: {sede.ubicacion.latitud}, {sede.ubicacion.longitud}
                        </p>
                      )}

                      {enlaceGoogleMaps && (
                        <div className="mt-6 flex flex-wrap gap-3">
                          <BotonEnlace to={enlaceGoogleMaps} variante="primario">
                            <Navigation size={16} aria-hidden="true" />
                            Abrir en Google Maps
                          </BotonEnlace>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Seccion>
    </>
  );
}

export default ContactoPagina;
