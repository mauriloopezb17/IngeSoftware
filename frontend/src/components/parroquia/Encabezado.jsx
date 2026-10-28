import { useState } from 'react';

import {
  Clock3,
  Phone,
  MessageCircle,
  Search,
  ArrowRight,
  Menu,
  X,
} from 'lucide-react';

import {
  FaFacebookF,
  FaInstagram,
  FaYoutube,
} from 'react-icons/fa';

import { anchoContenido } from './ElementosComunes.jsx';

import logoBlanco from '../../assets/parroquia/logos/logo-horizontal-blanco.svg';

import '../../styles/Encabezado.css';

const redesSociales = [
  {
    nombre: 'Facebook',
    enlace: 'https://www.facebook.com/profile.php?id=100064836665037',
    icono: FaFacebookF,
  },
  {
    nombre: 'Instagram',
    enlace: 'https://www.instagram.com/senor_de_la_exaltacion',
    icono: FaInstagram,
  },
  {
    nombre: 'YouTube',
    enlace: 'https://www.youtube.com/@ArquidiocesisdeLaPaz/videos',
    icono: FaYoutube,
  },
];

const enlacesNavegacion = [
  { nombre: 'Nosotros', enlace: '#nosotros' },
  { nombre: 'Sacramentos', enlace: '#sacramentos' },
  { nombre: 'Comunidad', enlace: '#comunidad' },
  { nombre: 'Noticias', enlace: '#noticias' },
  { nombre: 'Calendario', enlace: '#agenda' },
  { nombre: 'Contacto', enlace: '#contacto' },
];

const seccionesBusqueda = [
  {
    nombre: 'Inicio',
    descripcion: 'Portada de la parroquia',
    enlace: '#inicio',
    palabrasClave: 'portada principal',
  },
  {
    nombre: 'Nosotros',
    descripcion: 'Conoce nuestra parroquia',
    enlace: '#nosotros',
    palabrasClave: 'quienes somos historia parroco pasionistas',
  },
  {
    nombre: 'Horarios de misa',
    descripcion: 'Misas, confesiones y atención',
    enlace: '#horarios',
    palabrasClave: 'horarios misas confesiones adoracion secretaria',
  },
  {
    nombre: 'Sacramentos y catequesis',
    descripcion: 'Bautismo, comunión, confirmación y más',
    enlace: '#sacramentos',
    palabrasClave: 'bautismo comunion confirmacion matrimonio uncion requisitos',
  },
  {
    nombre: 'Calendario',
    descripcion: 'Próximos eventos parroquiales',
    enlace: '#agenda',
    palabrasClave: 'agenda actividades encuentros eventos',
  },
  {
    nombre: 'Vida parroquial',
    descripcion: 'Noticias y actividades de la parroquia',
    enlace: '#noticias',
    palabrasClave: 'noticias pastoral familiar publicaciones',
  },
  {
    nombre: 'Proclamas matrimoniales',
    descripcion: 'Avisos de próximos matrimonios',
    enlace: '#proclamas',
    palabrasClave: 'bodas matrimonio proclamas',
  },
  {
    nombre: 'Video institucional',
    descripcion: 'Recorrido por nuestro templo',
    enlace: '#video-institucional',
    palabrasClave: 'video templo recorrido',
  },
  {
    nombre: 'Grupos y pastorales',
    descripcion: 'Participa en nuestra comunidad',
    enlace: '#comunidad',
    palabrasClave: 'grupos monaguillos coro catequistas pastoral',
  },
  {
    nombre: 'Nuestras comunidades',
    descripcion: 'Sedes y comunidades pasionistas',
    enlace: '#comunidades',
    palabrasClave: 'comunidades sedes capillas',
  },
  {
    nombre: 'Contacto',
    descripcion: 'Dirección, teléfono y Messenger',
    enlace: '#contacto',
    palabrasClave: 'contacto ubicacion direccion correo telefono messenger',
  },
];

const normalizarTexto = (texto) =>
  texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

