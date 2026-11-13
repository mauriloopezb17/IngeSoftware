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

import { anchoContenido } from './ElementosComunes.jsx';
import EnlacePortal from './EnlacePortal.jsx';
import { IconoRedSocial } from './IconoDinamico.jsx';
import { useMenuPaginas, useSede } from '../../hooks/index.js';
import { armarHrefTelefono } from '../../utils/formatoPortal.js';

import logoBlanco from '../../assets/parroquia/logos/logo-horizontal-blanco.svg';

import '../../styles/Encabezado.css';

const enlacesNavegacion = [
  { nombre: 'Nosotros', enlace: '/#nosotros' },
  { nombre: 'Sacramentos', enlace: '/#sacramentos' },
  { nombre: 'Comunidad', enlace: '/#comunidad' },
  { nombre: 'Noticias', enlace: '/noticias' },
  { nombre: 'Calendario', enlace: '/calendario' },
  { nombre: 'Proclamas', enlace: '/proclamas' },
  { nombre: 'Boletines', enlace: '/boletines' },
  { nombre: 'Contacto', enlace: '/#contacto' },
];

const seccionesBusqueda = [
  {
    nombre: 'Inicio',
    descripcion: 'Portada de la parroquia',
    enlace: '/#inicio',
    palabrasClave: 'portada principal',
  },
  {
    nombre: 'Nosotros',
    descripcion: 'Conoce nuestra parroquia',
    enlace: '/#nosotros',
    palabrasClave: 'quienes somos historia parroco pasionistas',
  },
  {
    nombre: 'Horarios de misa',
    descripcion: 'Misas, confesiones y atención',
    enlace: '/#horarios',
    palabrasClave: 'horarios misas confesiones adoracion secretaria',
  },
  {
    nombre: 'Sacramentos y catequesis',
    descripcion: 'Bautismo, comunión, confirmación y más',
    enlace: '/#sacramentos',
    palabrasClave: 'bautismo comunion confirmacion matrimonio uncion requisitos',
  },
  {
    nombre: 'Calendario',
    descripcion: 'Calendario completo de eventos parroquiales',
    enlace: '/calendario',
    palabrasClave: 'agenda actividades encuentros eventos calendario',
  },
  {
    nombre: 'Boletines parroquiales',
    descripcion: 'Archivo mensual de boletines en PDF',
    enlace: '/boletines',
    palabrasClave: 'boletin boletines pdf archivo mensual',
  },
  {
    nombre: 'Vida parroquial y noticias',
    descripcion: 'Noticias y actividades de la parroquia',
    enlace: '/noticias',
    palabrasClave: 'noticias pastoral familiar publicaciones prensa',
  },
  {
    nombre: 'Proclamas matrimoniales',
    descripcion: 'Proclamas vigentes e historial público',
    enlace: '/proclamas',
    palabrasClave: 'bodas matrimonio proclamas historial',
  },
  {
    nombre: 'Video institucional',
    descripcion: 'Recorrido por nuestro templo',
    enlace: '/#video-institucional',
    palabrasClave: 'video templo recorrido',
  },
  {
    nombre: 'Grupos y pastorales',
    descripcion: 'Participa en nuestra comunidad',
    enlace: '/#comunidad',
    palabrasClave: 'grupos monaguillos coro catequistas pastoral',
  },
  {
    nombre: 'Nuestras comunidades',
    descripcion: 'Sedes y comunidades pasionistas',
    enlace: '/#comunidades',
    palabrasClave: 'comunidades sedes capillas',
  },
  {
    nombre: 'Contacto',
    descripcion: 'Dirección, teléfono y Messenger',
    enlace: '/#contacto',
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
  const { data: sede } = useSede();
  const { data: paginasMenu = [] } = useMenuPaginas();
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

  const enlacesMenuDinamico = paginasMenu
    .filter((pagina) => pagina.slug !== 'inicio' && pagina.slug !== 'nosotros')
    .map((pagina) => ({
      nombre: pagina.titulo,
      enlace: `/paginas/${pagina.slug}`,
    }));
  const todosEnlacesMenu = [...enlacesNavegacion, ...enlacesMenuDinamico];

  const configuracion = sede?.configuracion ?? {};
  const redesSociales = sede?.redesSociales ?? [];
  const telefono = sede?.telefono;
  const hrefTelefono = armarHrefTelefono(telefono);
  const textoBarraSuperior = configuracion.textoBarraSuperior;
  const textoWhatsapp = configuracion.textoWhatsapp;
  const whatsappUrl = sede?.whatsapp
    ? `https://wa.me/${sede.whatsapp.replace(/\D/g, '')}`
    : null;

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
            {textoBarraSuperior && (
              <>
                <Clock3 size={15} />
                <span>{textoBarraSuperior}</span>
              </>
            )}
          </div>

          <div className="encabezado-contactos">
            {telefono && (
              <a
                href={hrefTelefono}
                className="encabezado-contacto"
                aria-label="Llamar a la parroquia"
              >
                <Phone size={15} />
                <span>{telefono}</span>
              </a>
            )}

            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="encabezado-contacto"
                aria-label="Escribir por WhatsApp"
              >
                <MessageCircle size={15} />
                <span>{textoWhatsapp || 'WhatsApp Secretaría'}</span>
              </a>
            ) : (
              textoWhatsapp && (
                <span
                  className="encabezado-whatsapp"
                  title="Número de WhatsApp pendiente de confirmación"
                >
                  <MessageCircle size={15} />
                  <span>{textoWhatsapp}</span>
                </span>
              )
            )}

            {redesSociales.length > 0 && <span className="encabezado-separador" />}

            <div className="encabezado-redes">
              {redesSociales.map(({ nombre, url, icono }) => (
                <a
                  key={nombre}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Visitar ${nombre}`}
                  title={nombre}
                >
                  <IconoRedSocial nombre={icono} size={15} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Navegación principal */}
      <header className={`${anchoContenido} encabezado-principal`}>
        <EnlacePortal
          to="/"
          className="encabezado-logo-enlace"
          onClick={cerrarMenu}
          aria-label="Volver al inicio"
        >
          <img
            src={logoBlanco}
            alt="Parroquia Señor de la Exaltación"
            className="encabezado-logo"
          />
        </EnlacePortal>

        <nav
          id="menu-navegacion"
          className={`encabezado-navegacion ${
            menuAbierto ? 'encabezado-navegacion-abierta' : ''
          }`}
          aria-label="Navegación principal"
        >
          {todosEnlacesMenu.map(({ nombre, enlace }) => (
            <EnlacePortal
              key={enlace}
              to={enlace}
              className="encabezado-enlace"
              onClick={cerrarMenu}
            >
              {nombre}
            </EnlacePortal>
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
            href="/#horarios"
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
                <EnlacePortal
                  key={seccion.enlace}
                  to={seccion.enlace}
                  className="encabezado-buscador-resultado"
                  onClick={cerrarMenu}
                >
                  <span>
                    <strong>{seccion.nombre}</strong>
                    <small>{seccion.descripcion}</small>
                  </span>

                  <ArrowRight size={16} />
                </EnlacePortal>
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
