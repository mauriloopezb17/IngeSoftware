import { useEffect, useRef, useState } from 'react';

import { prefiereMovimientoReducido } from './observadorCompartido.js';

// Bandas con foto de fondo: la imagen se desplaza más lento que el scroll (hasta ±10 %)
// usando transform en requestAnimationFrame. Solo activo en lg (≥1024px) y sin reduced-motion.
function Parallax({ intensidad = 0.1, className = '', children }) {
  const contenedorRef = useRef(null);
  const capaRef = useRef(null);
  const [activo, setActivo] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mqDesktop = window.matchMedia('(min-width: 1024px)');
    const mqMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const actualizarEstado = () => {
      setActivo(mqDesktop.matches && !mqMotion.matches);
    };

    actualizarEstado();
    mqDesktop.addEventListener?.('change', actualizarEstado);
    mqMotion.addEventListener?.('change', actualizarEstado);

    return () => {
      mqDesktop.removeEventListener?.('change', actualizarEstado);
      mqMotion.removeEventListener?.('change', actualizarEstado);
    };
  }, []);

  useEffect(() => {
    const capa = capaRef.current;
    const contenedor = contenedorRef.current;
    if (!capa || !contenedor) return undefined;

    if (!activo || prefiereMovimientoReducido()) {
      capa.style.transform = '';
      return undefined;
    }

    const tope = Math.min(Math.max(intensidad, 0), 0.1) * 100;
    let rafId = null;

    const actualizarPosicion = () => {
      rafId = null;
      const rect = contenedor.getBoundingClientRect();
      const altoVentana = window.innerHeight || 1;
      const centroElemento = rect.top + rect.height / 2;
      const centroVentana = altoVentana / 2;
      const rango = (altoVentana + rect.height) / 2 || 1;
      const progreso = Math.max(-1, Math.min(1, (centroElemento - centroVentana) / rango));
      const desplazamiento = (-progreso * tope).toFixed(2);
      capa.style.transform = `translate3d(0, ${desplazamiento}%, 0) scale(1.22)`;
    };

    // Posición inicial sin saltos al cargar.
    actualizarPosicion();

    const alScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(actualizarPosicion);
    };

    window.addEventListener('scroll', alScroll, { passive: true });
    window.addEventListener('resize', alScroll, { passive: true });

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', alScroll);
      window.removeEventListener('resize', alScroll);
      capa.style.transform = '';
    };
  }, [activo, intensidad]);

  return (
    <div ref={contenedorRef} className={`overflow-hidden ${className}`.trim()}>
      <div ref={capaRef} className="h-full w-full">
        {children}
      </div>
    </div>
  );
}

export default Parallax;
