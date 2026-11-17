import { createContext, useContext } from 'react';

const noop = () => {};

const VALOR_POR_DEFECTO = {
  mostrarToast: noop,
  exito: noop,
  error: noop,
  info: noop,
  cerrarToast: noop,
};

export const ToastsContexto = createContext(VALOR_POR_DEFECTO);

// Acceso seguro al sistema de notificaciones efímeras del panel.
export function useToast() {
  return useContext(ToastsContexto);
}