function Encabezado() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [buscadorAbierto, setBuscadorAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const cerrarMenu = () => {
    setMenuAbierto(false);
    setBuscadorAbierto(false);
    setBusqueda('');
  };

  const alternarBuscador = () => {
    setBuscadorAbierto((actual) => !actual);
    setBusqueda('');
    setMenuAbierto(false);
  };

  const termino = normalizarTexto(busqueda);

  const resultados = termino
    ? seccionesBusqueda.filter((seccion) =>
        normalizarTexto(
          `${seccion.nombre} ${seccion.descripcion} ${seccion.palabrasClave}`
        ).includes(termino)
      )
    : seccionesBusqueda;

  const buscarSeccion = (evento) => {
    evento.preventDefault();

    if (!termino || resultados.length === 0) return;

    const destino = resultados[0].enlace;

    cerrarMenu();

    window.location.hash = destino;
  };

  return (
    <div
      className="encabezado"
      onKeyDown={(evento) => {
        if (evento.key === 'Escape') cerrarMenu();
      }}
    >
      {/* Barra superior */}
      <div className="encabezado-superior">
        <div className={`${anchoContenido} encabezado-superior-contenido`}>
          <div className="encabezado-aviso">
            <Clock3 size={15} />

            <span>
              Hoy, sábado: Santa Misa 7:00 · 18:00
              {' '}(vespertina dominical)
            </span>
          </div>

          <div className="encabezado-contactos">
            <a
              href="tel:+59122784937"
              className="encabezado-contacto"
              aria-label="Llamar a la parroquia"
            >
              <Phone size={15} />
              <span>(2) 278 4937</span>
            </a>

            <span
              className="encabezado-whatsapp"
              title="Número de WhatsApp pendiente de confirmación"
            >
              <MessageCircle size={15} />
              <span>WhatsApp Secretaría</span>
            </span>

            <span className="encabezado-separador" />

            <div className="encabezado-redes">
              {redesSociales.map(({ nombre, enlace, icono: Icono }) => (
                <a
                  key={nombre}
                  href={enlace}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Visitar ${nombre}`}
                  title={nombre}
                >
                  <Icono size={15} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Navegación principal */}
      <header className={`${anchoContenido} encabezado-principal`}>
        <a
          href="#inicio"
          className="encabezado-logo-enlace"
          onClick={cerrarMenu}
          aria-label="Volver al inicio"
        >
          <img
            src={logoBlanco}
            alt="Parroquia Señor de la Exaltación"
            className="encabezado-logo"
          />
        </a>

        <nav
          id="menu-navegacion"
          className={`encabezado-navegacion ${
            menuAbierto ? 'encabezado-navegacion-abierta' : ''
          }`}
          aria-label="Navegación principal"
        >
          {enlacesNavegacion.map(({ nombre, enlace }) => (
            <a
              key={nombre}
              href={enlace}
              className="encabezado-enlace"
              onClick={cerrarMenu}
            >
              {nombre}
            </a>
          ))}
        </nav>

        <div className="encabezado-acciones">
          <button
            type="button"
            className="encabezado-buscar"
            onClick={alternarBuscador}
            aria-label={buscadorAbierto ? 'Cerrar buscador' : 'Buscar en la página'}
            aria-expanded={buscadorAbierto}
            aria-controls="buscador-parroquia"
            title="Buscar en la página"
          >
            {buscadorAbierto ? <X size={19} /> : <Search size={19} />}
          </button>

          <a
            href="#horarios"
            className="encabezado-boton-horarios"
            onClick={cerrarMenu}
          >
            Horarios de misa
            <ArrowRight size={17} />
          </a>

          <button
            type="button"
            className="encabezado-boton-menu"
            onClick={() => {
              setMenuAbierto((actual) => !actual);
                        setBuscadorAbierto(false);
            }}
            aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuAbierto}
            aria-controls="menu-navegacion"
          >
            {menuAbierto ? <X size={23} /> : <Menu size={23} />}
            <span>Menú</span>
          </button>
        </div>
      </header>

      {/* Buscador de secciones */}
      {buscadorAbierto && (
        <div
          id="buscador-parroquia"
          className="encabezado-buscador-panel"
        >
          <form
            className="encabezado-buscador-formulario"
            onSubmit={buscarSeccion}
            role="search"
          >
            <Search size={19} />

            <input
              type="search"
              className="encabezado-buscador-input"
              placeholder="Buscar horarios, sacramentos, comunidad..."
              aria-label="Buscar secciones de la parroquia"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              autoFocus
            />

            <button
              type="submit"
              className="encabezado-buscador-enviar"
              disabled={!termino || resultados.length === 0}
            >
              Buscar
              <ArrowRight size={16} />
            </button>
          </form>

          <div className="encabezado-buscador-resultados">
            <p className="encabezado-buscador-etiqueta">
              {termino ? 'Resultados de búsqueda' : 'Explorar secciones'}
            </p>

            {resultados.length > 0 ? (
              resultados.map((seccion) => (
                <a
                  key={seccion.enlace}
                  href={seccion.enlace}
                  className="encabezado-buscador-resultado"
                  onClick={cerrarMenu}
                >
                  <span>
                    <strong>{seccion.nombre}</strong>
                    <small>{seccion.descripcion}</small>
                  </span>

                  <ArrowRight size={16} />
                </a>
              ))
            ) : (
              <p className="encabezado-buscador-vacio">
                No encontramos esa sección. Prueba con otra palabra.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Encabezado;
