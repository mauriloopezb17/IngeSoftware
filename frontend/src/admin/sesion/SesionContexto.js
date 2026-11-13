import { createContext, useContext } from 'react';

export const SesionContexto = createContext(null);

// Valor: { usuario, cargando, error, iniciarSesion, cerrarSesion }
//  - usuario: objeto de /auth/yo, o null cuando no hay sesión.
//  - cargando: true mientras se consulta /auth/yo por primera vez.
export function useSesion() {
  const contexto = useContext(SesionContexto);
  if (!contexto) throw new Error('useSesion debe usarse dentro de <SesionProvider>.');
  return contexto;
}
