import { createContext, useContext } from 'react';

export const SesionContexto = createContext(null);

// Valor: { usuario, cargando, error, sesionVencida, iniciarSesion, renovarSesion, cerrarSesion }
//  - usuario: objeto de /auth/yo, o null cuando no hay sesión.
//  - cargando: true mientras se consulta /auth/yo por primera vez.
//  - sesionVencida: true si la API respondió 401 con el panel abierto (el usuario sigue en pantalla).
//  - renovarSesion(contrasena): vuelve a iniciar sesión como el mismo usuario; renueva `sesionExpiraEn`.
export function useSesion() {
  const contexto = useContext(SesionContexto);
  if (!contexto) throw new Error('useSesion debe usarse dentro de <SesionProvider>.');
  return contexto;
}
