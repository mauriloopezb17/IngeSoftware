import { ArrowLeft, ArrowRight, Calendar, Clock, MapPin } from 'lucide-react';
import { Link, useParams } from 'react-router';

import { BotonEnlace, EncabezadoPagina, Seccion } from '../components/portal/index.js';
import { CargandoSeccion, ErrorSeccion, SinResultados } from '../components/parroquia/EstadoSeccion.jsx';
import { useEventos } from '../hooks/index.js';
import {
  claveDiaBolivia,
  esFechaValidaIso,
  etiquetaDiaEvento,
  hoyBoliviaIso,
  sumarDiasIso,
} from '../utils/eventosPortal.js';
import { formatearHoraEvento } from '../utils/formatoPortal.js';
import NoEncontrado from './NoEncontrado.jsx';

function horarioEnDia(evento, fecha) {
  if (evento.todoElDia) return 'Todo el día';
  const diaInicio = claveDiaBolivia(evento.fechaInicio);
  if (diaInicio < fecha) {
    return `Continúa · ${formatearHoraEvento(evento)}`;
  }
  return formatearHoraEvento(evento);
}

function CalendarioDia() {
  const { fecha } = useParams();
  const fechaValida = esFechaValidaIso(fecha);
  const hoy = hoyBoliviaIso();
  const esPasado = fechaValida && fecha < hoy;

  const { data, isPending, isError, refetch } = useEventos(
    { desde: fecha, hasta: fecha, porPagina: 50 },
    undefined,
    { enabled: fechaValida && !esPasado },
  );

  if (!fechaValida) {
    return <NoEncontrado />;
  }

  const tituloDia = etiquetaDiaEvento(fecha, { conAnio: true });
  const migaDia = etiquetaDiaEvento(fecha);
  const diaAnterior = sumarDiasIso(fecha, -1);
  const diaSiguiente = sumarDiasIso(fecha, 1);
  const mostrarAnterior = Boolean(diaAnterior) && diaAnterior >= hoy;

  const eventos = [...(data?.datos ?? [])].sort((a, b) =>
    a.fechaInicio.localeCompare(b.fechaInicio),
  );

  return (
    <>
      <title>{`${tituloDia} | Calendario | Parroquia Señor de la Exaltación`}</title>
      <meta
        name="description"
        content={`Celebraciones y actividades programadas para el ${tituloDia} en la Parroquia Señor de la Exaltación.`}
      />

      <EncabezadoPagina
        migas={[
          { texto: 'Inicio', enlace: '/' },
          { texto: 'Calendario', enlace: '/calendario' },
          { texto: migaDia },
        ]}
        eyebrow="Agenda del día"
        titulo={tituloDia}
        bajada="Celebraciones, encuentros y actividades programadas para esta fecha."
      >
        <nav aria-label="Navegación entre días" className="flex flex-wrap items-center gap-3">
          {mostrarAnterior && (
            <BotonEnlace to={`/calendario/dia/${diaAnterior}`} variante="secundario">
              <ArrowLeft size={16} aria-hidden="true" />
              Día anterior
            </BotonEnlace>
          )}
          <BotonEnlace to={`/calendario/dia/${diaSiguiente}`} variante="secundario">
            Día siguiente
            <ArrowRight size={16} aria-hidden="true" />
          </BotonEnlace>
          <BotonEnlace to="/calendario" variante="secundario">
            <Calendar size={16} aria-hidden="true" />
            Volver al calendario
          </BotonEnlace>
        </nav>
      </EncabezadoPagina>

      <Seccion fondo="blanco">
          {esPasado ? (
            <div className="max-w-xl">
              <SinResultados mensaje="Los eventos de días anteriores ya no se muestran en el calendario público." />
              <div className="mt-6">
                <BotonEnlace to="/calendario" variante="primario">
                  Ver próximos eventos
                </BotonEnlace>
              </div>
            </div>
          ) : isPending ? (
            <CargandoSeccion alturaMinima={240} etiqueta="Cargando eventos del día" lineas={4} />
          ) : isError ? (
            <ErrorSeccion
              mensaje="No pudimos cargar los eventos de este día."
              onReintentar={() => refetch()}
            />
          ) : eventos.length === 0 ? (
            <div className="max-w-xl">
              <SinResultados mensaje="No hay eventos programados para este día." />
              <div className="mt-6">
                <BotonEnlace to="/calendario" variante="secundario">
                  <ArrowLeft size={16} aria-hidden="true" />
                  Volver al calendario
                </BotonEnlace>
              </div>
            </div>
          ) : (
            <ol aria-label="Eventos del día" className="flex flex-col gap-4">
              {eventos.map((evento) => {
                const horario = horarioEnDia(evento, fecha);
                return (
                  <li key={evento.id}>
                    <article className="group relative flex flex-col justify-between gap-4 rounded-sm border border-sand bg-white p-6 transition-[border-color,transform] duration-150 hover:-translate-y-1 hover:border-gold focus-within:border-gold focus-within:ring-2 focus-within:ring-ink/25 md:flex-row md:items-center md:gap-8">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          {evento.categoria?.nombre && (
                            <span className="inline-flex items-center gap-1.5 font-body text-micro font-semibold uppercase tracking-[0.12em] text-muted">
                              <span
                                aria-hidden="true"
                                className="size-2 rounded-full"
                                style={{ backgroundColor: evento.categoria.colorHex ?? '#6b625d' }}
                              />
                              {evento.categoria.nombre}
                            </span>
                          )}
                          {horario && (
                            <span className="inline-flex items-center gap-1.5 font-body text-meta font-semibold text-ink lining-nums tabular-nums">
                              <Clock size={14} className="text-muted" aria-hidden="true" />
                              {horario}
                            </span>
                          )}
                        </div>

                        <h2 className="mt-2 font-display text-2xl font-semibold text-ink">
                          <Link
                            to={`/calendario/${evento.id}`}
                            className="after:absolute after:inset-0 focus-visible:outline-none"
                          >
                            {evento.titulo}
                          </Link>
                        </h2>

                        {evento.lugar && (
                          <p className="mt-2 flex items-center gap-1.5 font-body text-meta text-muted">
                            <MapPin size={15} className="shrink-0" aria-hidden="true" />
                            <span>{evento.lugar}</span>
                          </p>
                        )}

                        {evento.descripcion && (
                          <p className="mt-2 max-w-prose font-body text-meta text-muted">
                            {evento.descripcion}
                          </p>
                        )}
                      </div>

                      <span
                        aria-hidden="true"
                        className="inline-flex shrink-0 items-center gap-1.5 font-body text-meta font-semibold text-ink transition-transform duration-150 group-hover:translate-x-0.5"
                      >
                        Ver detalles
                        <ArrowRight size={16} />
                      </span>
                    </article>
                  </li>
                );
              })}
            </ol>
          )}
      </Seccion>
    </>
  );
}

export default CalendarioDia;
