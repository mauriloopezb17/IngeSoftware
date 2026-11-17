import Contenedor from '../portal/Contenedor.jsx';
import EnlacePortal from './EnlacePortal.jsx';
import { IconoRedSocial } from './IconoDinamico.jsx';
import { ErrorSeccion } from './EstadoSeccion.jsx';
import { TIPOS_HORARIO } from '../../config/sede.js';
import { useHorarios, useSede } from '../../hooks/index.js';
import {
  abreviarEtiquetaDias,
  armarHrefGmail,
  armarHrefTelefono,
  formatearRangoHorario,
} from '../../utils/formatoPortal.js';
import logoBlanco from '../../assets/parroquia/logos/logo-horizontal-blanco.svg';

const ENLACES_PARROQUIA = [
  { texto: 'Quiénes somos', href: '/nosotros' },
  { texto: 'Nuestra historia', href: '/paginas/historia' },
  { texto: 'Comunidad y pastorales', href: '/comunidad' },
  { texto: 'Contacto y ubicación', href: '/contacto' },
];

const ENLACES_CELEBRACIONES = [
  { texto: 'Horarios de misa', href: '/horarios' },
  { texto: 'Sacramentos', href: '/sacramentos' },
  { texto: 'Bautismo', href: '/sacramentos/bautismo' },
  { texto: 'Matrimonio', href: '/sacramentos/matrimonio' },
];

const ENLACES_ACTUALIDAD = [
  { texto: 'Noticias', href: '/noticias' },
  { texto: 'Calendario', href: '/calendario' },
  { texto: 'Proclamas matrimoniales', href: '/proclamas' },
  { texto: 'Boletín parroquial', href: '/boletines' },
];

function construirLineasSecretaria(gruposHorarios, sede) {
  const lineas = [];
  const secretaria = gruposHorarios?.find(
    (grupo) => grupo.tipo?.nombre === TIPOS_HORARIO.SECRETARIA,
  );

  if (secretaria) {
    for (const fila of secretaria.filas) {
      const etiqueta = abreviarEtiquetaDias(fila.etiqueta);
      fila.horarios.forEach((horario, indice) => {
        const rango = formatearRangoHorario(horario.horaInicio, horario.horaFin);
        lineas.push({
          contenido: indice === 0 ? `${etiqueta}: ${rango}` : rango,
          href: null,
        });
      });
    }
  }

  if (sede?.telefono) {
    lineas.push({
      contenido: sede.telefono,
      href: armarHrefTelefono(sede.telefono),
    });
  }

  if (sede?.correo) {
    lineas.push({
      contenido: sede.correo,
      href: armarHrefGmail(sede.correo),
    });
  }

  return lineas;
}

function PiePagina() {
  const { data: sede, isError, refetch } = useSede();
  const { data: horarios } = useHorarios();

  const configuracion = sede?.configuracion ?? {};
  const redesSociales = sede?.redesSociales ?? [];
  const datosSecretaria = construirLineasSecretaria(horarios, sede);
  const anioActual = new Date().getFullYear();
  const textoCopyright =
    configuracion.textoCopyright ||
    `© ${anioActual} Parroquia Señor de la Exaltación · Pasionistas Bolivia`;

  return (
    <footer className="border-t border-white/10 bg-ink text-white">
      <Contenedor className="py-16 md:py-20">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <EnlacePortal
              to="/"
              aria-label="Ir al inicio de la página"
              className="inline-flex items-center py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              <img
                src={logoBlanco}
                alt={sede?.nombre || 'Parroquia Señor de la Exaltación'}
                width={239}
                height={134}
                className="h-16 w-auto md:h-20"
              />
            </EnlacePortal>

            {isError ? (
              <div className="mt-6">
                <ErrorSeccion
                  mensaje="No pudimos cargar los datos institucionales."
                  onReintentar={refetch}
                  oscuro
                  compacta
                />
              </div>
            ) : (
              configuracion.descripcionPie && (
                <p className="mt-5 max-w-sm font-body text-meta leading-relaxed text-muted-on-dark">
                  {configuracion.descripcionPie}
                </p>
              )
            )}

            {redesSociales.length > 0 && (
              <div className="mt-6 flex items-center gap-2" aria-label="Redes sociales">
                {redesSociales.map(({ nombre, url, icono }) => (
                  <a
                    key={nombre}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Abrir ${nombre}`}
                    title={nombre}
                    className="inline-flex size-11 items-center justify-center rounded-sm border border-white/15 text-white/85 transition-colors duration-150 hover:border-gold hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                  >
                    <IconoRedSocial nombre={icono} size={17} />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4 lg:col-span-8 lg:grid-cols-[1fr_1fr_1fr_1.45fr]">
            <div>
              <h3 className="font-body text-eyebrow font-semibold uppercase tracking-[0.2em] text-gold">
                Parroquia
              </h3>
              <ul className="mt-4 space-y-2.5">
                {ENLACES_PARROQUIA.map(({ texto, href }) => (
                  <li key={texto}>
                    <EnlacePortal
                      to={href}
                      className="inline-flex min-h-9 items-center font-body text-meta text-muted-on-dark transition-colors duration-150 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                    >
                      {texto}
                    </EnlacePortal>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-body text-eyebrow font-semibold uppercase tracking-[0.2em] text-gold">
                Celebraciones
              </h3>
              <ul className="mt-4 space-y-2.5">
                {ENLACES_CELEBRACIONES.map(({ texto, href }) => (
                  <li key={texto}>
                    <EnlacePortal
                      to={href}
                      className="inline-flex min-h-9 items-center font-body text-meta text-muted-on-dark transition-colors duration-150 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                    >
                      {texto}
                    </EnlacePortal>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-body text-eyebrow font-semibold uppercase tracking-[0.2em] text-gold">
                Actualidad
              </h3>
              <ul className="mt-4 space-y-2.5">
                {ENLACES_ACTUALIDAD.map(({ texto, href }) => (
                  <li key={texto}>
                    <EnlacePortal
                      to={href}
                      className="inline-flex min-h-9 items-center font-body text-meta text-muted-on-dark transition-colors duration-150 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                    >
                      {texto}
                    </EnlacePortal>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-body text-eyebrow font-semibold uppercase tracking-[0.2em] text-gold">
                Secretaría
              </h3>
              <ul className="mt-4 space-y-2.5">
                {datosSecretaria.map(({ contenido, href }) => {
                  const indiceArroba = contenido.indexOf('@');
                  return (
                    <li key={contenido}>
                      {href ? (
                        <a
                          href={href}
                          target={href.startsWith('https') ? '_blank' : undefined}
                          rel={href.startsWith('https') ? 'noopener noreferrer' : undefined}
                          className="inline-flex min-h-9 items-center font-body text-meta text-muted-on-dark transition-colors duration-150 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                        >
                          {indiceArroba > 0 ? (
                            <span>
                              {contenido.slice(0, indiceArroba + 1)}
                              <wbr />
                              {contenido.slice(indiceArroba + 1)}
                            </span>
                          ) : (
                            contenido
                          )}
                        </a>
                      ) : (
                        <span className="block font-body text-meta tabular-nums text-muted-on-dark">
                          {contenido}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-8 font-body text-meta text-muted-on-dark sm:flex-row sm:items-center sm:justify-between">
          <p>{textoCopyright}</p>
          {configuracion.textoCreditos && <p>{configuracion.textoCreditos}</p>}
        </div>
      </Contenedor>
    </footer>
  );
}

export default PiePagina;
