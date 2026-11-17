import { ArrowRight, Mail, MapPin, MessageCircle, Navigation, Phone } from 'lucide-react';

import { BotonEnlace, EncabezadoSeccion, Seccion } from '../portal/index.js';
import { CargandoSeccion, ErrorSeccion, SinResultados } from './EstadoSeccion.jsx';
import { useSede } from '../../hooks/index.js';
import { armarHrefGmail, armarHrefTelefono } from '../../utils/formatoPortal.js';

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
    <Seccion id="contacto" fondo="blanco">
      {isPending ? (
        <CargandoSeccion alturaMinima={320} etiqueta="Cargando información de contacto" />
      ) : isError ? (
        <ErrorSeccion
          mensaje="No pudimos cargar la información de contacto."
          onReintentar={refetch}
        />
      ) : !sede ? (
        <SinResultados mensaje="No hay información de contacto disponible." />
      ) : (
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <div className="overflow-hidden rounded-md border border-sand bg-cream p-6 md:p-8">
              <p className="font-body text-eyebrow font-semibold uppercase tracking-[0.2em] text-muted">
                Ubicación
              </p>
              <h3 className="mt-2 font-display text-h3 font-semibold text-ink">{sede.nombre}</h3>
              {sede.ubicacion?.latitud != null && sede.ubicacion?.longitud != null && (
                <p className="mt-2 font-body text-meta tabular-nums text-muted">
                  Coordenadas: {sede.ubicacion.latitud}, {sede.ubicacion.longitud}
                </p>
              )}

              {enlaceGoogleMaps && (
                <div className="mt-6">
                  <BotonEnlace to={enlaceGoogleMaps} variante="primario">
                    <Navigation size={16} aria-hidden="true" />
                    <span>Cómo llegar en Google Maps</span>
                    <ArrowRight size={15} aria-hidden="true" />
                  </BotonEnlace>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-6">
            <EncabezadoSeccion eyebrow="Contacto" titulo="Visítanos o escríbenos" className="mb-6" />

            <dl className="divide-y divide-sand border-y border-sand">
              {informacionContacto.map(({ titulo, valor, icono: Icono, enlace }) => {
                const enlaceExterno = Boolean(enlace && enlace.startsWith('https'));
                return (
                  <div key={titulo} className="flex items-start gap-4 py-4">
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-sm bg-gold-soft text-ink">
                      <Icono size={18} strokeWidth={1.8} aria-hidden="true" />
                    </span>
                    <div>
                      <dt className="font-body text-meta font-semibold text-muted">{titulo}</dt>
                      <dd className="mt-1 font-body text-body text-ink">
                        {enlace ? (
                          <a
                            href={enlace}
                            target={enlaceExterno ? '_blank' : undefined}
                            rel={enlaceExterno ? 'noopener noreferrer' : undefined}
                            className="underline-offset-4 hover:underline"
                          >
                            {valor}
                          </a>
                        ) : (
                          valor
                        )}
                      </dd>
                    </div>
                  </div>
                );
              })}
            </dl>
          </div>
        </div>
      )}
    </Seccion>
  );
}

export default Contacto;
