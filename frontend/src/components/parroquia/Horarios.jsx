import { Church, Clock3, Cross } from 'lucide-react';

import {
  EncabezadoSeccion,
  EnlaceFlecha,
  Seccion,
} from '../portal/index.js';
import { CargandoSeccion, ErrorSeccion, SinResultados } from './EstadoSeccion.jsx';
import { TIPOS_HORARIO } from '../../config/sede.js';
import { useHorarios, useSede } from '../../hooks/index.js';
import { formatearRangoHorario, obtenerDiaSemanaBolivia } from '../../utils/formatoPortal.js';

function formatearFilaHorarios(fila, diaHoy, marcarDescripcion = false) {
  const textoHoras = fila.horarios
    .map((h) => {
      const rango = formatearRangoHorario(h.horaInicio, h.horaFin);
      return marcarDescripcion && h.descripcion ? `${rango}*` : rango;
    })
    .join(' · ');

  const esHoy = Array.isArray(fila.dias) && fila.dias.includes(diaHoy);
  return { etiqueta: fila.etiqueta, horas: textoHoras, esHoy };
}

function construirTarjetasHorarios(grupos, configuracion, diaHoy) {
  if (!grupos || grupos.length === 0) return [];

  const tarjetas = [];
  const porNombre = (nombre) => grupos.find((grupo) => grupo.tipo?.nombre === nombre);

  const santaMisa = porNombre(TIPOS_HORARIO.SANTA_MISA);
  if (santaMisa) {
    const notaMisa = santaMisa.filas
      .flatMap((fila) => fila.horarios)
      .find((h) => h.descripcion)?.descripcion;

    tarjetas.push({
      title: santaMisa.tipo.nombre,
      icon: Cross,
      rows: santaMisa.filas.map((fila) => formatearFilaHorarios(fila, diaHoy, Boolean(notaMisa))),
      note: notaMisa ? `* ${notaMisa}` : null,
    });
  }

  const confesiones = porNombre(TIPOS_HORARIO.CONFESIONES);
  const adoracion = porNombre(TIPOS_HORARIO.ADORACION);
  if (confesiones || adoracion) {
    const rows = [
      ...(confesiones
        ? confesiones.filas.map((fila) => formatearFilaHorarios(fila, diaHoy))
        : []),
      ...(adoracion
        ? adoracion.filas.map((fila) => {
            const formateada = formatearFilaHorarios(fila, diaHoy);
            return {
              ...formateada,
              etiqueta: `${fila.etiqueta} · ${adoracion.tipo.nombre}`,
            };
          })
        : []),
    ];

    tarjetas.push({
      title:
        confesiones && adoracion
          ? `${confesiones.tipo.nombre} y ${adoracion.tipo.nombre}`
          : (confesiones || adoracion).tipo.nombre,
      icon: Church,
      rows,
      note: configuracion.horariosNotas?.confesionesAdoracion ?? null,
    });
  }

  const secretaria = porNombre(TIPOS_HORARIO.SECRETARIA);
  if (secretaria) {
    const rows = secretaria.filas.map((fila) => formatearFilaHorarios(fila, diaHoy));
    if (configuracion.horariosWhatsappSecretaria) {
      rows.push({
        etiqueta: 'WhatsApp',
        horas: configuracion.horariosWhatsappSecretaria,
        esHoy: false,
      });
    }

    tarjetas.push({
      title: 'Secretaría parroquial',
      icon: Clock3,
      rows,
      note: configuracion.horariosNotas?.secretaria ?? null,
    });
  }

  return tarjetas;
}

function Horarios() {
  const { data: grupos, isPending, isError, refetch } = useHorarios();
  const { data: sede } = useSede();

  const configuracion = sede?.configuracion ?? {};
  const diaHoy = obtenerDiaSemanaBolivia();
  const tarjetas = construirTarjetasHorarios(grupos, configuracion, diaHoy);
  const introduccion =
    configuracion.horariosIntroduccion ||
    'Horarios regulares de la parroquia. Las celebraciones especiales se publican en el calendario.';

  return (
    <Seccion id="horarios" fondo="tinta">
      <EncabezadoSeccion
        oscuro
        eyebrow="Horarios"
        titulo="Celebra la fe con nosotros"
        bajada={introduccion}
        accion={
          <EnlaceFlecha to="/horarios" oscuro>
            Ver todos los horarios
          </EnlaceFlecha>
        }
      />

      {isPending ? (
        <CargandoSeccion oscuro alturaMinima={260} etiqueta="Cargando horarios" />
      ) : isError ? (
        <ErrorSeccion
          oscuro
          mensaje="No pudimos cargar los horarios."
          onReintentar={refetch}
        />
      ) : tarjetas.length === 0 ? (
        <SinResultados oscuro mensaje="No hay horarios publicados por el momento." />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {tarjetas.map(({ title, icon: Icono, rows, note }) => (
            <article
              key={title}
              className="flex flex-col justify-between rounded-md border border-white/10 bg-ink-soft p-6 md:p-8"
            >
              <div>
                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-sm bg-gold text-ink">
                    <Icono size={20} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <h3 className="font-display text-h3 font-semibold text-white">{title}</h3>
                </div>

                <dl className="mt-4 divide-y divide-white/10">
                  {rows.map(({ etiqueta, horas, esHoy }) => (
                    <div
                      key={etiqueta}
                      className={`flex flex-col gap-1 py-3.5 ${
                        esHoy ? '-mx-3 rounded-sm bg-gold/10 px-3' : ''
                      }`}
                    >
                      <dt className="flex items-center gap-2 font-body text-meta font-semibold text-muted-on-dark">
                        <span>{etiqueta}</span>
                        {esHoy && (
                          <span className="rounded-sm bg-gold px-2 py-0.5 font-body text-meta font-semibold text-ink">
                            Hoy
                          </span>
                        )}
                      </dt>
                      <dd className="font-display text-h3 font-semibold tabular-nums text-white">
                        {horas}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              {note && (
                <p className="mt-4 border-t border-white/10 pt-3 font-body text-meta text-muted-on-dark">
                  {note}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </Seccion>
  );
}

export default Horarios;
