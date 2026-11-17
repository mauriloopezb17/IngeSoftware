import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { LogOut, Menu, X } from 'lucide-react';

import logoBlanco from '../../assets/parroquia/logos/logo-horizontal-blanco.svg';
import { usePermisos } from '../permisos/usePermisos.js';
import { SECCIONES } from '../rutas.js';
import { useSesion } from '../sesion/SesionContexto.js';
import AvisoSesion from './AvisoSesion.jsx';
import MenuLateral from './MenuLateral.jsx';

// Estructura del panel: menú lateral oscuro de 260 px (cajón en móvil), barra superior y contenido.
export default function LayoutPanel() {
  const { usuario, cerrarSesion } = useSesion();
  const navegar = useNavigate();
  const { pathname } = useLocation();
  const { puedeVerSeccion } = usePermisos();
  const seccionesVisibles = SECCIONES.filter((s) => puedeVerSeccion(s.clave));

  const seccionActual = SECCIONES.find(
    (s) => pathname === `/admin/${s.ruta}` || pathname.startsWith(`/admin/${s.ruta}/`),
  );

  const [menuAbierto, setMenuAbierto] = useState(false);
  const botonMenu = useRef(null);
  const botonCerrarMenu = useRef(null);

  // Al abrir el cajón el foco entra en él; al cerrarlo vuelve al botón que lo abrió.
  useEffect(() => {
    if (menuAbierto) botonCerrarMenu.current?.focus();
  }, [menuAbierto]);

  useEffect(() => {
    if (!menuAbierto) return undefined;
    const alPulsar = (evento) => {
      if (evento.key === 'Escape') {
        setMenuAbierto(false);
        botonMenu.current?.focus();
      }
    };
    document.addEventListener('keydown', alPulsar);
    return () => document.removeEventListener('keydown', alPulsar);
  }, [menuAbierto]);

  // Al cambiar de pantalla (también con los botones del navegador) se cierra el cajón.
  const [rutaAnterior, setRutaAnterior] = useState(pathname);
  if (rutaAnterior !== pathname) {
    setRutaAnterior(pathname);
    setMenuAbierto(false);
  }

  async function salir() {
    await cerrarSesion();
    navegar('/admin/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-panel font-body text-ink lg:flex">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-gold focus:px-4 focus:py-2 focus:font-semibold focus:text-ink"
      >
        Saltar al contenido
      </a>

      {menuAbierto && (
        <div
          aria-hidden="true"
          onClick={() => setMenuAbierto(false)}
          className="fixed inset-0 z-30 bg-ink/60 lg:hidden"
        />
      )}

      <aside
        id="menu-panel"
        // En escritorio la columna se estira con el contenido (el fondo llega hasta el final de la
        // página); el menú queda pegado a la pantalla dentro de ella.
        className={`fixed inset-y-0 left-0 z-40 w-[260px] bg-ink transition-transform duration-200 ease-salida motion-reduce:transition-none lg:static lg:shrink-0 lg:translate-x-0 lg:visible ${
          menuAbierto ? 'visible translate-x-0' : 'invisible -translate-x-full'
        }`}
      >
        <div data-testid="menu-fijo" className="flex h-full flex-col lg:sticky lg:top-0 lg:h-screen">
          <div className="flex items-start justify-between gap-2 border-b border-white/10 px-5 py-4">
            <div className="min-w-0">
              <img
                src={logoBlanco}
                alt="Parroquia Señor de la Exaltación"
                className="h-12 w-auto"
              />
              <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-widest text-gold">
                Panel de gestión
              </p>
            </div>
            <button
              ref={botonCerrarMenu}
              type="button"
              onClick={() => {
                setMenuAbierto(false);
                botonMenu.current?.focus();
              }}
              aria-label="Cerrar menú"
              className="rounded-md p-1.5 text-muted-on-dark hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-gold lg:hidden"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          <MenuLateral secciones={seccionesVisibles} alNavegar={() => setMenuAbierto(false)} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-sand bg-white px-4 py-3 sm:px-6">
          <button
            ref={botonMenu}
            type="button"
            onClick={() => setMenuAbierto(true)}
            aria-label="Abrir menú"
            aria-expanded={menuAbierto}
            aria-controls="menu-panel"
            className="rounded-md p-2 text-ink hover:bg-panel focus-visible:outline-2 focus-visible:outline-ink lg:hidden"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>

          <p className="min-w-0 truncate text-sm font-semibold text-ink sm:text-base">
            {seccionActual?.titulo ?? 'Panel de gestión'}
          </p>

          <div className="ml-auto flex min-w-0 items-center gap-3">
            {usuario && (
              <p className="hidden min-w-0 text-right text-sm leading-tight sm:block">
                <span className="block truncate font-semibold text-ink">{usuario.nombreCompleto}</span>
                <span className="block truncate text-xs text-muted">
                  {usuario.rol.nombre} · {usuario.sede?.nombre ?? 'Todas las sedes'}
                </span>
              </p>
            )}
            <button
              type="button"
              onClick={salir}
              aria-label="Cerrar sesión"
              className="flex min-h-9 items-center gap-2 rounded-md border border-sand bg-white px-3 py-1.5 text-sm font-medium text-ink transition-colors duration-150 ease-salida hover:bg-panel focus-visible:outline-2 focus-visible:outline-ink motion-reduce:transition-none"
            >
              <LogOut className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline" aria-hidden="true">
                Cerrar sesión
              </span>
            </button>
          </div>
        </header>

        <main id="contenido" tabIndex={-1} className="flex-1 px-4 py-8 outline-none sm:px-6 lg:px-10">
          <Outlet />
        </main>
        <AvisoSesion />
      </div>
    </div>
  );
}
