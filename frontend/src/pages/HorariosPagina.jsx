import { Clock3, MessageCircle, Phone } from 'lucide-react';

import {
  BotonEnlace,
  EncabezadoPagina,
  EnlaceFlecha,
  Seccion,
} from '../components/portal/index.js';
import { CargandoSeccion, ErrorSeccion, SinResultados } from '../components/parroquia/EstadoSeccion.jsx';
import { TIPOS_HORARIO } from '../config/sede.js';
import { useHorarios, useSede } from '../hooks/index.js';
import {
  armarHrefTelefono,
  formatearRangoHorario,
  obtenerDiaSemanaBolivia,
} from '../utils/formatoPortal.js';

function TablaGrupoHorario({ grupo, diaHoy, nota }) {
  return (
    <article className="overflow-hidden rounded-md border border-sand bg-white">
      <header className="flex items-center justify-between gap-4 border-b border-sand bg-cream px-6 py-4">
        <h2 className="font-display text-h2 font-semibold text-ink">{grupo.tipo.nombre}</h2>
        <Clock3 size={20} aria-hidden="true" className="shrink-0 text-muted" />
      </header>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">{`Horarios de ${grupo.tipo.nombre}`}</caption>
          <thead>
            <tr className="border-b border-sand text-eyebrow uppercase tracking-[0.2em] text-muted">
              <th scope="col" className="px-6 py-3 font-semibold">
                Días
              </th>
              <th scope="col" className="px-6 py-3 font-semibold">
                Horarios
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand">
            {grupo.filas.map((fila) => {
              const esHoy = Array.isArray(fila.dias) && fila.dias.includes(diaHoy);
              return (
                <tr
                  key={fila.etiqueta}
                  className={esHoy ? 'bg-gold-soft/75' : 'bg-white'}
                >
                  <th scope="row" className="px-6 py-4 align-top font-body text-body font-semibold text-ink">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span>{fila.etiqueta}</span>
                      {esHoy && (
                        <span className="inline-flex items-center rounded-sm bg-gold px-2 py-0.5 font-body text-meta font-semibold text-ink">
                          Hoy
                        </span>
                      )}
                    </div>
                  </th>
                  <td className="px-6 py-4 align-top">
                    <ul className="flex flex-col gap-1.5">
                      {fila.horarios.map((h, indice) => (
                        <li key={`${fila.etiqueta}-${indice}`} className="flex flex-wrap items-baseline gap-x-3">
                          <span className="font-display text-h3 font-semibold tabular-nums text-ink">
                            {formatearRangoHorario(h.horaInicio, h.horaFin)}
                          </span>
                          {h.descripcion && (
                            <span className="font-body text-meta text-muted">{h.descripcion}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {nota && (
        <p className="border-t border-sand bg-cream/50 px-6 py-3 font-body text-meta text-muted">
          {nota}
        </p>
      )}
    </article>
  );
}

function HorariosPagina() {
  const { data: grupos = [], isPending, isError, refetch } = useHorarios();
  const { data: sede } = useSede();

  const configuracion = sede?.configuracion ?? {};
  const diaHoy = obtenerDiaSemanaBolivia();
  const telefono = sede?.telefono;
  const hrefTelefono = armarHrefTelefono(telefono);
  const whatsappUrl = sede?.whatsapp
    ? `https://wa.me/${sede.whatsapp.replace(/\D/g, '')}`
    : null;

  const notaPorTipo = (nombre) => {
    if (nombre === TIPOS_HORARIO.CONFESIONES || nombre === TIPOS_HORARIO.ADORACION) {
      return configuracion.horariosNotas?.confesionesAdoracion ?? null;
    }
    if (nombre === TIPOS_HORARIO.SECRETARIA) {
      return configuracion.horariosNotas?.secretaria ?? null;
    }
    return null;
  };

  return (
    <>
      <title>Horarios | Parroquia Señor de la Exaltación</title>
      <meta
        name="description"
        content="Horarios de Santa Misa, confesiones, adoración eucarística y secretaría parroquial en la Parroquia Señor de la Exaltación, Obrajes, La Paz."
      />

      <EncabezadoPagina
        migas={[{ texto: 'Inicio', enlace: '/' }, { texto: 'Horarios' }]}
        eyebrow="Celebraciones y atención"
        titulo="Horarios de misa y secretaría"
        bajada={
          configuracion.horariosIntroduccion ||
          'Horarios regulares de la parroquia. Las celebraciones especiales se publican en el calendario.'
        }
      />

      <Seccion fondo="blanco">
        {isPending ? (
          <CargandoSeccion alturaMinima={320} etiqueta="Cargando horarios" />
        ) : isError ? (
          <ErrorSeccion mensaje="No pudimos cargar los horarios." onReintentar={refetch} />
        ) : grupos.length === 0 ? (
          <SinResultados mensaje="No hay horarios publicados por el momento." />
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {grupos.map((grupo) => (
              <TablaGrupoHorario
                key={grupo.tipo?.id ?? grupo.tipo?.nombre}
                grupo={grupo}
                diaHoy={diaHoy}
                nota={notaPorTipo(grupo.tipo?.nombre)}
              />
            ))}
          </div>
        )}

        <aside className="mt-12 flex flex-col gap-6 rounded-md border border-sand bg-cream p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div className="max-w-xl">
            <h2 className="font-display text-h3 font-semibold text-ink">
              ¿Necesitas confirmar un horario o solicitar una intención de misa?
            </h2>
            <p className="mt-2 font-body text-body text-muted">
              Comunícate con nuestra secretaría parroquial o revisa el calendario para fechas
              litúrgicas especiales.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {telefono && (
              <BotonEnlace to={hrefTelefono} variante="primario">
                <Phone size={16} aria-hidden="true" />
                Llamar: {telefono}
              </BotonEnlace>
            )}
            {whatsappUrl && (
              <BotonEnlace to={whatsappUrl} variante="secundario">
                <MessageCircle size={16} aria-hidden="true" />
                {configuracion.textoWhatsapp || 'WhatsApp Secretaría'}
              </BotonEnlace>
            )}
            <EnlaceFlecha to="/calendario">Ver calendario</EnlaceFlecha>
          </div>
        </aside>
      </Seccion>
    </>
  );
}

export default HorariosPagina;
