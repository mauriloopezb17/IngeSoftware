import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const FOCALIZABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Diálogo modal accesible: el foco entra al abrirse y queda atrapado dentro, Escape y el fondo
// lo cierran, y al cerrarse el foco vuelve a quien lo abrió. Se monta solo mientras está abierto:
//   {abierto && <Dialogo titulo="..." onCerrar={() => setAbierto(false)}>...</Dialogo>}
export default function Dialogo({ titulo, onCerrar, children, ancho = 'max-w-3xl', refInicial = null }) {
  const idTitulo = useId();
  const panel = useRef(null);

  useEffect(() => {
    const anterior = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (refInicial?.current) refInicial.current.focus();
    else panel.current?.focus();

    return () => {
      document.body.style.overflow = overflow;
      // Si quien lo abrió ya no existe (por ejemplo, la fila que se acaba de eliminar), el foco no se pierde en
      // <body>: pasa al contenido principal del panel, un lugar lógico desde donde seguir.
      if (anterior instanceof HTMLElement && anterior.isConnected) anterior.focus();
      else document.getElementById('contenido')?.focus();
    };
  }, [refInicial]);

  function alPulsarTecla(evento) {
    if (evento.key === 'Escape') {
      evento.stopPropagation();
      onCerrar();
      return;
    }
    if (evento.key !== 'Tab') return;

    const elementos = [...panel.current.querySelectorAll(FOCALIZABLES)];
    if (!elementos.length) {
      evento.preventDefault();
      return;
    }
    const primero = elementos[0];
    const ultimo = elementos[elementos.length - 1];
    const enPanel = document.activeElement === panel.current;
    if (evento.shiftKey && (document.activeElement === primero || enPanel)) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault();
      primero.focus();
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <div
        aria-hidden="true"
        onClick={onCerrar}
        className="absolute inset-0 bg-ink/65 transition-opacity duration-150 ease-salida [@starting-style]:opacity-0 motion-reduce:transition-none motion-reduce:[@starting-style]:opacity-100"
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        onKeyDown={alPulsarTecla}
        className={`relative flex max-h-full w-full ${ancho} flex-col overflow-hidden rounded-lg border border-sand bg-white font-body text-ink shadow-xl outline-none transition-[opacity,transform] duration-200 ease-salida [@starting-style]:scale-95 [@starting-style]:opacity-0 motion-reduce:transition-none motion-reduce:[@starting-style]:scale-100 motion-reduce:[@starting-style]:opacity-100`}
      >
        <header className="flex items-start justify-between gap-3 border-b border-sand px-5 py-4">
          <h2 id={idTitulo} className="min-w-0 break-words font-body text-xl font-semibold text-ink">
            {titulo}
          </h2>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="shrink-0 rounded-md p-1.5 text-muted transition-colors duration-150 ease-salida hover:bg-panel hover:text-ink focus-visible:outline-2 focus-visible:outline-ink motion-reduce:transition-none"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
