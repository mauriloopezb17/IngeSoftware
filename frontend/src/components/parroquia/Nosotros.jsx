
import {
  anchoContenido,
  TituloSeccion,
} from './ElementosComunes.jsx';

import imagenCrucifijo from '../../assets/parroquia/imagenes/crucifijo.webp';
import imagenParroco from '../../assets/parroquia/imagenes/padre_gregorio.jpg';

import '../../styles/Nosotros.css';

function Nosotros() {
  return (
    <section id="nosotros" className="nosotros">
      <div className={`${anchoContenido} nosotros-contenedor`}>
        <div className="nosotros-imagen-contenedor">
          <div className="nosotros-marco" />

          <img
            src={imagenCrucifijo}
            alt="Crucifijo en el interior de la Parroquia Señor de la Exaltación"
            className="nosotros-imagen"
            loading="lazy"
          />

          <div className="nosotros-tarjeta">
            <p className="nosotros-tarjeta-etiqueta">
              Congregación de la Pasión
            </p>

            <p className="nosotros-tarjeta-titulo">
              Pasionistas · C.P.
            </p>

            <p className="nosotros-tarjeta-descripcion">
              Fundada por San Pablo de la Cruz
            </p>
          </div>
        </div>

        <div className="nosotros-informacion">
          <TituloSeccion
            overline="Quiénes somos"
            title="Una casa de oración en el corazón de Obrajes"
          />

          <p className="nosotros-descripcion">
            Somos una comunidad parroquial confiada a los Padres
            Pasionistas, que desde la memoria de la Pasión de Cristo
            acompaña a las familias de Obrajes en la fe, los sacramentos
            y el servicio a los más necesitados.
          </p>

          <blockquote className="nosotros-cita">
            <p className="nosotros-cita-texto">
              “Que la Pasión de Jesucristo esté siempre grabada en
              nuestros corazones.”
            </p>

            <cite className="nosotros-cita-autor">
              — Lema de la Congregación Pasionista
            </cite>
          </blockquote>

          <div className="nosotros-pie">
            <div className="nosotros-parroco">
              <div className="nosotros-avatar">
                <img
                  src={imagenParroco}
                  alt="P. Gregorio, C.P., párroco"
                  className="nosotros-avatar-imagen"
                  loading="lazy"
                />
              </div>

              <div>
                <p className="nosotros-parroco-nombre">
                  P. Gregorio, C.P.
                </p>

                <p className="nosotros-parroco-cargo">
                  Párroco
                </p>
              </div>
            </div>

            <span className="nosotros-boton visual-control">
              Conoce nuestra historia
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Nosotros;
