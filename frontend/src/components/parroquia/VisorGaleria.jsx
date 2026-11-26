import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

import { construirAtributosImagen } from './imagenSrcSet.js';

function elementosFoco(contenedor) {
  if (!contenedor) return [];
  return [...contenedor.querySelectorAll('a[href], button:not([disabled]), video[controls], [tabindex]:not([tabindex="-1"])')];
}

// Visor modal accesible para la galería de una proclama: Esc cierra, flechas navegan y el foco queda atrapado.
export default function VisorGaleria({ elementos, indice, alCambiar, alCerrar }) {
  const dialogoRef = useRef(null);
  const cerrarRef = useRef(null);
  const anteriorFocoRef = useRef(null);

  const actual = elementos[indice];
  const total = elementos.length;

  useEffect(() => {
    anteriorFocoRef.current = document.activeElement;
    cerrarRef.current?.focus();
    return () => {
      if (anteriorFocoRef.current && typeof anteriorFocoRef.current.focus === 'function') {
        anteriorFocoRef.current.focus();
      }
    };
  }, []);

  useEffect(() => {
    function manejarTeclado(evento) {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        alCerrar();
        return;
      }
      if (evento.key === 'ArrowLeft' && total > 1) {
        evento.preventDefault();
        alCambiar((indice - 1 + total) % total);
        return;
      }
      if (evento.key === 'ArrowRight' && total > 1) {
        evento.preventDefault();
        alCambiar((indice + 1) % total);
        return;
      }
      if (evento.key === 'Tab') {
        const focables = elementosFoco(dialogoRef.current);
        if (focables.length === 0) return;
        const primero = focables[0];
        const ultimo = focables[focables.length - 1];
        if (evento.shiftKey && document.activeElement === primero) {
          evento.preventDefault();
          ultimo.focus();
        } else if (!evento.shiftKey && document.activeElement === ultimo) {
          evento.preventDefault();
          primero.focus();
        }
      }
    }

    document.addEventListener('keydown', manejarTeclado);
    return () => document.removeEventListener('keydown', manejarTeclado);
  }, [indice, total, alCambiar, alCerrar]);

  if (!actual) return null;

  const esVideo = actual.tipoMime?.startsWith('video/');
  const alt = actual.textoAlternativo || `Elemento ${indice + 1} de la galería`;

  return (
    <div
      ref={dialogoRef}
      role="dialog"
      aria-modal="true"
      aria-label="Visor de galería"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) alCerrar();
      }}
    >
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col gap-4 rounded-md bg-ink p-4 text-white sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <p className="font-body text-meta tabular-nums text-muted-on-dark">
            {indice + 1} de {total}
          </p>
          <button
            ref={cerrarRef}
            type="button"
            onClick={alCerrar}
            aria-label="Cerrar visor"
            className="inline-flex size-11 cursor-pointer items-center justify-center rounded-sm border border-white/20 text-white transition-colors duration-200 ease-salida hover:border-gold hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-sm bg-black/40">
          {esVideo ? (
            <video
              key={actual.id ?? actual.url}
              src={actual.url}
              controls
              preload="metadata"
              className="max-h-[65vh] w-full object-contain"
            >
              Tu navegador no admite la reproducción de video.
            </video>
          ) : (
            <img
              {...construirAtributosImagen(actual, '(min-width: 1024px) 896px, 95vw')}
              alt={alt}
              className="max-h-[65vh] w-auto max-w-full object-contain"
            />
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="min-w-0 flex-1 font-body text-meta text-muted-on-dark">{actual.textoAlternativo || ''}</p>
          {total > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => alCambiar((indice - 1 + total) % total)}
                aria-label="Elemento anterior"
                className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1.5 rounded-sm border border-white/20 px-3 font-body text-meta font-semibold text-white transition-colors duration-200 ease-salida hover:border-gold hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                <ChevronLeft size={18} aria-hidden="true" />
                <span>Anterior</span>
              </button>
              <button
                type="button"
                onClick={() => alCambiar((indice + 1) % total)}
                aria-label="Siguiente elemento"
                className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1.5 rounded-sm border border-white/20 px-3 font-body text-meta font-semibold text-white transition-colors duration-200 ease-salida hover:border-gold hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                <span>Siguiente</span>
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
