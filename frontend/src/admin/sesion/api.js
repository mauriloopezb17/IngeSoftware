// Llamadas de autenticación del panel (docs/api/autenticacion.md §2).
import { clienteHttp, ErrorApi } from '../../services/clienteHttp.js';

// Todas las claves de React Query del panel empiezan por 'admin'.
export const CLAVE_SESION = ['admin', 'sesion'];
export const CLAVE_INICIAR_SESION = [...CLAVE_SESION, 'iniciar'];
export const CLAVE_CERRAR_SESION = [...CLAVE_SESION, 'cerrar'];
// true cuando la API respondió 401 con el panel abierto: la sesión venció (o la cerraron). No se expulsa de la
// pantalla: se avisa y se deja volver a entrar sin perder lo que no se guardó.
export const CLAVE_SESION_VENCIDA = [...CLAVE_SESION, 'vencida'];

export const esErrorNoAutenticado = (error) => error instanceof ErrorApi && error.estado === 401;

// Marca la sesión como vencida, solo si había una abierta (sin sesión, las rutas protegidas ya llevan al login).
export function marcarSesionVencida(queryClient) {
  if (queryClient.getQueryData(CLAVE_SESION)) queryClient.setQueryData(CLAVE_SESION_VENCIDA, true);
}

// Usuario de la sesión actual, o null si no hay sesión: un 401 aquí no es un error,
// significa "sin sesión". Cualquier otro fallo sí se propaga.
export async function obtenerUsuarioActual({ signal } = {}) {
  try {
    const { datos } = await clienteHttp.get('/auth/yo', { senal: signal });
    return datos;
  } catch (error) {
    if (esErrorNoAutenticado(error)) return null;
    throw error;
  }
}

export async function iniciarSesionApi({ correo, contrasena }) {
  const { datos } = await clienteHttp.post('/auth/login', { correo, contrasena });
  return datos;
}

export async function cerrarSesionApi() {
  await clienteHttp.post('/auth/logout');
}
