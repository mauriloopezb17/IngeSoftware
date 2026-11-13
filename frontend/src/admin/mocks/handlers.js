// Handlers del panel CMS (Sección C). Copian los ejemplos de docs/api/autenticacion.md y admin.md.
// Para la URL se usa el mismo patrón que el portal: import { api } from '../../mocks/api.js'.
import { http, HttpResponse } from 'msw';

import { api } from '../../mocks/api.js';
import { borrarSesionMock, guardarSesionMock, obtenerSesionMock } from './sesionMock.js';
import { CONTRASENA_DESARROLLO, crearSesion, usuariosSeed } from './usuarios.js';

const MAX_FALLOS = 5; // contrato §4: 5 intentos fallidos...
const VENTANA_SEGUNDOS = 15 * 60; // ...cada 15 minutos

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Intentos fallidos por correo (en el servidor real, por IP y correo, guardados en Redis).
const fallosPorCorreo = new Map();

export function reiniciarMocksAdmin() {
  fallosPorCorreo.clear();
  borrarSesionMock();
}

function error(estado, codigo, mensaje, detalles = [], cabeceras = {}) {
  return HttpResponse.json({ error: { codigo, mensaje, detalles } }, { status: estado, headers: cabeceras });
}

export const handlersAdmin = [
  http.post(api('/auth/login'), async ({ request }) => {
    const cuerpo = await request.json().catch(() => null);
    const correo = typeof cuerpo?.correo === 'string' ? cuerpo.correo.trim() : '';
    const contrasena = typeof cuerpo?.contrasena === 'string' ? cuerpo.contrasena : '';

    const detalles = [];
    if (!correo) detalles.push({ campo: 'correo', mensaje: 'El correo es obligatorio.' });
    else if (correo.length > 120 || !REGEX_CORREO.test(correo))
      detalles.push({ campo: 'correo', mensaje: 'El correo no tiene un formato válido.' });
    if (!contrasena) detalles.push({ campo: 'contrasena', mensaje: 'La contraseña es obligatoria.' });
    else if (contrasena.length > 200)
      detalles.push({ campo: 'contrasena', mensaje: 'La contraseña es demasiado larga.' });
    if (detalles.length) return error(400, 'VALIDACION', 'Los datos enviados no son válidos.', detalles);

    const clave = correo.toLowerCase(); // el correo se compara sin distinguir mayúsculas
    if ((fallosPorCorreo.get(clave) ?? 0) >= MAX_FALLOS) {
      return error(
        429,
        'DEMASIADAS_SOLICITUDES',
        'Demasiados intentos fallidos. Vuelve a intentarlo en 15 minutos.',
        [],
        { 'Retry-After': String(VENTANA_SEGUNDOS) },
      );
    }

    const usuario = usuariosSeed.find((u) => u.correo === clave);
    if (!usuario || contrasena !== CONTRASENA_DESARROLLO) {
      fallosPorCorreo.set(clave, (fallosPorCorreo.get(clave) ?? 0) + 1);
      return error(401, 'NO_AUTENTICADO', 'Correo o contraseña incorrectos.');
    }

    // Los intentos exitosos no cuentan: se reinicia el contador del correo.
    fallosPorCorreo.delete(clave);
    const sesion = crearSesion(usuario);
    guardarSesionMock(sesion);
    return HttpResponse.json({ datos: sesion });
  }),

  http.get(api('/auth/yo'), () => {
    const sesion = obtenerSesionMock();
    if (!sesion) return error(401, 'NO_AUTENTICADO', 'Tu sesión expiró. Vuelve a iniciar sesión.');
    return HttpResponse.json({ datos: sesion });
  }),

  // Idempotente: funciona aunque no haya sesión.
  http.post(api('/auth/logout'), () => {
    borrarSesionMock();
    return new HttpResponse(null, { status: 204 });
  }),
];
