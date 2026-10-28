
import {
  FaFacebookF,
  FaInstagram,
  FaYoutube,
} from 'react-icons/fa';

import { anchoContenido } from './ElementosComunes.jsx';

import logoBlanco from '../../assets/parroquia/logos/logo-horizontal-blanco.svg';

import '../../styles/PiePagina.css';

const enlaceGmail =
  'https://mail.google.com/mail/?view=cm&fs=1&to=parroquia.exaltacion.obrajes%40gmail.com';

const enlacesParroquia = [
  {
    texto: 'Quiénes somos',
    href: '#nosotros',
  },
  {
    texto: 'Nuestra historia',
    href: '#nosotros',
  },
  {
    texto: 'El párroco',
    href: '#nosotros',
  },
  {
    texto: 'Nuestras sedes',
    href: '#comunidades',
  },
  {
    texto: 'Noticias',
    href: '#noticias',
  },
];

const enlacesServicios = [
  {
    texto: 'Horarios de misa',
    href: '#horarios',
  },
  {
    texto: 'Sacramentos',
    href: '#sacramentos',
  },
  {
    texto: 'Proclamas matrimoniales',
    href: '#proclamas',
  },
  {
    texto: 'Calendario',
    href: '#agenda',
  },
  {
    texto: 'Boletín parroquial',
    href: '#agenda',
  },
];

const enlacesRedes = [
  {
    nombre: 'Facebook',
    href: 'https://www.facebook.com/profile.php?id=100064836665037',
    icono: FaFacebookF,
  },
  {
    nombre: 'Instagram',
    href: 'https://www.instagram.com/senor_de_la_exaltacion',
    icono: FaInstagram,
  },
  {
    nombre: 'YouTube',
    href: 'https://www.youtube.com/@ArquidiocesisdeLaPaz/videos',
    icono: FaYoutube,
  },
];

const datosSecretaria = [
  {
    contenido: 'Lun – Vie: 9:00 – 12:00',
    href: null,
  },
  {
    contenido: '15:00 – 19:30',
    href: null,
  },
  {
    contenido: 'Sábado: 9:00 – 12:00',
    href: null,
  },
  {
    contenido: '(2) 278 4937',
    href: 'tel:+59122784937',
  },
  {
    contenido: 'parroquia.exaltacion.obrajes@gmail.com',
    href: enlaceGmail,
  },
];

function PiePagina() {
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
                alt="Parroquia Señor de la Exaltación Obrajes"
                className="pie-pagina-logo"
              />
            </a>

            <p className="pie-pagina-descripcion">
              Parroquia confiada a la Congregación de la Pasión de
              Jesucristo (Pasionistas). Arquidiócesis de La Paz ·
              Vicaría Sur.
            </p>

            <div
              className="pie-pagina-redes"
              aria-label="Redes sociales"
            >
              {enlacesRedes.map(({ nombre, href, icono: Icono }) => (
                <a
                  key={nombre}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pie-pagina-red-social"
                  aria-label={`Abrir ${nombre}`}
                  title={nombre}
                >
                  <Icono size={18} />
                </a>
              ))}
            </div>
          </div>

          <div className="pie-pagina-columnas">
            <div className="pie-pagina-columna">
              <h3 className="pie-pagina-columna-titulo">
                La parroquia
              </h3>

              <ul className="pie-pagina-lista">
                {enlacesParroquia.map(({ texto, href }) => (
                  <li key={texto}>
                    <a
                      href={href}
                      className="pie-pagina-enlace"
                    >
                      {texto}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pie-pagina-columna">
              <h3 className="pie-pagina-columna-titulo">
                Servicios
              </h3>

              <ul className="pie-pagina-lista">
                {enlacesServicios.map(({ texto, href }) => (
                  <li key={texto}>
                    <a
                      href={href}
                      className="pie-pagina-enlace"
                    >
                      {texto}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pie-pagina-columna">
              <h3 className="pie-pagina-columna-titulo">
                Secretaría
              </h3>

              <ul className="pie-pagina-lista">
                {datosSecretaria.map(({ contenido, href }) => (
                  <li key={contenido}>
                    {href ? (
                      <a
                        href={href}
                        target={
                          href.startsWith('https')
                            ? '_blank'
                            : undefined
                        }
                        rel={
                          href.startsWith('https')
                            ? 'noopener noreferrer'
                            : undefined
                        }
                        className="pie-pagina-enlace"
                      >
                        {contenido}
                      </a>
                    ) : (
                      <span className="pie-pagina-texto">
                        {contenido}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="pie-pagina-inferior">
          <p className="pie-pagina-copy">
            © 2026 Parroquia Señor de la Exaltación · Pasionistas
            Bolivia · pasionistas.org.bo
          </p>

          <p className="pie-pagina-creditos">
            Diseño y desarrollo: CodeForge · Ingeniería de Sistemas UCB
          </p>
        </div>
      </div>
    </footer>
  );
}

export default PiePagina;
