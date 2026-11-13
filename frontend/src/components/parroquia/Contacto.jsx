import {
  MapPin,
  Phone,
  MessageCircle,
  Mail,
  ArrowRight,
  Navigation,
} from 'lucide-react';

import { anchoContenido } from './ElementosComunes.jsx';
import { CargandoSeccion, ErrorSeccion, SinResultados } from './EstadoSeccion.jsx';
import { useSede } from '../../hooks/index.js';
import { armarHrefGmail, armarHrefTelefono } from '../../utils/formatoPortal.js';

import '../../styles/Contacto.css';

function Contacto() {
  const { data: sede, isPending, isError, refetch } = useSede();

  const configuracion = sede?.configuracion ?? {};
  const enlaceGoogleMaps = configuracion.enlaceComoLlegar;
  const enlaceMessenger = configuracion.enlaceMessenger;

  const informacionContacto = sede
    ? [
        sede.direccion && {
          titulo: 'Dirección',
          valor: sede.direccion,
          icono: MapPin,
          enlace: enlaceGoogleMaps,
        },
        sede.telefono && {
          titulo: 'Teléfono',
          valor: sede.telefono,
          icono: Phone,
          enlace: armarHrefTelefono(sede.telefono),
        },
        configuracion.textoMessenger && {
          titulo: 'Messenger',
          valor: configuracion.textoMessenger,
          icono: MessageCircle,
          enlace: enlaceMessenger,
        },
        sede.correo && {
          titulo: 'Correo',
          valor: sede.correo,
          icono: Mail,
          enlace: armarHrefGmail(sede.correo),
        },
      ].filter(Boolean)
    : [];

  return (
    <section id="contacto" className="contacto">
      <div className={`${anchoContenido} contacto-contenedor`}>
        {isPending ? (
          <div style={{ gridColumn: '1 / -1' }}>
            <CargandoSeccion alturaMinima={420} etiqueta="Cargando información de contacto" />
          </div>
        ) : isError ? (
          <div style={{ gridColumn: '1 / -1' }}>
            <ErrorSeccion
              mensaje="No pudimos cargar la información de contacto."
              onReintentar={refetch}
            />
          </div>
        ) : !sede ? (
          <div style={{ gridColumn: '1 / -1' }}>
            <SinResultados mensaje="No hay información de contacto disponible." />
          </div>
        ) : (
          <>
            <a
              href={enlaceGoogleMaps || '#contacto'}
              target={enlaceGoogleMaps ? '_blank' : undefined}
              rel={enlaceGoogleMaps ? 'noopener noreferrer' : undefined}
              className="contacto-mapa"
              aria-label={`Cómo llegar a la ${sede.nombre} en Google Maps`}
            >
              <div className="contacto-mapa-parque" />

              <div className="contacto-mapa-calle contacto-mapa-calle-uno" />
              <div className="contacto-mapa-calle contacto-mapa-calle-dos" />
              <div className="contacto-mapa-calle contacto-mapa-calle-tres" />
              <div className="contacto-mapa-calle contacto-mapa-calle-cuatro" />

              <div className="contacto-mapa-marcador">
                <span className="contacto-mapa-etiqueta">{sede.nombre}</span>

                <MapPin size={31} fill="#ffffff" strokeWidth={2.2} />
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
                {informacionContacto.map(({ titulo, valor, icono: Icono, enlace }) => {
                  const enlaceExterno = Boolean(enlace && enlace.startsWith('https'));

                  return (
                    <div key={titulo} className="contacto-dato">
                      <span className="contacto-dato-icono">
                        <Icono size={17} strokeWidth={1.8} />
                      </span>

                      <div>
                        <h3 className="contacto-dato-titulo">{titulo}</h3>

                        {enlace ? (
                          <a
                            href={enlace}
                            className="contacto-dato-valor contacto-dato-enlace"
                            target={enlaceExterno ? '_blank' : undefined}
                            rel={enlaceExterno ? 'noopener noreferrer' : undefined}
                          >
                            {valor}
                          </a>
                        ) : (
                          <span className="contacto-dato-valor">{valor}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {(enlaceMessenger || enlaceGoogleMaps) && (
                <div className="contacto-acciones">
                  {enlaceMessenger && (
                    <a
                      href={enlaceMessenger}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="contacto-boton-principal"
                    >
                      Escríbenos por Messenger
                      <MessageCircle size={16} />
                    </a>
                  )}

                  {enlaceGoogleMaps && (
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
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default Contacto;
