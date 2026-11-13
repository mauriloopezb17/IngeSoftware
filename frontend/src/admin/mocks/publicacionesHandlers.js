// Handlers MSW de las publicaciones del panel (docs/api/admin.md §3). Copian el contrato y aplican
// la máquina de estados y los permisos por rol; la lógica está en publicacionesMock.js.
import { http, HttpResponse } from 'msw';

import { api } from '../../mocks/api.js';
import {
  buscarPublicacion,
  crearPublicacion,
  editarPublicacion,
  ejecutarAccion,
  eliminarPublicacion,
  listarPublicaciones,
  serializar,
} from './publicacionesMock.js';
import { obtenerSesionMock } from './sesionMock.js';

function respuestaError({ estado, codigo, mensaje, detalles = [] }) {
  return HttpResponse.json({ error: { codigo, mensaje, detalles } }, { status: estado });
}

const sinSesion = () =>
  respuestaError({ estado: 401, codigo: 'NO_AUTENTICADO', mensaje: 'Tu sesión expiró. Vuelve a iniciar sesión.' });
const noExiste = () =>
  respuestaError({ estado: 404, codigo: 'NO_ENCONTRADO', mensaje: 'La publicación no existe.' });
const otraSede = () =>
  respuestaError({ estado: 403, codigo: 'SIN_PERMISO', mensaje: 'Este recurso pertenece a otra sede.' });
const esAdministrador = (usuario) => usuario.rol.codigo === 'ADMINISTRADOR';

// Lee una publicación por id comprobando que exista y que sea de la sede del usuario.
function leer(id, usuario) {
  const publicacion = buscarPublicacion(Number(id));
  if (!publicacion) return { respuesta: noExiste() };
  if (!esAdministrador(usuario) && publicacion.sede.id !== usuario.sede.id) return { respuesta: otraSede() };
  return { publicacion };
}

const ACCIONES = ['enviar-revision', 'aprobar', 'rechazar', 'publicar', 'archivar', 'restaurar'];

export const handlersPublicaciones = [
  http.get(api('/admin/publicaciones'), ({ request }) => {
    const usuario = obtenerSesionMock();
    if (!usuario) return sinSesion();

    const parametros = new URL(request.url).searchParams;
    const slug = parametros.get('sede');
    // Una sede inexistente no es error: el Administrador recibe la lista vacía (como la API).
    // Fuera del Administrador, la sede se fuerza a la propia; pedir otra es 403.
    if (!esAdministrador(usuario) && slug && slug !== usuario.sede.slug) return otraSede();
    const slugSede = esAdministrador(usuario) ? slug : usuario.sede.slug;

    const resultado = listarPublicaciones(parametros, usuario, { slugSede });
    if (resultado.detalles)
      return respuestaError({
        estado: 400,
        codigo: 'VALIDACION',
        mensaje: 'Los parámetros de la consulta no son válidos.',
        detalles: resultado.detalles,
      });
    return HttpResponse.json({ datos: resultado.datos, paginacion: resultado.paginacion });
  }),

  http.get(api('/admin/publicaciones/:id'), ({ params }) => {
    const usuario = obtenerSesionMock();
    if (!usuario) return sinSesion();
    const { publicacion, respuesta } = leer(params.id, usuario);
    if (respuesta) return respuesta;
    return HttpResponse.json({ datos: serializar(publicacion, usuario) });
  }),

  http.post(api('/admin/publicaciones'), async ({ request }) => {
    const usuario = obtenerSesionMock();
    if (!usuario) return sinSesion();
    const cuerpo = await request.json().catch(() => null);
    if (!cuerpo || typeof cuerpo !== 'object')
      return respuestaError({ estado: 400, codigo: 'VALIDACION', mensaje: 'El cuerpo debe ser un objeto JSON.' });

    const { publicacion, error } = crearPublicacion(cuerpo, usuario);
    if (error) return respuestaError(error);
    return HttpResponse.json(
      { datos: serializar(publicacion, usuario) },
      { status: 201, headers: { Location: `/api/admin/publicaciones/${publicacion.id}` } },
    );
  }),

  http.patch(api('/admin/publicaciones/:id'), async ({ request, params }) => {
    const usuario = obtenerSesionMock();
    if (!usuario) return sinSesion();
    const { publicacion: actual, respuesta } = leer(params.id, usuario);
    if (respuesta) return respuesta;

    const cuerpo = await request.json().catch(() => null);
    if (!cuerpo || typeof cuerpo !== 'object')
      return respuestaError({ estado: 400, codigo: 'VALIDACION', mensaje: 'El cuerpo debe ser un objeto JSON.' });

    const { publicacion, error } = editarPublicacion(actual, cuerpo, usuario);
    if (error) return respuestaError(error);
    return HttpResponse.json({ datos: serializar(publicacion, usuario) });
  }),

  http.delete(api('/admin/publicaciones/:id'), ({ params }) => {
    const usuario = obtenerSesionMock();
    if (!usuario) return sinSesion();
    const { publicacion, respuesta } = leer(params.id, usuario);
    if (respuesta) return respuesta;

    const { error } = eliminarPublicacion(publicacion, usuario);
    if (error) return respuestaError(error);
    return new HttpResponse(null, { status: 204 });
  }),

  ...ACCIONES.map((accion) =>
    http.post(api(`/admin/publicaciones/:id/${accion}`), async ({ request, params }) => {
      const usuario = obtenerSesionMock();
      if (!usuario) return sinSesion();
      const { publicacion: actual, respuesta } = leer(params.id, usuario);
      if (respuesta) return respuesta;

      const cuerpo = await request.json().catch(() => ({}));
      const { publicacion, error } = ejecutarAccion(accion, actual, cuerpo, usuario);
      if (error) return respuestaError(error);
      return HttpResponse.json({ datos: serializar(publicacion, usuario) });
    }),
  ),
];
