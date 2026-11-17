import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

import { ToastsContexto } from './useToast.js';

const DURACION_POR_DEFECTO_MS = 5000;
const MAX_TOASTS = 3;

const ESTILOS_TOAST = {
  exito: {
    contenedor: 'border-success/35 bg-white text-ink',
    acento: 'text-success',
    icono: CheckCircle2,
    rol: 'status',
  },
  error: {
    contenedor: 'border-danger/35 bg-white text-ink',
    acento: 'text-danger',
    icono: AlertCircle,
    rol: 'alert',
  },
  info: {
    contenedor: 'border-sand bg-white text-ink',
    acento: 'text-ink',
    icono: Info,
    rol: 'status',
  },
};

function ToastItem({ toast, onCerrar }) {
  const config = ESTILOS_TOAST[toast.tipo] ?? ESTILOS_TOAST.info;
  const Icono = config.icono;

  return (
    <div
      role={config.rol}
      aria-live={config.rol === 'alert' ? 'assertive' : 'polite'}
      className={`pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg transition-[opacity,transform] duration-200 ease-salida [@starting-style]:translate-y-2 [@starting-style]:opacity-0 motion-reduce:transition-none motion-reduce:[@starting-style]:translate-y-0 motion-reduce:[@starting-style]:opacity-100 ${config.contenedor}`}
    >
      <Icono className={`mt-0.5 size-4 shrink-0 ${config.acento}`} aria-hidden="true" />
      <div className="min-w-0 flex-1 text-sm">
        {toast.titulo && <p className="font-semibold text-ink">{toast.titulo}</p>}
        <p className={toast.titulo ? 'mt-0.5 text-muted' : 'font-medium text-ink'}>{toast.mensaje}</p>
      </div>
      <button
        type="button"
        onClick={() => onCerrar(toast.id)}
        aria-label="Cerrar notificación"
        className="-mr-1 -mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded text-muted hover:bg-panel hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

// Proveedor de toasts efímeros (abajo a la derecha en escritorio, máximo 3 apilados, sin robar foco).
export function ProveedorToasts({ children }) {
  const [toasts, setToasts] = useState([]);
  const siguienteId = useRef(1);
  const temporizadores = useRef(new Map());

  const cerrarToast = useCallback((id) => {
    const timer = temporizadores.current.get(id);
    if (timer) {
      clearTimeout(timer);
      temporizadores.current.delete(id);
    }
    setToasts((actuales) => actuales.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const mapa = temporizadores.current;
    return () => {
      for (const timer of mapa.values()) clearTimeout(timer);
      mapa.clear();
    };
  }, []);

  const mostrarToast = useCallback(
    ({ tipo = 'info', titulo = '', mensaje, duracion = DURACION_POR_DEFECTO_MS }) => {
      if (!mensaje) return null;
      const id = siguienteId.current++;
      setToasts((actuales) => {
        const siguientes = [...actuales, { id, tipo, titulo, mensaje }];
        if (siguientes.length > MAX_TOASTS) {
          const descartados = siguientes.slice(0, siguientes.length - MAX_TOASTS);
          for (const viejo of descartados) {
            const timer = temporizadores.current.get(viejo.id);
            if (timer) {
              clearTimeout(timer);
              temporizadores.current.delete(viejo.id);
            }
          }
          return siguientes.slice(-MAX_TOASTS);
        }
        return siguientes;
      });

      if (duracion > 0) {
        const timer = setTimeout(() => cerrarToast(id), duracion);
        temporizadores.current.set(id, timer);
      }
      return id;
    },
    [cerrarToast],
  );

  const valor = useMemo(
    () => ({
      mostrarToast,
      cerrarToast,
      exito: (mensaje, titulo) => mostrarToast({ tipo: 'exito', titulo, mensaje }),
      error: (mensaje, titulo) => mostrarToast({ tipo: 'error', titulo, mensaje }),
      info: (mensaje, titulo) => mostrarToast({ tipo: 'info', titulo, mensaje }),
    }),
    [mostrarToast, cerrarToast],
  );

  return (
    <ToastsContexto.Provider value={valor}>
      {children}
      <div
        aria-label="Notificaciones"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col gap-2 sm:inset-x-auto sm:right-6 sm:w-full sm:max-w-sm"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onCerrar={cerrarToast} />
        ))}
      </div>
    </ToastsContexto.Provider>
  );
}
