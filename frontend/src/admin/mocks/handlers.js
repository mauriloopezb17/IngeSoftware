// Handlers del panel CMS (Sección C). Copian los ejemplos de docs/api/autenticacion.md y admin.md.
// Para la URL se usa el mismo patrón que el portal: import { api } from '../../mocks/api.js'.
import { http, HttpResponse } from 'msw';

import { api } from '../../mocks/api.js';
import { USO_DE_ARCHIVOS } from './multimediaDatos.js';
import {
  buscarArchivo,
  cambiarTextoAlternativo,
  crearArchivo,
  eliminarArchivo,
  listarArchivos,
  reiniciarMultimedia,
  validarArchivo,
} from './multimediaMock.js';
import { borrarSesionMock, guardarSesionMock, obtenerSesionMock } from './sesionMock.js';
import { CONTRASENA_DESARROLLO, crearSesion, SEDE_PRINCIPAL, usuariosSeed } from './usuarios.js';

const MAX_FALLOS = 5; // contrato §4: 5 intentos fallidos...
const VENTANA_SEGUNDOS = 15 * 60; // ...cada 15 minutos

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Intentos fallidos por correo (en el servidor real, por IP y correo, guardados en Redis).
const fallosPorCorreo = new Map();

export function reiniciarMocksAdmin() {
  fallosPorCorreo.clear();
  borrarSesionMock();
  reiniciarMultimedia();
}

function error(estado, codigo, mensaje, detalles = [], cabeceras = {}) {
  return HttpResponse.json({ error: { codigo, mensaje, detalles } }, { status: estado, headers: cabeceras });
}

const sinSesion = () => error(401, 'NO_AUTENTICADO', 'Tu sesión expiró. Vuelve a iniciar sesión.');
const sinPermiso = (mensaje) => error(403, 'SIN_PERMISO', mensaje);
const otraSede = () => sinPermiso('Este recurso pertenece a otra sede.');
const esAdministrador = (usuario) => usuario.rol.codigo === 'ADMINISTRADOR';
const tienePermiso = (usuario, permiso) => usuario.permisos.includes(permiso);

// Lee un archivo por id comprobando que exista y que sea de la sede del usuario.
function leerArchivo(id, usuario) {
  const archivo = buscarArchivo(Number(id));
  if (!archivo) return { respuesta: error(404, 'NO_ENCONTRADO', 'El archivo no existe.') };
  if (!esAdministrador(usuario) && archivo.sede.id !== usuario.sede.id) return { respuesta: otraSede() };
  return { archivo };
}

const errorDeCampo = (campo, mensaje) =>
  error(400, 'VALIDACION', 'Los datos enviados no son válidos.', [{ campo, mensaje }]);

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
  // ---- Multimedia (docs/api/admin.md §2) ----

  http.get(api('/admin/multimedia'), ({ request }) => {
    const usuario = obtenerSesionMock();
    if (!usuario) return sinSesion();

    const parametros = new URL(request.url).searchParams;
    const slug = parametros.get('sede');
    if (esAdministrador(usuario) && slug && slug !== SEDE_PRINCIPAL.slug)
      return error(404, 'NO_ENCONTRADO', 'La sede indicada no existe.');
    // Fuera del Administrador, la sede se fuerza a la propia; pedir otra es 403.
    if (!esAdministrador(usuario) && slug && slug !== usuario.sede.slug) return otraSede();
    const slugSede = esAdministrador(usuario) ? slug : usuario.sede.slug;

    const resultado = listarArchivos(parametros, { slugSede });
    if (resultado.detalles)
      return error(400, 'VALIDACION', 'Los parámetros de la consulta no son válidos.', resultado.detalles);
    return HttpResponse.json({ datos: resultado.datos, paginacion: resultado.paginacion });
  }),

  http.post(api('/admin/multimedia'), async ({ request }) => {
    const usuario = obtenerSesionMock();
    if (!usuario) return sinSesion();
    if (!tienePermiso(usuario, 'multimedia.subir')) return sinPermiso('Tu rol no tiene permiso para subir archivos.');

    if (!(request.headers.get('content-type') ?? '').includes('multipart/form-data'))
      return error(415, 'TIPO_NO_PERMITIDO', 'La petición debe enviarse como multipart/form-data.');

    let formulario;
    try {
      formulario = await request.formData();
    } catch {
      return error(400, 'VALIDACION', 'El formulario enviado no es válido.');
    }

    const archivos = formulario.getAll('archivo').filter((valor) => typeof valor !== 'string');
    if (archivos.length !== 1)
      return errorDeCampo('archivo', archivos.length === 0 ? 'Debes enviar un archivo.' : 'Envía un solo archivo.');

    const textoAlternativo = formulario.get('textoAlternativo');
    if (typeof textoAlternativo === 'string' && textoAlternativo.length > 255)
      return errorDeCampo('textoAlternativo', 'El texto alternativo puede tener hasta 255 caracteres.');

    const invalido = validarArchivo(archivos[0]);
    if (invalido) return error(invalido.estado, invalido.codigo, invalido.mensaje);

    const nuevo = crearArchivo({ archivo: archivos[0], textoAlternativo, usuario });
    return HttpResponse.json({ datos: nuevo }, { status: 201, headers: { Location: `/api/admin/multimedia/${nuevo.id}` } });
  }),

  http.patch(api('/admin/multimedia/:id'), async ({ request, params }) => {
    const usuario = obtenerSesionMock();
    if (!usuario) return sinSesion();
    if (!tienePermiso(usuario, 'multimedia.subir')) return sinPermiso('Tu rol no tiene permiso para editar archivos.');

    const { archivo, respuesta } = leerArchivo(params.id, usuario);
    if (respuesta) return respuesta;

    const cuerpo = await request.json().catch(() => null);
    if (!cuerpo || !('textoAlternativo' in cuerpo))
      return errorDeCampo('textoAlternativo', 'Indica el texto alternativo (o null para borrarlo).');
    const { textoAlternativo } = cuerpo;
    if (textoAlternativo !== null && typeof textoAlternativo !== 'string')
      return errorDeCampo('textoAlternativo', 'El texto alternativo debe ser un texto.');
    if (textoAlternativo?.length > 255)
      return errorDeCampo('textoAlternativo', 'El texto alternativo puede tener hasta 255 caracteres.');

    return HttpResponse.json({ datos: cambiarTextoAlternativo(archivo.id, textoAlternativo || null) });
  }),

  http.delete(api('/admin/multimedia/:id'), ({ params }) => {
    const usuario = obtenerSesionMock();
    if (!usuario) return sinSesion();
    if (!tienePermiso(usuario, 'multimedia.eliminar')) return sinPermiso('Tu rol no tiene permiso para eliminar archivos.');

    const { archivo, respuesta } = leerArchivo(params.id, usuario);
    if (respuesta) return respuesta;

    // Fuera del Administrador, cada usuario solo borra lo que subió.
    if (!esAdministrador(usuario) && archivo.subidoPor.id !== usuario.id)
      return sinPermiso('Solo puedes eliminar los archivos que subiste.');

    if (archivo.enUso)
      return error(409, 'CONFLICTO', 'El archivo está en uso y no se puede eliminar.', [
        { campo: 'id', mensaje: USO_DE_ARCHIVOS[archivo.id] ?? 'Está en uso en otro contenido.' },
      ]);

    eliminarArchivo(archivo.id);
    return new HttpResponse(null, { status: 204 });
  }),
];
