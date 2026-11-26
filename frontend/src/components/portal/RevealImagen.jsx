import { useEffect, useRef, useState } from 'react';

import {
  observarElemento,
  prefiereMovimientoReducido,
  sinIntersectionObserver,
} from './observadorCompartido.js';

const CLIP_INICIAL = {
  izquierda: 'inset(0 100% 0 0)',
  derecha: 'inset(0 0 0 100%)',
  abajo: 'inset(100% 0 0 0)',
};

// Revelado de fotografía con cortina (clip-path) y zoom suave interior (scale 1.15 → 1).
function RevealImagen({
  lado = 'izquierda',
  retraso = 0,
  className = '',
  children,
  ...resto
}) {
  const referencia = useRef(null);
  const desactivado = sinIntersectionObserver() || prefiereMovimientoReducido();
  const [visible, setVisible] = useState(() => desactivado);
  const [animando, setAnimando] = useState(false);

  useEffect(() => {
    if (visible) return undefined;

    return observarElemento(referencia.current, () => {
      setAnimando(true);
      setVisible(true);
    });
  }, [visible]);

  useEffect(() => {
    if (!animando) return undefined;
    const timer = window.setTimeout(
      () => setAnimando(false),
      1400 + Math.min(retraso, 600) + 60,
    );
    return () => window.clearTimeout(timer);
  }, [animando, retraso]);

  const clipInicial = CLIP_INICIAL[lado] ?? CLIP_INICIAL.izquierda;
  const retrasoAplicado = retraso > 0 ? Math.min(retraso, 600) : 0;

  return (
    <div
      ref={referencia}
      style={{
        clipPath: desactivado || visible ? 'inset(0 0 0 0)' : clipInicial,
        transitionProperty: desactivado ? 'none' : 'clip-path',
        transitionDuration: desactivado ? '0ms' : '1100ms',
        transitionTimingFunction: 'var(--ease-suave)',
        transitionDelay: visible && retrasoAplicado ? `${retrasoAplicado}ms` : '0ms',
        willChange: animando ? 'clip-path' : undefined,
      }}
      className={`overflow-hidden ${className}`.trim()}
      {...resto}
    >
      <div
        style={{
          transform: desactivado || visible ? 'scale(1)' : 'scale(1.15)',
          transitionProperty: desactivado ? 'none' : 'transform',
          transitionDuration: desactivado ? '0ms' : '1400ms',
          transitionTimingFunction: 'var(--ease-suave)',
          transitionDelay: visible && retrasoAplicado ? `${retrasoAplicado}ms` : '0ms',
          willChange: animando ? 'transform' : undefined,
        }}
        className="h-full w-full"
      >
        {children}
      </div>
    </div>
  );
}

export default RevealImagen;
