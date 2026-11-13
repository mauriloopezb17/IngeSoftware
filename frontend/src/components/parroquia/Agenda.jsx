import {
  ChevronRight,
  Megaphone,
  FileText,
  ArrowRight,
  CalendarDays,
  Clock3,
  MapPin,
  Download,
} from 'lucide-react';

import { anchoContenido } from './ElementosComunes.jsx';
import { CargandoSeccion, ErrorSeccion, SinResultados } from './EstadoSeccion.jsx';
import { useBoletines, useEventos, usePublicaciones } from '../../hooks/index.js';
import {
  formatearDiaMes,
  formatearFechaCorta,
  formatearHoraEvento,
  formatearTamanoArchivo,
} from '../../utils/formatoPortal.js';

import '../../styles/Agenda.css';

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
    <section id="agenda" className="agenda">
      <div className={`${anchoContenido} agenda-contenedor`}>
        <div className="agenda-principal">
          <p className="eyebrow">Agenda parroquial</p>

          <div className="agenda-encabezado">
            <h2 className="serif-title agenda-titulo">Próximos eventos</h2>

            <a href="#agenda-eventos" className="agenda-calendario">
              Ver calendario completo
              <ArrowRight size={15} />
            </a>
          </div>

          <div id="agenda-eventos" className="agenda-eventos">
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
              eventos.map((evento) => {
                const { dia, mes } = formatearDiaMes(evento.fechaInicio);
                const horaTexto = formatearHoraEvento(evento);

                return (
                  <article key={evento.id} className="agenda-evento">
                    <div className="agenda-fecha">
                      <span className="agenda-fecha-dia">{dia}</span>

                      <span className="agenda-fecha-mes">{mes}</span>
                    </div>

                    <div className="agenda-evento-informacion">
                      {evento.categoria?.nombre && (
                        <p className="agenda-evento-categoria">
                          {evento.categoria.nombre}
                        </p>
                      )}

                      <h3 className="agenda-evento-titulo">{evento.titulo}</h3>

                      <p className="agenda-evento-detalle">
                        <Clock3 size={13} />
                        {horaTexto}

                        {evento.lugar && (
                          <>
                            <span className="agenda-evento-separador">·</span>
                            <MapPin size={13} />
                            {evento.lugar}
                          </>
                        )}
                      </p>
                    </div>

                    <ChevronRight
                      className="agenda-evento-flecha"
                      size={19}
                      aria-hidden="true"
                    />
                  </article>
                );
              })
            )}
          </div>

          <p className="agenda-nota">
            <CalendarDays size={14} />
            Los eventos ya realizados se ocultan automáticamente. Sincronizado
            con el calendario de la secretaría.
          </p>
        </div>

        <aside className="agenda-lateral">
          <div className="agenda-avisos">
            <div className="agenda-avisos-encabezado">
              <Megaphone size={19} />

              <h3>Avisos parroquiales</h3>
            </div>

            {cargandoAvisos ? (
              <CargandoSeccion
                alturaMinima={190}
                etiqueta="Cargando avisos parroquiales"
                compacta
              />
            ) : errorAvisos ? (
              <ErrorSeccion
                mensaje="No pudimos cargar los avisos."
                onReintentar={reintentarAvisos}
                compacta
              />
            ) : avisos.length === 0 ? (
              <SinResultados mensaje="No hay avisos vigentes." compacta />
            ) : (
              avisos.map((aviso) => (
                <div key={aviso.id} className="agenda-aviso">
                  <p className="agenda-aviso-fecha">
                    {formatearFechaCorta(aviso.fechaPublicacion)}
                  </p>

                  <p className="agenda-aviso-texto">{aviso.titulo}</p>
                </div>
              ))
            )}
          </div>

          {cargandoBoletin ? (
            <CargandoSeccion
              alturaMinima={190}
              etiqueta="Cargando boletín parroquial"
              oscuro
              compacta
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
              <div className="agenda-boletin">
                <FileText size={26} strokeWidth={1.7} />

                <p className="agenda-boletin-etiqueta">Boletín parroquial</p>

                <h3 className="agenda-boletin-titulo">{boletin.titulo}</h3>

                <p className="agenda-boletin-descripcion">
                  Reflexiones, agenda del mes y noticias de nuestros grupos.
                  {boletin.archivo?.tamanoBytes
                    ? ` PDF · ${formatearTamanoArchivo(boletin.archivo.tamanoBytes)}`
                    : ''}
                </p>

                {boletin.archivo?.url ? (
                  <a
                    href={boletin.archivo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="agenda-boletin-boton"
                  >
                    Descargar PDF
                    <Download size={15} />
                  </a>
                ) : (
                  <span className="agenda-boletin-boton visual-control">
                    Descargar PDF
                    <Download size={15} />
                  </span>
                )}
              </div>
            )
          )}
        </aside>
      </div>
    </section>
  );
}

export default Agenda;
