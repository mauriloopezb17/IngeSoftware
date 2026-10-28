
import {
  MapPin,
  Phone,
  MessageCircle,
  Mail,
  ArrowRight,
  Navigation,
} from 'lucide-react';

import { anchoContenido } from './ElementosComunes.jsx';

import '../../styles/Contacto.css';

const enlaceGoogleMaps =
  'https://www.google.com/maps/dir/?api=1&destination=-16.5267952%2C-68.1082157';

const enlaceFacebook =
  'https://www.facebook.com/profile.php?id=100064836665037';

const enlaceGmail =
  'https://mail.google.com/mail/?view=cm&fs=1&to=parroquia.exaltacion.obrajes%40gmail.com';

const informacionContacto = [
  {
    titulo: 'Dirección',
    valor: 'Av. Héctor Ormachea N.º 167, Obrajes, La Paz',
    icono: MapPin,
    enlace: enlaceGoogleMaps,
  },
  {
    titulo: 'Teléfono',
    valor: '(2) 2784937',
    icono: Phone,
    enlace: 'tel:+59122784937',
  },
  {
    titulo: 'Messenger',
    valor: 'Escríbenos por Facebook Messenger',
    icono: MessageCircle,
    enlace: enlaceFacebook,
  },
  {
    titulo: 'Correo',
    valor: 'parroquia.exaltacion.obrajes@gmail.com',
    icono: Mail,
    enlace: enlaceGmail,
  },
];

function Contacto() {
  return (
    <section id="contacto" className="contacto">
      <div className={`${anchoContenido} contacto-contenedor`}>
        <a
          href={enlaceGoogleMaps}
          target="_blank"
          rel="noopener noreferrer"
          className="contacto-mapa"
          aria-label="Cómo llegar a la Parroquia Señor de la Exaltación en Google Maps"
        >
          <div className="contacto-mapa-parque" />

          <div className="contacto-mapa-calle contacto-mapa-calle-uno" />
          <div className="contacto-mapa-calle contacto-mapa-calle-dos" />
          <div className="contacto-mapa-calle contacto-mapa-calle-tres" />
          <div className="contacto-mapa-calle contacto-mapa-calle-cuatro" />

          <div className="contacto-mapa-marcador">
            <span className="contacto-mapa-etiqueta">
              Parroquia Señor de la Exaltación
            </span>

            <MapPin
              size={31}
              fill="#ffffff"
              strokeWidth={2.2}
            />
          </div>
        </a>

        <div className="contacto-informacion">
          <p className="eyebrow">Contacto</p>

          <h2 className="serif-title contacto-titulo">
            Visítanos o
            <br />
            escríbenos
          </h2>

          <div className="contacto-datos">
            {informacionContacto.map(
              ({ titulo, valor, icono: Icono, enlace }) => {
                const enlaceExterno = enlace.startsWith('https');

                return (
                  <div key={titulo} className="contacto-dato">
                    <span className="contacto-dato-icono">
                      <Icono size={17} strokeWidth={1.8} />
                    </span>

                    <div>
                      <h3 className="contacto-dato-titulo">
                        {titulo}
                      </h3>

                      <a
                        href={enlace}
                        className="contacto-dato-valor contacto-dato-enlace"
                        target={enlaceExterno ? '_blank' : undefined}
                        rel={
                          enlaceExterno
                            ? 'noopener noreferrer'
                            : undefined
                        }
                      >
                        {valor}
                      </a>
                    </div>
                  </div>
                );
              }
            )}
          </div>

          <div className="contacto-acciones">
            <a
              href={enlaceFacebook}
              target="_blank"
              rel="noopener noreferrer"
              className="contacto-boton-principal"
            >
              Escríbenos por Messenger
              <MessageCircle size={16} />
            </a>

            <a
              href={enlaceGoogleMaps}
              target="_blank"
              rel="noopener noreferrer"
              className="contacto-boton-secundario"
            >
              Cómo llegar
              <Navigation size={16} />
              <ArrowRight size={15} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Contacto;
