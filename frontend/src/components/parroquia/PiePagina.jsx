import { anchoContenido } from './ElementosComunes.jsx';
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

import '../../styles/PiePagina.css';

const enlacesParroquia = [
  { texto: 'Quiénes somos', href: '#nosotros' },
  { texto: 'Nuestra historia', href: '#nosotros' },
  { texto: 'El párroco', href: '#nosotros' },
  { texto: 'Nuestras sedes', href: '#comunidades' },
  { texto: 'Noticias', href: '#noticias' },
];

const enlacesServicios = [
  { texto: 'Horarios de misa', href: '#horarios' },
  { texto: 'Sacramentos', href: '#sacramentos' },
  { texto: 'Proclamas matrimoniales', href: '#proclamas' },
  { texto: 'Calendario', href: '#agenda' },
  { texto: 'Boletín parroquial', href: '#agenda' },
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

  return (
    <footer className="pie-pagina">
      <div className={anchoContenido}>
        <div className="pie-pagina-superior">
          <div className="pie-pagina-marca">
            <a
              href="#inicio"
              className="pie-pagina-logo-enlace"
              aria-label="Ir al inicio de la página"
            >
              <img
                src={logoBlanco}
                alt={sede?.nombre || 'Parroquia Señor de la Exaltación'}
                className="pie-pagina-logo"
              />
            </a>

            {isError ? (
              <ErrorSeccion
                mensaje="No pudimos cargar los datos institucionales."
                onReintentar={refetch}
                oscuro
                compacta
              />
            ) : (
              configuracion.descripcionPie && (
                <p className="pie-pagina-descripcion">{configuracion.descripcionPie}</p>
              )
            )}

            {redesSociales.length > 0 && (
              <div className="pie-pagina-redes" aria-label="Redes sociales">
                {redesSociales.map(({ nombre, url, icono }) => (
                  <a
                    key={nombre}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pie-pagina-red-social"
                    aria-label={`Abrir ${nombre}`}
                    title={nombre}
                  >
                    <IconoRedSocial nombre={icono} size={18} />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="pie-pagina-columnas">
            <div className="pie-pagina-columna">
              <h3 className="pie-pagina-columna-titulo">La parroquia</h3>

              <ul className="pie-pagina-lista">
                {enlacesParroquia.map(({ texto, href }) => (
                  <li key={texto}>
                    <a href={href} className="pie-pagina-enlace">
                      {texto}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pie-pagina-columna">
              <h3 className="pie-pagina-columna-titulo">Servicios</h3>

              <ul className="pie-pagina-lista">
                {enlacesServicios.map(({ texto, href }) => (
                  <li key={texto}>
                    <a href={href} className="pie-pagina-enlace">
                      {texto}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pie-pagina-columna">
              <h3 className="pie-pagina-columna-titulo">Secretaría</h3>

              <ul className="pie-pagina-lista">
                {datosSecretaria.map(({ contenido, href }) => (
                  <li key={contenido}>
                    {href ? (
                      <a
                        href={href}
                        target={href.startsWith('https') ? '_blank' : undefined}
                        rel={href.startsWith('https') ? 'noopener noreferrer' : undefined}
                        className="pie-pagina-enlace"
                      >
                        {contenido}
                      </a>
                    ) : (
                      <span className="pie-pagina-texto">{contenido}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="pie-pagina-inferior">
          {configuracion.textoCopyright && (
            <p className="pie-pagina-copy">{configuracion.textoCopyright}</p>
          )}

          {configuracion.textoCreditos && (
            <p className="pie-pagina-creditos">{configuracion.textoCreditos}</p>
          )}
        </div>
      </div>
    </footer>
  );
}

export default PiePagina;
