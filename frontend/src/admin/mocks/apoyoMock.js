// Piezas comunes de los handlers simulados de eventos, proclamas y boletines (Sección C):
// sesión, sede, errores con el formato del contrato y paginación (convenciones.md §3-§5).
import { HttpResponse } from 'msw';

import { obtenerSesionMock } from './sesionMock.js';
import { fechaBolivia, SEDE_PRINCIPAL } from './usuarios.js';

export function respuestaError({ estado, codigo, mensaje, detalles = [] }) {
  return HttpResponse.json({ error: { codigo, mensaje, detalles } }, { status: estado });
}

export const error = (estado, codigo, mensaje, detalles = []) => ({ error: { estado, codigo, mensaje, detalles } });
export const errorValidacion = (detalles, mensaje = 'Los datos enviados no son válidos.') =>
  error(400, 'VALIDACION', mensaje, detalles);
export const conflicto = (mensaje, detalles = []) => error(409, 'CONFLICTO', mensaje, detalles);

const esAdministrador = (usuario) => usuario.rol.codigo === 'ADMINISTRADOR';

// Devuelve { usuario } o { respuesta } (401) si no hay sesión.
export function autenticar() {
  const usuario = obtenerSesionMock();
  if (!usuario)
    return {
      respuesta: respuestaError({
        estado: 401,
        codigo: 'NO_AUTENTICADO',
        mensaje: 'Tu sesión expiró. Vuelve a iniciar sesión.',
      }),
    };
  return { usuario };
}

// { usuario } o { respuesta } (401 o 403) para las escrituras que exigen un permiso de la matriz.
export function autorizar(permiso, mensaje) {
  const auth = autenticar();
  if (auth.respuesta) return auth;
  if (!auth.usuario.permisos.includes(permiso))
    return { respuesta: respuestaError({ estado: 403, codigo: 'SIN_PERMISO', mensaje }) };
  return auth;
}

// Filtro `sede` de las listas: para los roles que no son Administrador se fuerza la propia (admin.md, reglas comunes).
export function sedeDeLaLista(parametros, usuario) {
  const slug = parametros.get('sede');
  if (esAdministrador(usuario)) {
    if (slug && slug !== SEDE_PRINCIPAL.slug)
      return { respuesta: respuestaError({ estado: 404, codigo: 'NO_ENCONTRADO', mensaje: 'La sede indicada no existe.' }) };
    return { slugSede: slug };
  }
  if (slug && slug !== usuario.sede.slug)
    return { respuesta: respuestaError({ estado: 403, codigo: 'SIN_PERMISO', mensaje: 'Este recurso pertenece a otra sede.' }) };
  return { slugSede: usuario.sede.slug };
}

// Lectura por id: 404 si no existe, 403 si es de otra sede.
export function leerDeLaSede(lista, id, usuario, mensajeNoExiste) {
  const recurso = lista.find((r) => r.id === Number(id));
  if (!recurso) return { respuesta: respuestaError({ estado: 404, codigo: 'NO_ENCONTRADO', mensaje: mensajeNoExiste }) };
  if (!esAdministrador(usuario) && recurso.sede.id !== usuario.sede.id)
    return { respuesta: respuestaError({ estado: 403, codigo: 'SIN_PERMISO', mensaje: 'Este recurso pertenece a otra sede.' }) };
  return { recurso };
}

// `pagina` y `porPagina` (convenciones §4). Devuelve { pagina, porPagina } o { detalles }.
export function leerPaginacion(parametros) {
  const detalles = [];
  const pagina = parametros.has('pagina') ? Number(parametros.get('pagina')) : 1;
  if (!Number.isInteger(pagina) || pagina < 1)
    detalles.push({ campo: 'query.pagina', mensaje: 'Debe ser un entero mayor o igual a 1.' });
  const porPagina = parametros.has('porPagina') ? Number(parametros.get('porPagina')) : 10;
  if (!Number.isInteger(porPagina) || porPagina < 1 || porPagina > 50)
    detalles.push({ campo: 'query.porPagina', mensaje: 'Debe ser un entero entre 1 y 50.' });
  return detalles.length ? { detalles } : { pagina, porPagina };
}

export function paginar(lista, { pagina, porPagina }) {
  const total = lista.length;
  const inicio = (pagina - 1) * porPagina;
  return {
    datos: lista.slice(inicio, inicio + porPagina),
    paginacion: { pagina, porPagina, total, totalPaginas: Math.ceil(total / porPagina) },
  };
}

export const consultaInvalida = (detalles) =>
  respuestaError({ estado: 400, codigo: 'VALIDACION', mensaje: 'Los parámetros de la consulta no son válidos.', detalles });

export const cuerpoInvalido = () =>
  respuestaError({ estado: 400, codigo: 'VALIDACION', mensaje: 'El cuerpo debe ser un objeto JSON.' });

export async function leerCuerpo(request) {
  const cuerpo = await request.json().catch(() => null);
  return cuerpo && typeof cuerpo === 'object' && !Array.isArray(cuerpo) ? cuerpo : null;
}

// Fecha y hora con zona (convenciones §2): sin zona es ambigua y la API la rechaza.
export const esFechaHoraConZona = (valor) =>
  typeof valor === 'string' && /T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(valor) && !Number.isNaN(Date.parse(valor));

export const esFechaSimple = (valor) =>
  typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor) && !Number.isNaN(Date.parse(`${valor}T00:00:00Z`));

export const ahoraIso = () => fechaBolivia(new Date());

// Día de hoy en Bolivia, "YYYY-MM-DD".
export const hoyBolivia = (ahora = new Date()) => fechaBolivia(ahora).slice(0, 10);

export const autorDe = (usuario) => ({ id: usuario.id, nombreCompleto: usuario.nombreCompleto });
