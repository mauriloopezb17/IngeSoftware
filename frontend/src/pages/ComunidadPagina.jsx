import { Clock3, MessageCircle, Phone } from 'lucide-react';

import {
  BotonEnlace,
  EncabezadoPagina,
  EnlaceFlecha,
  Reveal,
  Seccion,
} from '../components/portal/index.js';
import { CargandoSeccion, ErrorSeccion, SinResultados } from '../components/parroquia/EstadoSeccion.jsx';
import { IconoDinamico } from '../components/parroquia/IconoDinamico.jsx';
import { useGruposPastorales, useSede } from '../hooks/index.js';
import { armarHrefTelefono } from '../utils/formatoPortal.js';

function ComunidadPagina() {
  const { data: grupos = [], isPending, isError, refetch } = useGruposPastorales();
  const { data: sede } = useSede();

  const telefono = sede?.telefono;
  const hrefTelefono = armarHrefTelefono(telefono);
  const whatsappUrl = sede?.whatsapp
    ? `https://wa.me/${sede.whatsapp.replace(/\D/g, '')}`
    : null;

  return (
    <>
      <title>Comunidad y pastorales | Parroquia Señor de la Exaltación</title>
      <meta
        name="description"
        content="Grupos pastorales, movimientos y servicios comunitarios de la Parroquia Señor de la Exaltación en Obrajes, La Paz."
      />

      <EncabezadoPagina
        migas={[{ texto: 'Inicio', enlace: '/' }, { texto: 'Comunidad' }]}
        eyebrow="Vida comunitaria"
        titulo="Grupos y pastorales"
        bajada="Hay un lugar para ti. Niños, jóvenes, familias y adultos mayores encuentran aquí un espacio para servir, formarse y crecer en la fe."
      />

      <Seccion fondo="blanco">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="rounded-md border border-sand bg-cream p-6 lg:sticky lg:top-28">
              <h2 className="font-display text-h3 font-semibold text-ink">
                ¿Quieres participar en un grupo?
              </h2>
              <p className="mt-3 font-body text-body text-muted">
                Acércate a la secretaría parroquial o al finalizar cualquiera de las reuniones para
                recibir información e integrarte.
              </p>

              <div className="mt-6 flex flex-col gap-3">
                {telefono && (
                  <BotonEnlace to={hrefTelefono} variante="primario">
                    <Phone size={16} aria-hidden="true" />
                    Llamar: {telefono}
                  </BotonEnlace>
                )}
                {whatsappUrl && (
                  <BotonEnlace to={whatsappUrl} variante="secundario">
                    <MessageCircle size={16} aria-hidden="true" />
                    {sede?.configuracion?.textoWhatsapp || 'WhatsApp Secretaría'}
                  </BotonEnlace>
                )}
                <EnlaceFlecha to="/contacto">Ver horarios y dirección</EnlaceFlecha>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8">
            {isPending ? (
              <CargandoSeccion alturaMinima={280} etiqueta="Cargando grupos pastorales" />
            ) : isError ? (
              <ErrorSeccion
                mensaje="No pudimos cargar los grupos pastorales."
                onReintentar={refetch}
              />
            ) : grupos.length === 0 ? (
              <SinResultados mensaje="No hay grupos pastorales publicados por el momento." />
            ) : (
              <ul className="divide-y divide-sand border-y border-sand">
                {grupos.map((grupo, indice) => (
                  <li key={grupo.id}>
                    <Reveal
                      variante="tarjeta"
                      retraso={indice * 60}
                      className="flex flex-col gap-4 py-6 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="flex items-start gap-4">
                        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-sm bg-gold-soft text-ink">
                          <IconoDinamico nombre={grupo.icono} size={20} strokeWidth={1.8} />
                        </span>

                        <div>
                          <h2 className="font-display text-h3 font-semibold text-ink">
                            {grupo.nombre}
                          </h2>
                          {grupo.descripcion && (
                            <p className="mt-1 max-w-prose font-body text-body text-muted">
                              {grupo.descripcion}
                            </p>
                          )}
                          {grupo.contacto && (
                            <p className="mt-2 font-body text-meta text-muted">
                              Contacto: {grupo.contacto}
                            </p>
                          )}
                        </div>
                      </div>

                      {grupo.horarioReunion && (
                        <p className="inline-flex shrink-0 items-center gap-2 rounded-sm bg-cream px-3 py-1.5 font-body text-meta font-medium text-ink">
                          <Clock3 size={14} aria-hidden="true" />
                          <span>{grupo.horarioReunion}</span>
                        </p>
                      )}
                    </Reveal>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Seccion>
    </>
  );
}

export default ComunidadPagina;
