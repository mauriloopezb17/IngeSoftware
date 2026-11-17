import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

// Modal accesible para reproducir el video institucional completo con sonido.
function ModalVideo({ abierto, alCerrar, urlVideo, titulo }) {
  const cerrarRef = useRef(null);

  useEffect(() => {
    if (!abierto) return undefined;

    const enfocadoAntes = document.activeElement;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cerrarRef.current?.focus();

    const alTecla = (evento) => {
      if (evento.key === 'Escape') {
        alCerrar();
      }
    };
    document.addEventListener('keydown', alTecla);

    return () => {
      document.body.style.overflow = overflowAnterior;
      document.removeEventListener('keydown', alTecla);
      if (enfocadoAntes && typeof enfocadoAntes.focus === 'function') {
        enfocadoAntes.focus();
      }
    };
  }, [abierto, alCerrar]);

  if (!abierto) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={titulo || 'Video institucional'}
      className="fixed inset-0 z-50 flex items-center justify-center overscroll-contain bg-ink/85 p-4"
      onClick={(evento) => {
        if (evento.target === evento.currentTarget) alCerrar();
      }}
    >
      <div className="w-full max-w-4xl overflow-hidden rounded-md border border-white/15 bg-ink text-white shadow-soft">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <p className="font-body text-button font-semibold">{titulo || 'Video institucional'}</p>
          <button
            ref={cerrarRef}
            type="button"
            onClick={alCerrar}
            aria-label="Cerrar video"
            className="inline-flex size-11 cursor-pointer items-center justify-center rounded-sm text-white transition-colors duration-150 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-gold"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <video
          src={urlVideo}
          controls
          autoPlay
          playsInline
          className="aspect-video w-full bg-black"
        />
      </div>
    </div>
  );
}

export default ModalVideo;
