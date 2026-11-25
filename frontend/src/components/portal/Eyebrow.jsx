import { useEffect, useRef, useState } from 'react';

import {
  observarElemento,
  prefiereMovimientoReducido,
  sinIntersectionObserver,
} from './observadorCompartido.js';

// Rótulo en mayúsculas sobre títulos con filete dorado animado (scaleX 0 → 1).
// Nunca texto dorado sobre fondo claro.
function Eyebrow({
  children,
  oscuro = false,
  centrado = false,
  suave = false,
  alCargar = false,
  className = '',
}) {
  const referencia = useRef(null);
  const desactivado = sinIntersectionObserver() || prefiereMovimientoReducido();
  const [visible, setVisible] = useState(() => desactivado);

  useEffect(() => {
    if (!children || visible) return undefined;

    if (alCargar) {
      const rafId = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(rafId);
    }

    return observarElemento(referencia.current, () => setVisible(true));
  }, [children, visible, alCargar]);

  if (!children) return null;

  const colorTexto = oscuro ? 'text-gold' : suave ? 'text-muted' : 'text-ink';

  return (
    <p
      ref={referencia}
      className={`flex items-center gap-3 font-body text-eyebrow font-semibold uppercase tracking-[0.2em] ${colorTexto} ${
        centrado ? 'justify-center' : ''
      } ${className}`.trim()}
    >
      <span
        aria-hidden="true"
        style={{
          transform: desactivado || visible ? 'scaleX(1)' : 'scaleX(0)',
          transitionDuration: desactivado ? '0ms' : '600ms',
        }}
        className="inline-block h-[2px] w-6 shrink-0 origin-left bg-gold transition-transform ease-suave motion-reduce:scale-x-100 motion-reduce:transition-none"
      />
      <span
        style={{
          opacity: desactivado || visible ? 1 : 0,
          transitionDuration: desactivado ? '0ms' : '500ms',
          transitionDelay: visible && !desactivado ? '150ms' : '0ms',
        }}
        className="transition-opacity ease-suave motion-reduce:opacity-100 motion-reduce:transition-none"
      >
        {children}
      </span>
    </p>
  );
}

export default Eyebrow;
