import { useEffect, useRef, useState } from 'react';

import {
  observarElemento,
  prefiereMovimientoReducido,
  sinIntersectionObserver,
} from './observadorCompartido.js';

// Título con máscara por líneas: cada línea sube desde translateY(105%) dentro de overflow:hidden.
// El texto completo permanece una única vez en el árbol accesible.
function RevealTitulo({
  as = 'h2',
  children,
  retraso = 0,
  duracion = 900,
  escalonado = 110,
  alCargar = false,
  className = '',
  ...resto
}) {
  const contenedorRef = useRef(null);
  const medidorRef = useRef(null);
  const desactivado = sinIntersectionObserver() || prefiereMovimientoReducido();

  const [visible, setVisible] = useState(() => desactivado);
  const [animando, setAnimando] = useState(false);
  const [lineas, setLineas] = useState(null);

  const esTextoPlano = typeof children === 'string' || typeof children === 'number';
  const textoPlano = esTextoPlano ? String(children) : '';
  const palabras = esTextoPlano ? textoPlano.trim().split(/\s+/).filter(Boolean) : [];

  // Agrupa palabras en líneas reales según su offsetTop y recalcula al redimensionar.
  useEffect(() => {
    if (!esTextoPlano || palabras.length === 0 || desactivado) {
      return undefined;
    }

    const medirLineas = () => {
      const medidor = medidorRef.current;
      if (!medidor) return;
      const nodos = Array.from(medidor.querySelectorAll('[data-palabra]'));
      if (nodos.length === 0) return;

      // En entornos sin layout real (jsdom), todos los offsetTop son 0.
      const tieneLayout = nodos.some((n) => n.getBoundingClientRect().height > 0);
      if (!tieneLayout) {
        setLineas([textoPlano]);
        return;
      }

      const agrupadas = [];
      let topActual = null;
      let lineaActual = [];

      for (const nodo of nodos) {
        const top = nodo.offsetTop;
        if (topActual === null || Math.abs(top - topActual) <= 2) {
          topActual = topActual ?? top;
          lineaActual.push(nodo.textContent);
        } else {
          agrupadas.push(lineaActual.join(' '));
          topActual = top;
          lineaActual = [nodo.textContent];
        }
      }
      if (lineaActual.length > 0) {
        agrupadas.push(lineaActual.join(' '));
      }
      setLineas(agrupadas.length > 0 ? agrupadas : [textoPlano]);
    };

    const rafId = window.requestAnimationFrame(medirLineas);

    let ro = null;
    if (typeof ResizeObserver !== 'undefined' && contenedorRef.current) {
      ro = new ResizeObserver(() => medirLineas());
      ro.observe(contenedorRef.current);
    }

    return () => {
      window.cancelAnimationFrame(rafId);
      ro?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textoPlano, esTextoPlano, desactivado]);

  useEffect(() => {
    if (visible) return undefined;

    if (alCargar) {
      let raf2 = null;
      const raf1 = window.requestAnimationFrame(() => {
        raf2 = window.requestAnimationFrame(() => {
          setAnimando(true);
          setVisible(true);
        });
      });
      return () => {
        window.cancelAnimationFrame(raf1);
        if (raf2 !== null) window.cancelAnimationFrame(raf2);
      };
    }

    return observarElemento(contenedorRef.current, () => {
      setAnimando(true);
      setVisible(true);
    });
  }, [visible, alCargar]);

  useEffect(() => {
    if (!animando) return undefined;
    const totalLineas = lineas?.length ?? 1;
    const espera = Math.min(retraso, 600) + totalLineas * escalonado + duracion + 60;
    const timer = window.setTimeout(() => setAnimando(false), espera);
    return () => window.clearTimeout(timer);
  }, [animando, lineas, retraso, escalonado, duracion]);

  const Etiqueta = as;
  const retrasoBase = retraso > 0 ? Math.min(retraso, 600) : 0;

  if (desactivado || !esTextoPlano) {
    return (
      <Etiqueta ref={contenedorRef} className={className} {...resto}>
        {children}
      </Etiqueta>
    );
  }

  const lineasAMostrar = lineas ?? [textoPlano];

  return (
    <Etiqueta ref={contenedorRef} className={`relative ${className}`.trim()} {...resto}>
      {/* Única representación accesible del título */}
      <span className="sr-only">{textoPlano}</span>

      {/* Medidor invisible para detectar saltos de línea reales */}
      <span
        ref={medidorRef}
        aria-hidden="true"
        className="pointer-events-none invisible absolute inset-x-0 top-0 select-none"
      >
        {palabras.map((palabra, i) => (
          <span key={`${palabra}-${i}`} data-palabra="">
            {i > 0 ? ' ' : ''}
            {palabra}
          </span>
        ))}
      </span>

      {/* Líneas visibles animadas */}
      <span aria-hidden="true" className="block">
        {lineasAMostrar.map((linea, indice) => (
          <span key={`${indice}-${linea}`} className="block overflow-hidden">
            <span
              className="block transition-transform ease-suave motion-reduce:translate-y-0 motion-reduce:transition-none"
              style={{
                transform: visible ? 'translateY(0)' : 'translateY(105%)',
                transitionDuration: `${duracion}ms`,
                transitionDelay: visible ? `${retrasoBase + indice * escalonado}ms` : '0ms',
                willChange: animando ? 'transform' : undefined,
              }}
            >
              {linea}
            </span>
          </span>
        ))}
      </span>
    </Etiqueta>
  );
}

export default RevealTitulo;
