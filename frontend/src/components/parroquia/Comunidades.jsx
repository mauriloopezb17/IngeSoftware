
import { MapPin, ArrowRight } from 'lucide-react';

import { anchoContenido } from './ElementosComunes.jsx';

import imagenParroquia from '../../assets/parroquia/imagenes/exterior-parroquia.webp';

import '../../styles/Comunidades.css';

const enlaceGoogleMaps =
  'https://www.google.com/maps/dir/?api=1&destination=-16.5267952%2C-68.1082157';

const comunidades = [
  {
    nombre: 'Señor de la Exaltación',
    tipo: 'Parroquia',
    ubicacion: 'Av. Héctor Ormachea, Obrajes, La Paz',
    imagen: imagenParroquia,
    principal: true,
    enlace: enlaceGoogleMaps,
  },
  {
    nombre: 'de la Resurrección',
    tipo: 'Parroquia',
    ubicacion: 'La Paz',
    imagen: null,
    principal: false,
    enlace: null,
  },
  {
    nombre: 'San Pablo de la Cruz',
    tipo: 'Capilla',
    ubicacion: 'La Paz',
    imagen: null,
    principal: false,
    enlace: null,
  },
];

function Comunidades() {
  return (
    <section id="comunidades" className="comunidades">
      <div className={anchoContenido}>
        <div className="comunidades-encabezado">
          <p className="eyebrow comunidades-etiqueta">
            Pasionistas en Bolivia
          </p>

          <h2 className="serif-title comunidades-titulo">
            Nuestras comunidades
          </h2>

          <p className="comunidades-descripcion">
            Una sola familia pasionista. Cada sede tiene su propio espacio
            dentro de pasionistas.org.bo
          </p>
        </div>

        <div className="comunidades-tarjetas">
          {comunidades.map((comunidad) => (
            <article
              key={comunidad.nombre}
              className={`comunidades-tarjeta ${
                comunidad.principal ? 'comunidades-tarjeta-principal' : ''
              }`}
            >
              <div className="comunidades-imagen-contenedor">
                {comunidad.imagen ? (
                  <img
                    src={comunidad.imagen}
                    alt={`Vista exterior de la Parroquia ${comunidad.nombre}`}
                    className="comunidades-imagen"
                    loading="lazy"
                  />
                ) : (
                  <div
                    className="comunidades-imagen-pendiente"
                    aria-hidden="true"
                  />
                )}
              </div>

              <div className="comunidades-tarjeta-contenido">
                <p className="comunidades-tipo">
                  {comunidad.tipo}
                </p>

                <h3 className="comunidades-nombre">
                  {comunidad.nombre}
                </h3>

                <p className="comunidades-ubicacion">
                  <MapPin size={14} />
                  {comunidad.ubicacion}
                </p>

                {comunidad.enlace ? (
                  <a
                    href={comunidad.enlace}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="comunidades-enlace"
                    aria-label={`Cómo llegar a ${comunidad.nombre} en Google Maps`}
                  >
                    Cómo llegar
                    <ArrowRight size={14} />
                  </a>
                ) : (
                  <span className="comunidades-enlace">
                    Visitar sitio
                    <ArrowRight size={14} />
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Comunidades;
