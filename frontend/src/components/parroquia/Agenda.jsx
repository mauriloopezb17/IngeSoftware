
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
import { eventos, avisos } from '../../data/datosParroquia.js';

import '../../styles/Agenda.css';

function Agenda() {
  return (
    <section id="agenda" className="agenda">
      <div className={`${anchoContenido} agenda-contenedor`}>
        <div className="agenda-principal">
          <p className="eyebrow">Agenda parroquial</p>

          <div className="agenda-encabezado">
            <h2 className="serif-title agenda-titulo">
              Próximos eventos
            </h2>

            <a href="#agenda-eventos" className="agenda-calendario">
              Ver calendario completo
              <ArrowRight size={15} />
            </a>
          </div>

          <div id="agenda-eventos" className="agenda-eventos">
            {eventos.map((evento) => (
              <article
                key={`${evento.day}-${evento.month}-${evento.title}`}
                className="agenda-evento"
              >
                <div className="agenda-fecha">
                  <span className="agenda-fecha-dia">
                    {evento.day}
                  </span>

                  <span className="agenda-fecha-mes">
                    {evento.month}
                  </span>
                </div>

                <div className="agenda-evento-informacion">
                  <p className="agenda-evento-categoria">
                    {evento.tag}
                  </p>

                  <h3 className="agenda-evento-titulo">
                    {evento.title}
                  </h3>

                  <p className="agenda-evento-detalle">
                    <Clock3 size={13} />
                    {evento.hora}

                    <span className="agenda-evento-separador">·</span>

                    <MapPin size={13} />
                    {evento.lugar}
                  </p>
                </div>

                <ChevronRight
                  className="agenda-evento-flecha"
                  size={19}
                  aria-hidden="true"
                />
              </article>
            ))}
          </div>

          <p className="agenda-nota">
            <CalendarDays size={14} />
            Los eventos ya realizados se ocultan automáticamente.
            Sincronizado con el calendario de la secretaría.
          </p>
        </div>

        <aside className="agenda-lateral">
          <div className="agenda-avisos">
            <div className="agenda-avisos-encabezado">
              <Megaphone size={19} />

              <h3>Avisos parroquiales</h3>
            </div>

            {avisos.map(([fecha, texto]) => (
              <div key={fecha} className="agenda-aviso">
                <p className="agenda-aviso-fecha">
                  {fecha}
                </p>

                <p className="agenda-aviso-texto">
                  {texto}
                </p>
              </div>
            ))}
          </div>

          <div className="agenda-boletin">
            <FileText size={26} strokeWidth={1.7} />

            <p className="agenda-boletin-etiqueta">
              Boletín parroquial
            </p>

            <h3 className="agenda-boletin-titulo">
              Edición de octubre 2026
            </h3>

            <p className="agenda-boletin-descripcion">
              Reflexiones, agenda del mes y noticias de nuestros grupos.
              PDF · 2,4 MB
            </p>

            <span className="agenda-boletin-boton visual-control">
              Descargar PDF
              <Download size={15} />
            </span>
          </div>
        </aside>
      </div>
    </section>
  );
}

export default Agenda;
