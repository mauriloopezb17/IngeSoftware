import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';

import '../../styles/portal.css';

import Encabezado from '../parroquia/Encabezado.jsx';
import PiePagina from '../parroquia/PiePagina.jsx';

// Estructura común de todas las rutas públicas: salto al contenido, encabezado, main y pie.
function LayoutPortal() {
  const { pathname, hash } = useLocation();
  const esInicio = pathname === '/';

  useEffect(() => {
    if (typeof window === 'undefined' || hash || navigator.userAgent?.includes('jsdom')) return;
    window.scrollTo?.(0, 0);
  }, [pathname, hash]);

  return (
    <div className="flex min-h-screen flex-col bg-white font-body text-body text-ink antialiased">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-gold focus:px-4 focus:py-3 focus:font-body focus:text-button focus:font-semibold focus:text-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink"
      >
        Saltar al contenido
      </a>

      <Encabezado transparente={esInicio} />

      <main id="contenido" tabIndex={-1} className="flex-1 outline-none">
        <div key={pathname} className="pagina-entrada">
          <Outlet />
        </div>
      </main>

      <PiePagina />
    </div>
  );
}

export default LayoutPortal;
