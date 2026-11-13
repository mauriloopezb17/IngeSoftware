import { Cross, Church, Clock3 } from 'lucide-react';

import { anchoContenido, TituloSeccion } from './ElementosComunes.jsx';
import { CargandoSeccion, ErrorSeccion, SinResultados } from './EstadoSeccion.jsx';
import { TIPOS_HORARIO } from '../../config/sede.js';
import { useHorarios, useSede } from '../../hooks/index.js';
import { formatearRangoHorario } from '../../utils/formatoPortal.js';

import '../../styles/Horarios.css';

function formatearFilaHorarios(fila, marcarDescripcion = false) {
  const textoHoras = fila.horarios
    .map((h) => {
      const rango = formatearRangoHorario(h.horaInicio, h.horaFin);
      return marcarDescripcion && h.descripcion ? `${rango}*` : rango;
    })
    .join(' · ');

  return [fila.etiqueta, textoHoras];
}

function construirTarjetasHorarios(grupos, configuracion) {
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
      rows: santaMisa.filas.map((fila) => formatearFilaHorarios(fila, Boolean(notaMisa))),
      note: notaMisa ? `* ${notaMisa}` : null,
    });
  }

  const confesiones = porNombre(TIPOS_HORARIO.CONFESIONES);
  const adoracion = porNombre(TIPOS_HORARIO.ADORACION);
  if (confesiones || adoracion) {
    const filas = [
      ...(confesiones ? confesiones.filas.map((fila) => formatearFilaHorarios(fila)) : []),
      ...(adoracion
        ? adoracion.filas.map((fila) => {
            const [, horas] = formatearFilaHorarios(fila);
            return [`${fila.etiqueta} · ${adoracion.tipo.nombre}`, horas];
          })
        : []),
    ];

    tarjetas.push({
      title:
        confesiones && adoracion
          ? `${confesiones.tipo.nombre} y ${adoracion.tipo.nombre}`
          : (confesiones || adoracion).tipo.nombre,
      icon: Church,
      rows: filas,
      note: configuracion.horariosNotas?.confesionesAdoracion ?? null,
    });
  }

  const secretaria = porNombre(TIPOS_HORARIO.SECRETARIA);
  if (secretaria) {
    const filas = secretaria.filas.map((fila) => formatearFilaHorarios(fila));
    if (configuracion.horariosWhatsappSecretaria) {
      filas.push(['WhatsApp', configuracion.horariosWhatsappSecretaria]);
    }

    tarjetas.push({
      title: 'Secretaría parroquial',
      icon: Clock3,
      rows: filas,
      note: configuracion.horariosNotas?.secretaria ?? null,
    });
  }

  return tarjetas;
}

function Horarios() {
  const { data: grupos, isPending, isError, refetch } = useHorarios();
  const { data: sede } = useSede();

  const configuracion = sede?.configuracion ?? {};
  const tarjetas = construirTarjetasHorarios(grupos, configuracion);
  const introduccion =
    configuracion.horariosIntroduccion ||
    'Horarios regulares de la parroquia. Las celebraciones especiales se publican en el calendario.';

  return (
    <section id="horarios" className="horarios">
      <div className={anchoContenido}>
        <div className="horarios-encabezado">
          <TituloSeccion
            overline="Horarios"
            title="Celebra la fe con nosotros"
            light
          />

          <p className="horarios-introduccion">{introduccion}</p>
        </div>

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
          <div className="horarios-tarjetas">
            {tarjetas.map(({ title, icon: Icono, rows, note }) => (
              <article key={title} className="horarios-tarjeta">
                <div className="horarios-tarjeta-encabezado">
                  <Icono className="horarios-icono" size={23} strokeWidth={1.8} />

                  <h3 className="horarios-tarjeta-titulo">{title}</h3>
                </div>

                <div className="horarios-lista">
                  {rows.map(([dia, hora]) => (
                    <div key={dia} className="horarios-fila">
                      <p className="horarios-dia">{dia}</p>

                      <p className="horarios-hora">{hora}</p>
                    </div>
                  ))}
                </div>

                {note && <p className="horarios-nota">{note}</p>}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default Horarios;
