// Lógica de sesión del panel (docs/api/autenticacion.md).
import { ROLES } from '../constantes/catalogos.js';
import { permisosDe } from '../constantes/permisos.js';
import { transaccion } from '../db/index.js';
import { ErrorApp } from '../errores/ErrorApp.js';
import * as usuarios from '../models/usuarios.model.js';
import {
  hashearContrasena,
  verificarContrasena,
  verificarContrasenaFicticia,
} from '../utils/contrasenas.js';
import { formatearFechaHora } from '../utils/formato.js';
import { firmarToken, verificarToken } from '../utils/sesion.js';
import { CONTEXTO_DEL_SISTEMA, registrarCambio } from './bitacora.service.js';

// El mismo mensaje para correo inexistente, contraseña incorrecta o usuario inactivo:
// no debe revelar qué correos están registrados.
const MENSAJE_CREDENCIALES = 'Correo o contraseña incorrectos.';

// Sin cookie, token inválido o vencido, o usuario desactivado o borrado.
const MENSAJE_SESION_EXPIRADA = 'Tu sesión expiró. Vuelve a iniciar sesión.';

// Objeto de usuario que devuelven el login y /auth/yo. "sede" es null si el usuario no tiene
// (solo el Administrador puede no tener sede).
export function aUsuarioSesion(fila, sesionExpiraEn) {
  const rol = ROLES.aEnumeracion(fila.rol_nombre);

  return {
    id: fila.id,
    nombreCompleto: fila.nombre_completo,
    correo: fila.correo,
    rol,
    sede:
      fila.sede_id === null
        ? null
        : { id: fila.sede_id, nombre: fila.sede_nombre, slug: fila.sede_slug },
    permisos: [...permisosDe(rol.codigo)],
    fechaUltimoAcceso: formatearFechaHora(fila.fecha_ultimo_acceso),
    sesionExpiraEn: formatearFechaHora(sesionExpiraEn),
  };
}

// Valida el token de una petición y vuelve a leer al usuario de la base: así desactivarlo o
// cambiarle el rol o la sede tiene efecto inmediato, sin esperar a que venza el token.
// Devuelve { fila, rol, sedeId, sesionExpiraEn } o lanza 401 NO_AUTENTICADO. (La caché corta
// en Redis que menciona el contrato llega en la Ola 5; por ahora se lee siempre de PostgreSQL.)
export async function autenticarToken(token) {
  const contenido = token ? verificarToken(token) : null;
  const id = contenido ? Number(contenido.sub) : NaN;
  const fila = Number.isInteger(id) ? await usuarios.buscarPorId(id) : undefined;

  if (!fila?.activo) throw ErrorApp.noAutenticado(MENSAJE_SESION_EXPIRADA);

  return {
    fila,
    rol: ROLES.codigoDe(fila.rol_nombre),
    sedeId: fila.sede_id,
    sesionExpiraEn: new Date(contenido.exp * 1000),
  };
}

// Cambia la contraseña del usuario de la sesión. La sesión actual sigue abierta.
// Lanza 400 VALIDACION con detalle en contrasenaActual si la actual es incorrecta.
// contexto: quién y desde dónde (bitacora.service.contextoDe(req)), para la bitácora.
export async function cambiarContrasena(
  { usuarioId, contrasenaActual, contrasenaNueva },
  contexto = CONTEXTO_DEL_SISTEMA,
) {
  const hashActual = await usuarios.obtenerHashContrasena(usuarioId);

  if (!hashActual || !(await verificarContrasena(contrasenaActual, hashActual))) {
    throw ErrorApp.validacion(undefined, [
      { campo: 'contrasenaActual', mensaje: 'La contraseña actual es incorrecta.' },
    ]);
  }

  const hashNuevo = await hashearContrasena(contrasenaNueva);

  // El cambio queda en la bitácora en la misma transacción; el hash se guarda como "[oculto]".
  await transaccion(async (db) => {
    await usuarios.actualizarContrasena(usuarioId, hashNuevo, db);
    await registrarCambio(db, contexto, {
      entidad: 'usuario',
      entidadId: usuarioId,
      accion: 'UPDATE',
      anterior: { hash_contrasena: hashActual },
      nuevo: { hash_contrasena: hashNuevo },
    });
  });
}

// Abre una sesión. Devuelve { token, duracionSegundos, usuario } o lanza 401 NO_AUTENTICADO.
export async function iniciarSesion({ correo, contrasena }) {
  const usuario = await usuarios.buscarPorCorreo(correo);

  // Con un correo inexistente se verifica igual contra un hash ficticio: así la respuesta tarda lo
  // mismo y no revela qué correos existen. Un usuario inactivo también pasa por la verificación.
  const contrasenaCorrecta = usuario
    ? await verificarContrasena(contrasena, usuario.hash_contrasena)
    : await verificarContrasenaFicticia(contrasena);

  if (!usuario || !contrasenaCorrecta || !usuario.activo) {
    throw ErrorApp.noAutenticado(MENSAJE_CREDENCIALES);
  }

  const fechaUltimoAcceso = await usuarios.registrarAcceso(usuario.id);
  const { token, duracionSegundos, expiraEn } = firmarToken({
    id: usuario.id,
    rol: ROLES.codigoDe(usuario.rol_nombre),
    sede: usuario.sede_id,
  });

  return {
    token,
    duracionSegundos,
    usuario: aUsuarioSesion({ ...usuario, fecha_ultimo_acceso: fechaUltimoAcceso }, expiraEn),
  };
}
