import { useEffect, useRef, useState } from 'react';

import {
  observarElemento,
  prefiereMovimientoReducido,
  sinIntersectionObserver,
} from './observadorCompartido.js';

// Valores según parroquia-design §6; en móvil (< md) los recorridos bajan al ~60 %.
const CONFIG_VARIANTES = {
  arriba: {
    duracion: 900,
    inicial: 'opacity-0 translate-y-6 md:translate-y-10',
  },
  tarjeta: {
    duracion: 1000,
    inicial: 'opacity-0 translate-y-10 md:translate-y-16',
  },
  izquierda: {
    duracion: 1000,
    inicial: 'opacity-0 -translate-x-7 md:-translate-x-12',
  },
  derecha: {
    duracion: 1000,
    inicial: 'opacity-0 translate-x-7 md:translate-x-12',
  },
};

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

  const Etiqueta = as;
  const config = CONFIG_VARIANTES[variante] ?? CONFIG_VARIANTES.arriba;
  const retrasoAplicado = retraso > 0 ? Math.min(retraso, 600) : 0;

  useEffect(() => {
    if (!animando) return undefined;
    const timer = window.setTimeout(
      () => setAnimando(false),
      config.duracion + retrasoAplicado + 60,
    );
    return () => window.clearTimeout(timer);
  }, [animando, config.duracion, retrasoAplicado]);

  return (
    <Etiqueta
      ref={referencia}
      style={{
        transitionDuration: desactivado ? '0ms' : `${config.duracion}ms`,
        transitionDelay: visible && retrasoAplicado ? `${retrasoAplicado}ms` : '0ms',
        willChange: animando ? 'opacity, transform' : undefined,
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
