import { useEffect, useRef, useState } from 'react';

const CONFIG_VARIANTES = {
  arriba: {
    duracion: 700,
    inicial: 'opacity-0 translate-y-6',
  },
  tarjeta: {
    duracion: 600,
    inicial: 'opacity-0 translate-y-6',
  },
  izquierda: {
    duracion: 800,
    inicial: 'opacity-0 -translate-x-8',
  },
  derecha: {
    duracion: 800,
    inicial: 'opacity-0 translate-x-8',
  },
};

function prefiereMovimientoReducido() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Revela el bloque una única vez al entrar en pantalla siguiendo la tabla de parroquia-design §6.
function Reveal({
  variante = 'arriba',
  retraso = 0,
  as = 'div',
  className = '',
  children,
  ...resto
}) {
  const referencia = useRef(null);
  const sinObservador = typeof IntersectionObserver === 'undefined';
  const [visible, setVisible] = useState(() => sinObservador || prefiereMovimientoReducido());

  useEffect(() => {
    if (visible) return undefined;

    const nodo = referencia.current;
    if (!nodo) return undefined;

    const revelarSiVisible = () => {
      const rect = nodo.getBoundingClientRect();
      if (rect.top <= window.innerHeight * 0.92) {
        setVisible(true);
        return true;
      }
      return false;
    };

    const observador = new IntersectionObserver(
      (entradas) => {
        if (
          entradas.some(
            (entrada) =>
              entrada.isIntersecting ||
              entrada.boundingClientRect.top <= window.innerHeight * 0.92,
          )
        ) {
          setVisible(true);
          observador.disconnect();
        }
      },
      { threshold: 0.15 },
    );

    observador.observe(nodo);

    const alScroll = () => {
      if (revelarSiVisible()) {
        window.removeEventListener('scroll', alScroll);
        observador.disconnect();
      }
    };

    window.addEventListener('scroll', alScroll, { passive: true });
    return () => {
      observador.disconnect();
      window.removeEventListener('scroll', alScroll);
    };
  }, [visible]);

  const Etiqueta = as;
  const config = CONFIG_VARIANTES[variante] ?? CONFIG_VARIANTES.arriba;
  const retrasoAplicado = retraso > 0 ? Math.min(retraso, 450) : 0;

  return (
    <Etiqueta
      ref={referencia}
      style={{
        transitionDuration: `${config.duracion}ms`,
        transitionDelay: visible && retrasoAplicado ? `${retrasoAplicado}ms` : '0ms',
      }}
      className={`transition-[opacity,transform] ease-suave motion-reduce:translate-x-0 motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none ${
        visible ? 'translate-x-0 translate-y-0 opacity-100' : config.inicial
      } ${className}`.trim()}
      {...resto}
    >
      {children}
    </Etiqueta>
  );
}

export default Reveal;
