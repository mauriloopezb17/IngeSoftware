import { useEffect, useId, useRef, useState } from 'react';
import { ArrowRight, ChevronRight, LayoutGrid } from 'lucide-react';

import EnlacePortal from './EnlacePortal.jsx';
import { IconoDinamico } from './IconoDinamico.jsx';
import { usePagina } from '../../hooks/index.js';

const CONSULTA_ESCRITORIO = '(min-width: 1024px)';
const UMBRAL_SCROLL_PX = 8;

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

// Barra lateral flotante plegable en escritorio: aparece cuando las tarjetas de portada salen de vista
// y se oculta al bajar para no estorbar la lectura.
function MenuFlotante() {
  const esEscritorio = useEsEscritorio();
  const { data: pagina } = usePagina('inicio');
  const tarjetas = pagina?.bloques?.find((bloque) => bloque.tipo === 'tarjetas')?.contenido?.items ?? [];

  const [abierto, setAbierto] = useState(false);
  const [tarjetasVisibles, setTarjetasVisibles] = useState(true);
  const [ocultoPorScroll, setOcultoPorScroll] = useState(false);

  const idLista = useId();
  const contenedorRef = useRef(null);
  const botonRef = useRef(null);
  const listaRef = useRef(null);
  const ultimoScrollYRef = useRef(0);
  const rafIdRef = useRef(null);
  const tarjetasVisiblesRef = useRef(true);

  const activo = esEscritorio && tarjetas.length > 0;
  const visible = activo && !tarjetasVisibles && !ocultoPorScroll;

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const contenedor = document.querySelector('.con-menu-flotante');
    if (!contenedor) return undefined;
    if (visible) {
      contenedor.setAttribute('data-menu-flotante-visible', 'true');
    } else {
      contenedor.removeAttribute('data-menu-flotante-visible');
    }
    return () => contenedor.removeAttribute('data-menu-flotante-visible');
  }, [visible]);

  // Observa la fila de tarjetas de la portada para no mostrar ambos a la vez.
  useEffect(() => {
    if (!activo || typeof window === 'undefined') return undefined;

    const objetivo = document.querySelector('[data-portada-tarjetas]');
    if (!objetivo || typeof window.IntersectionObserver !== 'function') {
      tarjetasVisiblesRef.current = false;
      const id = requestAnimationFrame(() => setTarjetasVisibles(false));
      return () => cancelAnimationFrame(id);
    }

    const observador = new IntersectionObserver(
      (entradas) => {
        const entrada = entradas[0];
        if (!entrada) return;

        const visibleAhora = entrada.isIntersecting;
        const antesVisible = tarjetasVisiblesRef.current;
        tarjetasVisiblesRef.current = visibleAhora;
        setTarjetasVisibles(visibleAhora);

        if (visibleAhora) {
          setAbierto(false);
          setOcultoPorScroll(false);
        } else if (antesVisible) {
          // Al salir recién de las tarjetas hacia abajo, mostramos el botón de inmediato.
          setOcultoPorScroll(false);
          ultimoScrollYRef.current = window.scrollY;
        }
      },
      { threshold: 0.05 },
    );

    observador.observe(objetivo);
    return () => observador.disconnect();
  }, [activo]);

  // Oculta al bajar y reaparece al subir con umbral de 8 px y rAF.
  useEffect(() => {
    if (!activo || typeof window === 'undefined') return undefined;

    ultimoScrollYRef.current = window.scrollY;

    const manejarScroll = () => {
      if (rafIdRef.current !== null) return;
      let ejecutado = false;
      rafIdRef.current = window.requestAnimationFrame(() => {
        ejecutado = true;
        rafIdRef.current = null;
        const actualY = window.scrollY;
        const delta = actualY - ultimoScrollYRef.current;

        if (tarjetasVisiblesRef.current) {
          ultimoScrollYRef.current = actualY;
          return;
        }

        if (Math.abs(delta) < UMBRAL_SCROLL_PX) return;

        if (delta > 0) {
          setOcultoPorScroll(true);
          setAbierto(false);
        } else {
          setOcultoPorScroll(false);
        }
        ultimoScrollYRef.current = actualY;
      });
      if (ejecutado) rafIdRef.current = null;
    };

    window.addEventListener('scroll', manejarScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', manejarScroll);
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [activo]);

  // Cierra con Escape (devolviendo foco al botón) o al hacer clic fuera.
  useEffect(() => {
    if (!abierto) return undefined;

    const alClicFuera = (evento) => {
      if (contenedorRef.current && !contenedorRef.current.contains(evento.target)) {
        setAbierto(false);
      }
    };

    const alTecla = (evento) => {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        setAbierto(false);
        botonRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', alClicFuera);
    document.addEventListener('keydown', alTecla);
    return () => {
      document.removeEventListener('mousedown', alClicFuera);
      document.removeEventListener('keydown', alTecla);
    };
  }, [abierto]);

  if (!activo) return null;

  const manejarTeclaLista = (evento) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(evento.key)) return;
    const enlaces = Array.from(listaRef.current?.querySelectorAll('a[href]') ?? []);
    if (enlaces.length === 0) return;

    evento.preventDefault();
    const indiceActual = enlaces.indexOf(document.activeElement);

    if (evento.key === 'Home') {
      enlaces[0].focus();
      return;
    }
    if (evento.key === 'End') {
      enlaces[enlaces.length - 1].focus();
      return;
    }

    const paso = evento.key === 'ArrowDown' ? 1 : -1;
    const siguiente =
      indiceActual === -1 ? 0 : (indiceActual + paso + enlaces.length) % enlaces.length;
    enlaces[siguiente].focus();
  };

  return (
    <nav
      ref={contenedorRef}
      aria-label="Accesos rápidos"
      aria-hidden={!visible}
      className={`fixed top-1/2 left-3 z-30 -translate-y-1/2 transition-[opacity,transform] duration-200 ease-salida motion-reduce:transition-none ${
        visible ? 'opacity-100 translate-x-0' : 'invisible pointer-events-none -translate-x-2 opacity-0'
      }`}
    >
      <div className="relative flex items-center">
        <button
          ref={botonRef}
          type="button"
          aria-expanded={abierto}
          aria-controls={idLista}
          tabIndex={visible ? 0 : -1}
          onClick={() => setAbierto((estado) => !estado)}
          className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md border border-sand bg-white px-2.5 py-2 font-body text-meta font-semibold text-ink shadow-soft transition-[background-color,border-color,transform] duration-150 ease-salida hover:border-gold hover:bg-cream active:scale-[0.97] active:duration-120 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink motion-reduce:transition-none"
        >
          <LayoutGrid size={16} aria-hidden="true" className="shrink-0 text-ink" />
          <span>Accesos</span>
          <ChevronRight
            size={14}
            aria-hidden="true"
            className={`shrink-0 text-muted transition-transform duration-150 ease-salida motion-reduce:transition-none ${
              abierto ? 'rotate-180' : ''
            }`}
          />
        </button>

        {abierto && (
          <ul
            ref={listaRef}
            id={idLista}
            onKeyDown={manejarTeclaLista}
            className="absolute top-1/2 left-full ml-2 flex min-w-52 -translate-y-1/2 origin-left flex-col gap-1 rounded-md border border-sand bg-white p-1.5 shadow-soft"
          >
            {tarjetas.map(({ titulo, icono, enlace }) => (
              <li key={titulo}>
                <EnlacePortal
                  to={enlace || '/'}
                  aria-label={`Ir a ${titulo}`}
                  onClick={() => setAbierto(false)}
                  className="group flex min-h-11 items-center gap-2.5 rounded-sm px-3 py-2 font-body text-meta font-semibold text-ink transition-colors duration-150 ease-salida hover:bg-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink motion-reduce:transition-none"
                >
                  <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-sm bg-gold-soft text-ink">
                    <IconoDinamico nombre={icono} size={16} strokeWidth={1.8} />
                  </span>
                  <span className="whitespace-nowrap">{titulo}</span>
                  <ArrowRight
                    size={14}
                    aria-hidden="true"
                    className="ml-auto shrink-0 text-muted transition-transform duration-150 ease-salida group-hover:translate-x-0.5 group-hover:text-ink motion-reduce:transition-none"
                  />
                </EnlacePortal>
              </li>
            ))}
          </ul>
        )}
      </div>
    </nav>
  );
}

export default MenuFlotante;
