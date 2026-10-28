
import { anchoContenido, TituloSeccion } from './ElementosComunes.jsx';
import { horarios } from '../../data/datosParroquia.js';

import '../../styles/Horarios.css';

function Horarios() {
  return (
    <section id="horarios" className="horarios">
      <div className={anchoContenido}>
        <div className="horarios-encabezado">
          <TituloSeccion
            overline="Horarios"
            title="Celebra la fe con nosotros"
            light
          />

          <p className="horarios-introduccion">
            Horarios regulares de la parroquia. Las celebraciones
            especiales se publican en el calendario.
          </p>
        </div>

        <div className="horarios-tarjetas">
          {horarios.map(({ title, icon: Icono, rows, note }) => (
            <article key={title} className="horarios-tarjeta">
              <div className="horarios-tarjeta-encabezado">
                <Icono
                  className="horarios-icono"
                  size={23}
                  strokeWidth={1.8}
                />

                <h3 className="horarios-tarjeta-titulo">
                  {title}
                </h3>
              </div>

              <div className="horarios-lista">
                {rows.map(([dia, hora]) => (
                  <div key={dia} className="horarios-fila">
                    <p className="horarios-dia">
                      {dia}
                    </p>

                    <p className="horarios-hora">
                      {hora}
                    </p>
                  </div>
                ))}
              </div>

              {note && (
                <p className="horarios-nota">
                  {note}
                </p>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Horarios;
