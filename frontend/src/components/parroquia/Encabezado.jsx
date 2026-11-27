import { useEffect, useId, useRef, useState } from 'react';
import { NavLink, useInRouterContext, useLocation } from 'react-router';
import { ChevronDown, Clock3, Menu, MessageCircle, Phone, X } from 'lucide-react';

import Contenedor from '../portal/Contenedor.jsx';
import EnlacePortal from './EnlacePortal.jsx';
import { BuscadorEncabezado, BuscadorMovil } from './buscador/BuscadorEncabezado.jsx';
import { IconoRedSocial } from './IconoDinamico.jsx';
import { useMenuPaginas, useSede } from '../../hooks/index.js';
import { armarHrefTelefono } from '../../utils/formatoPortal.js';
import logoBlanco from '../../assets/parroquia/logos/logo-horizontal-blanco.svg';

const ENLACES_ACTUALIDAD = [
  { nombre: 'Noticias', enlace: '/noticias' },
  { nombre: 'Calendario', enlace: '/calendario' },
  { nombre: 'Proclamas', enlace: '/proclamas' },
  { nombre: 'Boletines', enlace: '/boletines' },
];

function EnlaceNavPortal({ to, children, onClick, className = '' }) {
  const enRouter = useInRouterContext();

  if (!enRouter) {
    return (
      <a
        href={to}
        onClick={onClick}
        className={`relative inline-flex min-h-11 items-center px-3 py-2 font-body text-button font-semibold text-white/90 transition-colors duration-150 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${className}`.trim()}
      >
        {children}
      </a>
    );
  }

  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `relative inline-flex min-h-11 items-center px-3 py-2 font-body text-button font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
          isActive ? 'text-white' : 'text-white/85 hover:text-white'
        } ${className}`.trim()
      }
    >
      {({ isActive }) => (
        <>
          <span>{children}</span>
          {isActive && (
            <span aria-hidden="true" className="absolute inset-x-3 bottom-1.5 h-[2px] bg-gold" />
          )}
        </>
      )}
    </NavLink>
  );
}

