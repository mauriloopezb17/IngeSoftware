import { ArrowRight, CalendarDays, Clock3, Download, FileText, MapPin, Megaphone } from 'lucide-react';

import {
  BotonEnlace,
  EncabezadoSeccion,
  EnlaceFlecha,
  Reveal,
  Seccion,
} from '../portal/index.js';
import EnlacePortal from './EnlacePortal.jsx';
import { CargandoSeccion, ErrorSeccion, SinResultados } from './EstadoSeccion.jsx';
import { useBoletines, useEventos, usePublicaciones } from '../../hooks/index.js';
import {
  formatearDiaMes,
  formatearFechaCorta,
  formatearHoraEvento,
  formatearTamanoArchivo,
} from '../../utils/formatoPortal.js';

function Agenda() {
  const {
    data: respuestaEventos,
    isPending: cargandoEventos,
    isError: errorEventos,
    refetch: reintentarEventos,
  } = useEventos({ porPagina: 4 });

  const {
    data: respuestaAvisos,
    isPending: cargandoAvisos,
    isError: errorAvisos,
    refetch: reintentarAvisos,
  } = usePublicaciones({ tipo: 'AVISO', porPagina: 3 });

  const {
    data: respuestaBoletines,
    isPending: cargandoBoletin,
    isError: errorBoletin,
    refetch: reintentarBoletin,
  } = useBoletines({ porPagina: 1 });

  const eventos = respuestaEventos?.datos ?? [];
  const avisos = respuestaAvisos?.datos ?? [];
  const boletin = respuestaBoletines?.datos?.[0] ?? null;

  return (
    <Seccion id="agenda" fondo="blanco">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <EncabezadoSeccion
            eyebrow="Agenda parroquial"
            titulo="Próximos eventos"
            accion={<EnlaceFlecha to="/calendario">Ver calendario completo</EnlaceFlecha>}
          />

          <div id="agenda-eventos">
            {cargandoEventos ? (
              <CargandoSeccion alturaMinima={320} etiqueta="Cargando próximos eventos" />
            ) : errorEventos ? (
              <ErrorSeccion
                mensaje="No pudimos cargar los próximos eventos."
                onReintentar={reintentarEventos}
              />
            ) : eventos.length === 0 ? (
              <SinResultados mensaje="No hay próximos eventos programados." />
            ) : (
              <div className="divide-y divide-sand border-y border-sand">
                {eventos.map((evento, indice) => {
                  const { dia, mes } = formatearDiaMes(evento.fechaInicio);
                  const horaTexto = formatearHoraEvento(evento);

                  return (
                    <Reveal
                      key={evento.id}
                      variante="tarjeta"
                      retraso={indice * 120}
                      as="article"
                      className="group relative -mx-3 flex flex-col gap-4 rounded-sm px-3 py-6 transition-colors duration-150 hover:bg-cream focus-within:bg-cream focus-within:ring-2 focus-within:ring-ink/25 sm:flex-row sm:items-center sm:gap-6"
                    >
                      <div className="flex w-20 shrink-0 items-baseline gap-2 sm:flex-col sm:items-center sm:gap-0 sm:border-r sm:border-sand sm:pr-6">
                        <span className="font-display text-h2 font-semibold lining-nums tabular-nums text-ink">
                          {dia}
                        </span>
                        <span className="font-body text-eyebrow font-semibold uppercase tracking-[0.2em] text-muted">
                          {mes}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        {evento.categoria?.nombre && (
                          <p className="mb-1 inline-flex items-center gap-2 font-body text-meta font-semibold text-ink">
                            {evento.categoria.colorHex && (
                              <span
                                aria-hidden="true"
                                className="inline-block size-2.5 rounded-full"
                                style={{ backgroundColor: evento.categoria.colorHex }}
                              />
                            )}
                            <span>{evento.categoria.nombre}</span>
                          </p>
                        )}

                        <h3 className="font-display text-h3 font-semibold text-ink">
                          <EnlacePortal
                            to={`/calendario/${evento.id}`}
                            className="after:absolute after:inset-0 focus-visible:outline-none"
                          >
                            {evento.titulo}
                          </EnlacePortal>
                        </h3>

                        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-body text-meta tabular-nums text-muted">
                          <span className="inline-flex items-center gap-1.5">
                            <Clock3 size={14} aria-hidden="true" />
                            <span>{horaTexto}</span>
                          </span>
                          {evento.lugar && (
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin size={14} aria-hidden="true" />
                              <span>{evento.lugar}</span>
                            </span>
                          )}
                        </p>
                      </div>

                      <span
                        aria-hidden="true"
                        className="inline-flex shrink-0 items-center gap-1.5 font-body text-meta font-semibold text-ink transition-transform duration-150 group-hover:translate-x-0.5"
                      >
                        <span>Ver detalles</span>
                        <ArrowRight size={15} />
                      </span>
                    </Reveal>
                  );
                })}
              </div>
            )}
          </div>

          <p className="mt-6 flex items-center gap-2 font-body text-meta text-muted">
            <CalendarDays size={15} aria-hidden="true" />
            <span>
              Los eventos ya realizados se ocultan automáticamente. Sincronizado con el calendario de
              la secretaría.
            </span>
          </p>
        </div>

        <aside className="space-y-6 lg:col-span-4">
          <div className="rounded-md border border-sand bg-cream p-6">
            <div className="mb-4 flex items-center gap-2.5 border-b border-sand pb-3">
              <Megaphone size={18} aria-hidden="true" className="text-ink" />
              <h3 className="font-display text-h3 font-semibold text-ink">Avisos parroquiales</h3>
            </div>

            {cargandoAvisos ? (
              <CargandoSeccion alturaMinima={160} etiqueta="Cargando avisos parroquiales" />
            ) : errorAvisos ? (
              <ErrorSeccion
                mensaje="No pudimos cargar los avisos."
                onReintentar={reintentarAvisos}
                compacta
              />
            ) : avisos.length === 0 ? (
              <SinResultados mensaje="No hay avisos vigentes." compacta />
            ) : (
              <ul className="divide-y divide-sand">
                {avisos.map((aviso) => (
                  <li key={aviso.id} className="py-3.5 first:pt-1 last:pb-1">
                    <p className="font-body text-meta font-semibold tabular-nums text-muted">
                      {formatearFechaCorta(aviso.fechaPublicacion)}
                    </p>
                    <p className="mt-1 font-body text-body text-ink">{aviso.titulo}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {cargandoBoletin ? (
            <CargandoSeccion
              alturaMinima={180}
              etiqueta="Cargando boletín parroquial"
              oscuro
            />
          ) : errorBoletin ? (
            <ErrorSeccion
              mensaje="No pudimos cargar el boletín."
              onReintentar={reintentarBoletin}
              oscuro
              compacta
            />
          ) : (
            boletin && (
              <div className="rounded-md border border-white/10 bg-ink p-6 text-white">
                <div className="flex items-center gap-2.5 text-gold">
                  <FileText size={20} strokeWidth={1.8} aria-hidden="true" />
                  <p className="font-body text-eyebrow font-semibold uppercase tracking-[0.2em]">
                    Boletín parroquial
                  </p>
                </div>

                <h3 className="mt-3 font-display text-h3 font-semibold text-white">
                  {boletin.titulo}
                </h3>

                <p className="mt-2 font-body text-meta text-muted-on-dark">
                  Reflexiones, agenda del mes y noticias de nuestros grupos.
                  {boletin.archivo?.tamanoBytes
                    ? ` PDF · ${formatearTamanoArchivo(boletin.archivo.tamanoBytes)}`
                    : ''}
                </p>

                <div className="mt-5 flex flex-col gap-3">
                  {boletin.archivo?.url && (
                    <BotonEnlace to={boletin.archivo.url} variante="primarioOscuro">
                      <span>Descargar PDF</span>
                      <Download size={15} aria-hidden="true" />
                    </BotonEnlace>
                  )}

                  <EnlaceFlecha to="/boletines" oscuro>
                    Ver archivo de boletines
                  </EnlaceFlecha>
                </div>
              </div>
            )
          )}
        </aside>
      </div>
    </Seccion>
  );
}

export default Agenda;
