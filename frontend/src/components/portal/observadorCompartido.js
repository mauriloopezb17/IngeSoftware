// Observador compartido para revelar elementos una única vez al entrar en pantalla.
const callbacks = new WeakMap();
let observador = null;

export function prefiereMovimientoReducido() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function sinIntersectionObserver() {
  return typeof IntersectionObserver === 'undefined';
}

function obtenerObservador() {
  if (observador || sinIntersectionObserver()) return observador;

  observador = new IntersectionObserver(
    (entradas) => {
      for (const entrada of entradas) {
        if (
          entrada.isIntersecting ||
          entrada.boundingClientRect.top <= window.innerHeight * 0.92
        ) {
          const cb = callbacks.get(entrada.target);
          if (cb) {
            callbacks.delete(entrada.target);
            observador.unobserve(entrada.target);
            cb();
          }
        }
      }
    },
    { threshold: 0.15, rootMargin: '0px 0px -10% 0px' },
  );

  return observador;
}

export function observarElemento(nodo, alEntrar) {
  if (!nodo) return () => {};

  if (sinIntersectionObserver() || prefiereMovimientoReducido()) {
    alEntrar();
    return () => {};
  }

  // Si ya está visible en el primer pantallazo (con layout real, height > 0), revela enseguida.
  const rect = nodo.getBoundingClientRect();
  if (rect.height > 0 && rect.top <= window.innerHeight * 0.92 && rect.bottom > 0) {
    const idRaf = window.requestAnimationFrame(() => alEntrar());
    return () => window.cancelAnimationFrame(idRaf);
  }

  const obs = obtenerObservador();
  callbacks.set(nodo, alEntrar);
  obs.observe(nodo);

  return () => {
    callbacks.delete(nodo);
    obs?.unobserve(nodo);
  };
}