function MenuDesplegable({ titulo, enlaces, activo = false, abierto, alAlternar, alCerrar }) {
  const idMenu = useId();
  const contenedorRef = useRef(null);
  const botonRef = useRef(null);

  useEffect(() => {
    if (!abierto) return undefined;

    const alClicFuera = (evento) => {
      if (contenedorRef.current && !contenedorRef.current.contains(evento.target)) {
        alCerrar();
      }
    };

    const alTecla = (evento) => {
      if (evento.key === 'Escape') {
        alCerrar();
        botonRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', alClicFuera);
    document.addEventListener('keydown', alTecla);
    return () => {
      document.removeEventListener('mousedown', alClicFuera);
      document.removeEventListener('keydown', alTecla);
    };
  }, [abierto, alCerrar]);

  return (
    <div
      ref={contenedorRef}
      className="relative"
      onBlur={(evento) => {
        if (!contenedorRef.current?.contains(evento.relatedTarget)) {
          alCerrar();
        }
      }}
    >
      <button
        ref={botonRef}
        type="button"
        aria-expanded={abierto}
        aria-controls={idMenu}
        onClick={alAlternar}
        className={`relative inline-flex min-h-11 cursor-pointer items-center gap-1.5 px-3 py-2 font-body text-button font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
          activo || abierto ? 'text-white' : 'text-white/85 hover:text-white'
        }`}
      >
        <span>{titulo}</span>
        <ChevronDown
          size={15}
          aria-hidden="true"
          className={`transition-transform duration-150 ease-salida ${abierto ? 'rotate-180' : ''}`}
        />
        {activo && (
          <span aria-hidden="true" className="absolute inset-x-3 bottom-1.5 h-[2px] bg-gold" />
        )}
      </button>

      {abierto && (
        <div
          id={idMenu}
          className="absolute left-0 top-full z-50 mt-1 min-w-52 rounded-sm border border-sand bg-white py-1.5 text-ink shadow-soft"
        >
          {enlaces.map((item) => (
            <EnlacePortal
              key={item.enlace}
              to={item.enlace}
              onClick={alCerrar}
              className="flex min-h-11 items-center px-4 py-2 font-body text-button font-medium text-ink transition-colors duration-150 hover:bg-cream focus-visible:bg-cream focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink"
            >
              {item.nombre}
            </EnlacePortal>
          ))}
        </div>
      )}
    </div>
  );
}

function EncabezadoBase({ transparente, rutaActual }) {
  const enRouter = useInRouterContext();
  const { data: sede } = useSede();
  const { data: paginasMenu = [] } = useMenuPaginas();

  const [cajonAbierto, setCajonAbierto] = useState(false);
  const [submenuAbierto, setSubmenuAbierto] = useState(null);
  const [actualidadMovilAbierta, setActualidadMovilAbierta] = useState(false);
  const [desplazado, setDesplazado] = useState(false);
  const [rutaAnterior, setRutaAnterior] = useState(rutaActual);

  if (rutaAnterior !== rutaActual) {
    setRutaAnterior(rutaActual);
    setCajonAbierto(false);
    setSubmenuAbierto(null);
  }

  const botonMenuRef = useRef(null);
  const botonCerrarRef = useRef(null);
  const cajonRef = useRef(null);
  const idMenuMovil = useId();

  useEffect(() => {
    if (!transparente || typeof window === 'undefined') return undefined;

    const actualizarScroll = () => {
      setDesplazado(window.scrollY > 36);
    };

    actualizarScroll();
    window.addEventListener('scroll', actualizarScroll, { passive: true });
    return () => window.removeEventListener('scroll', actualizarScroll);
  }, [transparente]);

  useEffect(() => {
    if (!cajonAbierto) return undefined;

    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    botonCerrarRef.current?.focus();

    const manejarTecla = (evento) => {
      if (evento.key === 'Escape') {
        setCajonAbierto(false);
        botonMenuRef.current?.focus();
        return;
      }

      if (evento.key === 'Tab' && cajonRef.current) {
        const enfocables = cajonRef.current.querySelectorAll(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (enfocables.length === 0) return;

        const primero = enfocables[0];
        const ultimo = enfocables[enfocables.length - 1];

        if (evento.shiftKey && document.activeElement === primero) {
          evento.preventDefault();
          ultimo.focus();
        } else if (!evento.shiftKey && document.activeElement === ultimo) {
          evento.preventDefault();
          primero.focus();
        }
      }
    };

    document.addEventListener('keydown', manejarTecla);
    return () => {
      document.body.style.overflow = overflowAnterior;
      document.removeEventListener('keydown', manejarTecla);
    };
  }, [cajonAbierto]);

  const paginasNosotros = paginasMenu
    .filter((pagina) => pagina.slug !== 'inicio' && pagina.slug !== 'nosotros')
    .map((pagina) => ({
      nombre: pagina.titulo,
      enlace: `/paginas/${pagina.slug}`,
    }));

  const enlacesNosotros = [
    { nombre: 'Quiénes somos', enlace: '/nosotros' },
    { nombre: 'Nuestras comunidades', enlace: '/comunidades' },
    ...paginasNosotros,
  ];

  const configuracion = sede?.configuracion ?? {};
  const redesSociales = sede?.redesSociales ?? [];
  const telefono = sede?.telefono;
  const hrefTelefono = armarHrefTelefono(telefono);
  const textoBarraSuperior = configuracion.textoBarraSuperior;
  const textoWhatsapp = configuracion.textoWhatsapp;
  const whatsappUrl = sede?.whatsapp
    ? `https://wa.me/${sede.whatsapp.replace(/\D/g, '')}`
    : null;

  const nosotrosActivo = rutaActual === '/nosotros' || rutaActual.startsWith('/paginas/');
  const actualidadActiva = ENLACES_ACTUALIDAD.some(
    (item) => rutaActual === item.enlace || rutaActual.startsWith(`${item.enlace}/`),
  );

  const cerrarTodo = () => {
    setCajonAbierto(false);
    setSubmenuAbierto(null);
  };

  const barraSolida = !transparente || desplazado;
  const claseBarraNavegacion = barraSolida
    ? 'bg-ink shadow-soft border-b border-white/10'
    : 'bg-transparent border-b border-white/10';

  return (
    <header className={transparente ? 'fixed inset-x-0 top-0 z-40' : 'sticky top-0 z-40'}>
      {/* Barra superior: en móvil solo teléfono y WhatsApp; en escritorio suma horarios resumidos y redes */}
      <div className="border-b border-white/10 bg-ink text-white">
        <Contenedor className="flex min-h-11 items-center justify-between gap-4 py-1 text-meta">
          <div className="hidden min-w-0 items-center gap-2 text-muted-on-dark md:flex">
            {textoBarraSuperior && (
              <>
                <Clock3 size={14} aria-hidden="true" className="shrink-0 text-gold" />
                <span className="truncate">{textoBarraSuperior}</span>
              </>
            )}
          </div>

          <div className="flex w-full items-center justify-between gap-4 md:w-auto md:justify-end">
            <div className="flex items-center gap-4">
              {telefono && (
                <a
                  href={hrefTelefono}
                  className="inline-flex min-h-11 items-center gap-1.5 text-white/90 transition-colors duration-150 hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold md:min-h-9"
                  aria-label={`Llamar a la parroquia al ${telefono}`}
                >
                  <Phone size={14} aria-hidden="true" className="text-gold" />
                  <span className="tabular-nums">{telefono}</span>
                </a>
              )}

              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-1.5 text-white/90 transition-colors duration-150 hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold md:min-h-9"
                  aria-label="Escribir por WhatsApp"
                >
                  <MessageCircle size={14} aria-hidden="true" className="text-gold" />
                  <span>{textoWhatsapp || 'WhatsApp Secretaría'}</span>
                </a>
              )}
            </div>

            {redesSociales.length > 0 && (
              <div className="hidden items-center gap-1 border-l border-white/15 pl-3 md:flex">
                {redesSociales.map(({ nombre, url, icono }) => (
                  <a
                    key={nombre}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Visitar ${nombre}`}
                    title={nombre}
                    className="inline-flex size-11 items-center justify-center rounded-sm text-white/80 transition-colors duration-150 hover:bg-white/10 hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold lg:size-9"
                  >
                    <IconoRedSocial nombre={icono} size={14} />
                  </a>
                ))}
              </div>
            )}
          </div>
        </Contenedor>
      </div>

      {/* Barra principal */}
      <div className={`transition-colors duration-200 ease-salida ${claseBarraNavegacion}`}>
        <Contenedor className="flex min-h-20 items-center justify-between gap-4 py-1.5">
          <EnlacePortal
            to="/"
            onClick={cerrarTodo}
            aria-label="Parroquia Señor de la Exaltación — Ir al inicio"
            className="inline-flex shrink-0 items-center py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            <img
              src={logoBlanco}
              alt="Parroquia Señor de la Exaltación"
              width={239}
              height={134}
              className="h-14 w-auto md:h-16"
            />
          </EnlacePortal>

          <nav aria-label="Navegación principal" className="hidden items-center gap-0.5 lg:flex">
            <MenuDesplegable
              titulo="Nosotros"
              enlaces={enlacesNosotros}
              activo={nosotrosActivo}
              abierto={submenuAbierto === 'nosotros'}
              alAlternar={() =>
                setSubmenuAbierto((actual) => (actual === 'nosotros' ? null : 'nosotros'))
              }
              alCerrar={() => setSubmenuAbierto((actual) => (actual === 'nosotros' ? null : actual))}
            />

            <EnlaceNavPortal to="/horarios">Horarios</EnlaceNavPortal>
            <EnlaceNavPortal to="/sacramentos">Sacramentos</EnlaceNavPortal>
            <EnlaceNavPortal to="/comunidad">Comunidad</EnlaceNavPortal>

            <MenuDesplegable
              titulo="Actualidad"
              enlaces={ENLACES_ACTUALIDAD}
              activo={actualidadActiva}
              abierto={submenuAbierto === 'actualidad'}
              alAlternar={() =>
                setSubmenuAbierto((actual) => (actual === 'actualidad' ? null : 'actualidad'))
              }
              alCerrar={() =>
                setSubmenuAbierto((actual) => (actual === 'actualidad' ? null : actual))
              }
            />

            <EnlaceNavPortal to="/contacto">Contacto</EnlaceNavPortal>
          </nav>

          <div className="flex items-center gap-3">
            {enRouter && <BuscadorEncabezado />}

            <button
              ref={botonMenuRef}
              type="button"
              onClick={() => setCajonAbierto(true)}
              aria-label="Abrir menú"
              aria-expanded={cajonAbierto}
              aria-controls={idMenuMovil}
              className="inline-flex size-11 cursor-pointer items-center justify-center rounded-sm bg-gold text-ink shadow-soft transition-colors duration-150 ease-salida hover:bg-gold-dark active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold lg:hidden"
            >
              <Menu size={22} aria-hidden="true" />
            </button>
          </div>
        </Contenedor>
      </div>

      {/* Menú móvil a pantalla completa */}
      {cajonAbierto && (
        <div
          id={idMenuMovil}
          ref={cajonRef}
          role="dialog"
          aria-modal="true"
          aria-label="Menú de navegación"
          className="fixed inset-0 z-50 flex flex-col overflow-y-auto overscroll-contain bg-ink text-white lg:hidden"
        >
          <Contenedor className="flex h-20 shrink-0 items-center justify-between border-b border-white/10">
            <EnlacePortal
              to="/"
              onClick={cerrarTodo}
              aria-label="Parroquia Señor de la Exaltación — Ir al inicio"
              className="inline-flex items-center py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              <img
                src={logoBlanco}
                alt="Parroquia Señor de la Exaltación"
                width={239}
                height={134}
                className="h-11 w-auto"
              />
            </EnlacePortal>

            <button
              ref={botonCerrarRef}
              type="button"
              onClick={() => {
                setCajonAbierto(false);
                botonMenuRef.current?.focus();
              }}
              aria-label="Cerrar menú"
              className="inline-flex size-11 cursor-pointer items-center justify-center rounded-sm border border-white/25 text-white transition-colors duration-150 hover:border-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              <X size={22} aria-hidden="true" />
            </button>
          </Contenedor>

          <Contenedor className="flex flex-1 flex-col justify-between py-6">
            <div>
              {enRouter && <BuscadorMovil alNavegar={cerrarTodo} />}
              <nav aria-label="Menú móvil" className="flex flex-col divide-y divide-white/10">
              <EnlacePortal
                to="/"
                onClick={cerrarTodo}
                className="flex min-h-[48px] items-center font-body text-lead font-medium text-white transition-colors hover:text-gold"
              >
                Inicio
              </EnlacePortal>

              {enlacesNosotros.map((item) => (
                <EnlacePortal
                  key={item.enlace}
                  to={item.enlace}
                  onClick={cerrarTodo}
                  className="flex min-h-[48px] items-center font-body text-lead font-medium text-white transition-colors hover:text-gold"
                >
                  {item.nombre}
                </EnlacePortal>
              ))}

              <EnlacePortal
                to="/horarios"
                onClick={cerrarTodo}
                className="flex min-h-[48px] items-center font-body text-lead font-medium text-white transition-colors hover:text-gold"
              >
                Horarios
              </EnlacePortal>

              <EnlacePortal
                to="/sacramentos"
                onClick={cerrarTodo}
                className="flex min-h-[48px] items-center font-body text-lead font-medium text-white transition-colors hover:text-gold"
              >
                Sacramentos
              </EnlacePortal>

              <EnlacePortal
                to="/comunidad"
                onClick={cerrarTodo}
                className="flex min-h-[48px] items-center font-body text-lead font-medium text-white transition-colors hover:text-gold"
              >
                Comunidad
              </EnlacePortal>

              <div>
                <button
                  type="button"
                  aria-expanded={actualidadMovilAbierta}
                  onClick={() => setActualidadMovilAbierta((abierta) => !abierta)}
                  className="flex min-h-[48px] w-full cursor-pointer items-center justify-between font-body text-lead font-medium text-white transition-colors hover:text-gold"
                >
                  <span>Actualidad</span>
                  <ChevronDown
                    size={18}
                    aria-hidden="true"
                    className={`transition-transform duration-150 ${
                      actualidadMovilAbierta ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {actualidadMovilAbierta && (
                  <div className="flex flex-col pb-2 pl-4">
                    {ENLACES_ACTUALIDAD.map((item) => (
                      <EnlacePortal
                        key={item.enlace}
                        to={item.enlace}
                        onClick={cerrarTodo}
                        className="flex min-h-[48px] items-center font-body text-body text-muted-on-dark transition-colors hover:text-gold"
                      >
                        {item.nombre}
                      </EnlacePortal>
                    ))}
                  </div>
                )}
              </div>

              <EnlacePortal
                to="/contacto"
                onClick={cerrarTodo}
                className="flex min-h-[48px] items-center font-body text-lead font-medium text-white transition-colors hover:text-gold"
              >
                Contacto
              </EnlacePortal>
              </nav>
            </div>

            <div className="mt-8 flex flex-col gap-4 border-t border-white/10 pt-6">
              <div className="flex flex-wrap items-center gap-4 text-meta text-muted-on-dark">
                {telefono && (
                  <a
                    href={hrefTelefono}
                    className="inline-flex min-h-11 items-center gap-2 text-white hover:text-gold"
                  >
                    <Phone size={16} aria-hidden="true" className="text-gold" />
                    <span className="tabular-nums">{telefono}</span>
                  </a>
                )}

                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center gap-2 text-white hover:text-gold"
                  >
                    <MessageCircle size={16} aria-hidden="true" className="text-gold" />
                    <span>{textoWhatsapp || 'WhatsApp Secretaría'}</span>
                  </a>
                )}
              </div>
            </div>
          </Contenedor>
        </div>
      )}
    </header>
  );
}

function EncabezadoConRuta({ transparente }) {
  const { pathname } = useLocation();
  return <EncabezadoBase transparente={transparente} rutaActual={pathname} />;
}

function Encabezado({ transparente = false }) {
  const enRouter = useInRouterContext();
  if (enRouter) {
    return <EncabezadoConRuta transparente={transparente} />;
  }
  return <EncabezadoBase transparente={transparente} rutaActual="/" />;
}

export default Encabezado;
