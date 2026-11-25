import { ArrowLeft, Calendar, Clock, ExternalLink, Mail, MapPin, Navigation, Phone, User } from 'lucide-react';
import { Link, useParams } from 'react-router';

import { BotonEnlace, Contenedor, EncabezadoPagina, Seccion } from '../components/portal/index.js';
import ContenidoBlockNote from '../components/parroquia/ContenidoBlockNote.jsx';
import { CargandoSeccion, ErrorSeccion } from '../components/parroquia/EstadoSeccion.jsx';
import { construirAtributosImagen } from '../components/parroquia/imagenSrcSet.js';
import { useEvento } from '../hooks/index.js';
import {
  claveDiaBolivia,
  esEventoPasado,
  etiquetaDiaEvento,
  hoyBoliviaIso,
} from '../utils/eventosPortal.js';
import { armarHrefGmail, armarHrefTelefono, formatearHoraEvento } from '../utils/formatoPortal.js';
import NoEncontrado from './NoEncontrado.jsx';

function formatearRangoFechas(evento) {
  const diaInicio = claveDiaBolivia(evento.fechaInicio);
  const diaFin = evento.fechaFin ? claveDiaBolivia(evento.fechaFin) : '';
  if (!diaFin || diaFin === diaInicio) {
    return etiquetaDiaEvento(diaInicio, { conAnio: true });
  }
  return `Del ${etiquetaDiaEvento(diaInicio)} al ${etiquetaDiaEvento(diaFin, { conAnio: true })}`;
}

