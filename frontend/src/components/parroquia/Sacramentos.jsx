
import { ArrowRight } from 'lucide-react';

import {
  anchoContenido,
  TituloSeccion,
} from './ElementosComunes.jsx';

import { sacramentos } from '../../data/datosParroquia.js';

import '../../styles/Sacramentos.css';

function AnillosMatrimonio({ size = 24, strokeWidth = 1.8 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="9" cy="14" r="5" />
      <circle cx="15" cy="14" r="5" />
      <path d="M12 5 14 3 16 5 14 7Z" />
      <path d="M14 7v2" />
    </svg>
  );
}

function Sacramentos() {
  return (
    <section id="sacramentos" className="sacramentos">
      <div className={anchoContenido}>
        <div className="sacramentos-encabezado">
          <TituloSeccion
            overline="Servicios parroquiales"
            title="Sacramentos y catequesis"
            description="Encuentra los requisitos, fechas de preparación y documentos necesarios para cada sacramento. Todo en un solo lugar."
            center
          />
        </div>

        <div className="sacramentos-tarjetas">
          {sacramentos.map(({ name, icon: Icono, text }) => (
            <article key={name} className="sacramentos-tarjeta">
              <div className="sacramentos-icono">
                {Icono ? (
                  <Icono size={24} strokeWidth={1.8} />
                ) : (
                  <AnillosMatrimonio size={24} strokeWidth={1.8} />
                )}
              </div>

              <h3 className="sacramentos-tarjeta-titulo">
                {name}
              </h3>

              <p className="sacramentos-tarjeta-descripcion">
                {text}
              </p>

              <a
                href="#contacto"
                className="sacramentos-enlace"
                aria-label={`Consultar requisitos de ${name}`}
              >
                Ver requisitos
                <ArrowRight size={15} />
              </a>
            </article>
          ))}
        </div>

        <div className="sacramentos-acciones">
          <a href="#contacto" className="sacramentos-boton">
            Ver todos los requisitos
            <ArrowRight size={16} />
          </a>
        </div>
      </div>
    </section>
  );
}

export default Sacramentos;
