import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';

import EnlacePortal from './EnlacePortal.jsx';
import { IconoDinamico } from './IconoDinamico.jsx';
import { usePagina } from '../../hooks/index.js';

const CONSULTA_ESCRITORIO = '(min-width: 1024px)';

function useEsEscritorio() {
  const [esEscritorio, setEsEscritorio] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia(CONSULTA_ESCRITORIO).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const mql = window.matchMedia(CONSULTA_ESCRITORIO);
    const alCambiar = (evento) => setEsEscritorio(evento.matches);
    mql.addEventListener('change', alCambiar);
    return () => mql.removeEventListener('change', alCambiar);
  }, []);

  return esEscritorio;
}

// Barra lateral flotante en escritorio alimentada por las tarjetas de acceso rápido de la portada.
function MenuFlotante() {
  const esEscritorio = useEsEscritorio();
  const { data: pagina } = usePagina('inicio');
  const tarjetas = pagina?.bloques?.find((bloque) => bloque.tipo === 'tarjetas')?.contenido?.items ?? [];

  if (!esEscritorio || tarjetas.length === 0) return null;

  return (
    <nav
      aria-label="Accesos rápidos"
      className="fixed top-1/2 left-3 z-30 hidden -translate-y-1/2 lg:block"
    >
      <ul className="flex flex-col gap-1.5 rounded-md border border-sand bg-white p-1.5 shadow-soft">
        {tarjetas.map(({ titulo, icono, enlace }) => (
          <li key={titulo}>
            <EnlacePortal
              to={enlace || '/'}
              aria-label={`Ir a ${titulo}`}
              className="group flex min-h-11 items-center gap-2.5 rounded-sm px-3 py-2 font-body text-meta font-semibold text-ink transition-colors duration-150 ease-salida hover:bg-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-sm bg-gold-soft text-ink">
                <IconoDinamico nombre={icono} size={16} strokeWidth={1.8} />
              </span>
              <span className="whitespace-nowrap">{titulo}</span>
              <ArrowRight
                size={14}
                aria-hidden="true"
                className="ml-auto shrink-0 text-muted transition-transform duration-150 ease-salida group-hover:translate-x-0.5 group-hover:text-ink"
              />
            </EnlacePortal>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default MenuFlotante;