function EventoDetalle() {
  const { id } = useParams();
  const esIdValido = /^\d+$/.test(id ?? '');
  const { data: respuesta, isPending, isError, error, refetch } = useEvento(esIdValido ? id : null);

  if (!esIdValido || (isError && error?.estado === 404)) {
    return <NoEncontrado />;
  }

  if (isPending) {
    return (
      <section className="py-12 md:py-20">
        <Contenedor>
          <CargandoSeccion alturaMinima={320} etiqueta="Cargando evento" lineas={5} />
        </Contenedor>
      </section>
    );
  }

  if (isError || !respuesta?.datos) {
    return (
      <section className="py-12 md:py-20">
        <Contenedor>
          <ErrorSeccion
            mensaje="No pudimos cargar este evento. Intenta de nuevo en unos instantes."
            onReintentar={() => refetch()}
          />
        </Contenedor>
      </section>
    );
  }

  const evento = respuesta.datos;
  const detalle = evento.detalle ?? null;
  const pasado = esEventoPasado(evento);
  const diaInicioIso = claveDiaBolivia(evento.fechaInicio);
  const puedeAbrirDia = Boolean(diaInicioIso) && diaInicioIso >= hoyBoliviaIso();
  const fechaTexto = formatearRangoFechas(evento);
  const horarioTexto = evento.todoElDia ? 'Todo el día' : formatearHoraEvento(evento);

  const bloques = detalle?.contenido?.bloques ?? [];
  const programa = detalle?.programa ?? [];
  const enlaces = detalle?.enlaces ?? [];
  const responsable = detalle?.responsable ?? null;

  const tieneContenidoCentral = Boolean(
    evento.imagen?.url || bloques.length > 0 || programa.length > 0 || enlaces.length > 0,
  );
  const ubicacionSecundaria =
    detalle?.direccion && detalle.direccion !== evento.lugar ? detalle.direccion : null;
  const ubicacionPrincipal = evento.lugar || detalle?.direccion || null;

  const tarjetaInformacion = (
    <aside
      aria-label="Información del evento"
      className="rounded-sm border border-sand bg-cream p-6 md:p-7 lg:sticky lg:top-28"
    >
      <p className="font-body text-micro font-semibold uppercase tracking-[0.14em] text-muted">
        Información práctica
      </p>

      <dl className="mt-5 flex flex-col gap-5 font-body text-meta">
        <div className="flex items-start gap-3">
          <Calendar className="mt-0.5 size-4 shrink-0 text-ink/75" aria-hidden="true" />
          <div className="min-w-0">
            <dt className="text-micro font-semibold uppercase tracking-[0.08em] text-muted">Fecha</dt>
            <dd className="mt-0.5 font-display text-lg font-semibold leading-snug text-ink lining-nums tabular-nums">
              {fechaTexto}
            </dd>
            {puedeAbrirDia && (
              <Link
                to={`/calendario/dia/${diaInicioIso}`}
                className="-my-2 mt-1 inline-flex min-h-11 items-center text-meta font-semibold text-ink underline decoration-gold decoration-2 underline-offset-4 transition-colors hover:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                Ver eventos de este día
              </Link>
            )}
          </div>
        </div>

        {horarioTexto && (
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 size-4 shrink-0 text-ink/75" aria-hidden="true" />
            <div className="min-w-0">
              <dt className="text-micro font-semibold uppercase tracking-[0.08em] text-muted">
                Horario
              </dt>
              <dd className="mt-0.5 font-semibold text-ink lining-nums tabular-nums">
                {horarioTexto}
              </dd>
            </div>
          </div>
        )}

        {ubicacionPrincipal && (
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 size-4 shrink-0 text-ink/75" aria-hidden="true" />
            <div className="min-w-0">
              <dt className="text-micro font-semibold uppercase tracking-[0.08em] text-muted">Lugar</dt>
              <dd className="mt-0.5 font-semibold text-ink">{ubicacionPrincipal}</dd>
              {ubicacionSecundaria && (
                <dd className="mt-1 text-meta text-muted">{ubicacionSecundaria}</dd>
              )}
            </div>
          </div>
        )}
      </dl>

      {detalle?.enlaceMapa && (
        <a
          href={detalle.enlaceMapa}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm bg-gold px-5 py-3 text-center font-body text-meta font-semibold text-ink transition-colors duration-150 hover:bg-gold-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <Navigation size={16} aria-hidden="true" />
          <span>Cómo llegar en Google Maps</span>
          <span className="sr-only">(se abre en una pestaña nueva)</span>
        </a>
      )}

      {responsable && (
        <div className="mt-6 border-t border-sand pt-5">
          <p className="font-body text-micro font-semibold uppercase tracking-[0.14em] text-muted">
            Responsable y contacto
          </p>
          <div className="mt-3 flex items-start gap-3">
            <User className="mt-0.5 size-4 shrink-0 text-ink/75" aria-hidden="true" />
            <div className="min-w-0 font-body text-meta">
              <p className="font-semibold text-ink">{responsable.nombre}</p>
              {responsable.rol && <p className="mt-0.5 text-muted">{responsable.rol}</p>}
            </div>
          </div>

          {(responsable.telefono || responsable.correo) && (
            <div className="mt-3 flex flex-col gap-1 pl-7 font-body text-meta">
              {responsable.telefono && (
                <a
                  href={armarHrefTelefono(responsable.telefono)}
                  className="inline-flex min-h-11 items-center gap-2 font-medium text-ink underline decoration-sand underline-offset-4 transition-colors hover:decoration-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  <Phone size={15} className="shrink-0 text-muted" aria-hidden="true" />
                  <span className="lining-nums tabular-nums">{responsable.telefono}</span>
                </a>
              )}
              {responsable.correo && (
                <a
                  href={armarHrefGmail(responsable.correo)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 break-all font-medium text-ink underline decoration-sand underline-offset-4 transition-colors hover:decoration-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  <Mail size={15} className="shrink-0 text-muted" aria-hidden="true" />
                  <span>{responsable.correo}</span>
                  <span className="sr-only">(se abre en una pestaña nueva)</span>
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </aside>
  );

  return (
    <article>
      <title>{`${evento.titulo} | Parroquia Señor de la Exaltación`}</title>
      <meta
        name="description"
        content={
          evento.descripcion ||
          `${evento.titulo} — ${fechaTexto} en la Parroquia Señor de la Exaltación.`
        }
      />

      <EncabezadoPagina
        migas={[
          { texto: 'Inicio', enlace: '/' },
          { texto: 'Calendario', enlace: '/calendario' },
          { texto: evento.titulo },
        ]}
        eyebrow={evento.categoria?.nombre ?? 'Calendario parroquial'}
        titulo={evento.titulo}
        bajada={evento.descripcion ?? undefined}
      />

      <Seccion fondo="blanco">
        {pasado && (
          <div
            role="status"
            className="mb-8 flex items-center gap-3 rounded-sm border border-sand bg-cream px-5 py-4 font-body text-meta font-medium text-ink"
          >
            <Clock className="size-4 shrink-0 text-muted" aria-hidden="true" />
            <span>Este evento ya se realizó.</span>
          </div>
        )}

        {tieneContenidoCentral ? (
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
            <div className="flex min-w-0 flex-col gap-10">
              {evento.imagen?.url && (
                <figure className="overflow-hidden rounded-sm border border-sand bg-cream">
                  <img
                    src={evento.imagen.url}
                    alt={evento.imagen.textoAlternativo || evento.titulo}
                    width={evento.imagen.ancho ?? undefined}
                    height={evento.imagen.alto ?? undefined}
                    {...construirAtributosImagen(evento.imagen, '(min-width: 1024px) 720px, 100vw')}
                    className="aspect-video w-full object-cover"
                  />
                </figure>
              )}

              {bloques.length > 0 && (
                <div className="max-w-prose">
                  <ContenidoBlockNote contenido={detalle.contenido} />
                </div>
              )}

              {programa.length > 0 && (
                <section aria-labelledby="programa-evento" className="border-t border-sand pt-8">
                  <h2 id="programa-evento" className="font-display text-h2 font-semibold text-ink">
                    Programa
                  </h2>
                  <div className="mt-3 h-0.5 w-12 bg-gold" aria-hidden="true" />
                  <ol className="mt-6 divide-y divide-sand border-y border-sand">
                    {programa.map((item, indice) => (
                      <li
                        key={`${indice}-${item.hora}`}
                        className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:gap-8"
                      >
                        <span className="w-20 shrink-0 font-display text-xl font-semibold text-ink lining-nums tabular-nums">
                          {item.hora}
                        </span>
                        <span className="font-body text-body text-ink">{item.actividad}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {enlaces.length > 0 && (
                <section aria-labelledby="enlaces-evento" className="border-t border-sand pt-8">
                  <h2 id="enlaces-evento" className="font-display text-h2 font-semibold text-ink">
                    Enlaces y recursos
                  </h2>
                  <div className="mt-3 h-0.5 w-12 bg-gold" aria-hidden="true" />
                  <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {enlaces.map((item, indice) => (
                      <li key={`${indice}-${item.url}`}>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex min-h-11 items-center justify-between gap-3 rounded-sm border border-sand bg-white px-4 py-3 font-body text-meta font-semibold text-ink transition-[border-color,transform] duration-150 hover:-translate-y-0.5 hover:border-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                        >
                          <span className="min-w-0 truncate">{item.texto}</span>
                          <ExternalLink size={16} className="shrink-0 text-muted" aria-hidden="true" />
                          <span className="sr-only">(se abre en una pestaña nueva)</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            {tarjetaInformacion}
          </div>
        ) : (
          <div className="mx-auto max-w-2xl">{tarjetaInformacion}</div>
        )}

        <div className={`mt-12 border-t border-sand pt-8 ${tieneContenidoCentral ? '' : 'mx-auto max-w-2xl'}`}>
          <BotonEnlace to="/calendario" variante="secundario">
            <ArrowLeft size={16} aria-hidden="true" />
            Volver al calendario
          </BotonEnlace>
        </div>
      </Seccion>
    </article>
  );
}

export default EventoDetalle;
