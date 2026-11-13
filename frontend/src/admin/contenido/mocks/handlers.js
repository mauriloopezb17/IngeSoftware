// Handlers MSW del contenido de la parroquia (docs/api/admin.md §1, §5-§9).
import { http, HttpResponse } from 'msw';

import { api } from '../../../mocks/api.js';
import { obtenerSesionMock } from '../../mocks/sesionMock.js';
import {
  buscarImagenEnBiblioteca,
  CATALOGOS,
  crearGruposIniciales,
  crearHorariosIniciales,
  crearSedesIniciales,
  crearServiciosIniciales,
  crearVideosIniciales,
} from './datos.js';
import { crearControladorPaginas } from './paginas.js';

let sedes = crearSedesIniciales();
let horarios = crearHorariosIniciales();
let servicios = crearServiciosIniciales();
let grupos = crearGruposIniciales();
let videos = crearVideosIniciales();

let sigSedeId = 4;
let sigHorarioId = horarios.length + 1;
let sigServicioId = 7;
let sigPreguntaId = 2;
let sigGrupoId = 7;
let sigVideoId = videos.reduce((max, video) => Math.max(max, video.id), 0) + 1;

export function reiniciarMocksContenido() {
  sedes = crearSedesIniciales();
  horarios = crearHorariosIniciales();
  servicios = crearServiciosIniciales();
  grupos = crearGruposIniciales();
  videos = crearVideosIniciales();
  sigSedeId = 4;
  sigHorarioId = horarios.length + 1;
  sigServicioId = 7;
  sigPreguntaId = 2;
  sigGrupoId = 7;
  sigVideoId = videos.reduce((max, video) => Math.max(max, video.id), 0) + 1;
  controladorPaginas.reiniciar();
}

const REGEX_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const REGEX_YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

function error(estado, codigo, mensaje, detalles = []) {
  return HttpResponse.json({ error: { codigo, mensaje, detalles } }, { status: estado });
}

const sinSesion = () => error(401, 'NO_AUTENTICADO', 'Tu sesión expiró. Vuelve a iniciar sesión.');
const sinPermiso = (mensaje) => error(403, 'SIN_PERMISO', mensaje);
const otraSede = () => sinPermiso('Este recurso pertenece a otra sede.');
const errorValidacion = (detalles) =>
  error(400, 'VALIDACION', 'Los datos enviados no son válidos.', detalles);

const esAdministrador = (usuario) => usuario.rol.codigo === 'ADMINISTRADOR';
const tienePermiso = (usuario, permiso) => usuario.permisos.includes(permiso);

function autenticar(permisoRequerido, mensajePermiso) {
  const usuario = obtenerSesionMock();
  if (!usuario) return { respuesta: sinSesion() };
  if (permisoRequerido && !tienePermiso(usuario, permisoRequerido)) {
    return { respuesta: sinPermiso(mensajePermiso ?? 'Tu rol no tiene permiso para realizar esta acción.') };
  }
  return { usuario };
}

function resumenSede(sede) {
  return { id: sede.id, nombre: sede.nombre, slug: sede.slug };
}

function resolverSedeFiltro(request, usuario) {
  const parametros = new URL(request.url).searchParams;
  const slug = parametros.get('sede');
  if (esAdministrador(usuario)) {
    if (slug && !sedes.some((s) => s.slug === slug)) {
      return { respuesta: error(404, 'NO_ENCONTRADO', 'La sede indicada no existe.') };
    }
    return { slugSede: slug || null, parametros };
  }
  if (slug && slug !== usuario.sede.slug) {
    return { respuesta: otraSede() };
  }
  return { slugSede: usuario.sede.slug, parametros };
}

function resolverSedeCreacion(cuerpo, usuario) {
  if (esAdministrador(usuario) && cuerpo?.sedeId !== undefined && cuerpo.sedeId !== null) {
    const sede = sedes.find((s) => s.id === Number(cuerpo.sedeId));
    if (!sede) {
      return { respuesta: errorValidacion([{ campo: 'sedeId', mensaje: 'La sede indicada no existe.' }]) };
    }
    return { sede: resumenSede(sede) };
  }
  const sedeUsuario = sedes.find((s) => s.id === usuario.sede?.id) ?? sedes[0];
  return { sede: resumenSede(sedeUsuario) };
}

function leerPorId(lista, id, usuario, mensajeNoEncontrado) {
  const recurso = lista.find((item) => item.id === Number(id));
  if (!recurso) return { respuesta: error(404, 'NO_ENCONTRADO', mensajeNoEncontrado) };
  if (!esAdministrador(usuario) && recurso.sede.id !== usuario.sede.id) {
    return { respuesta: otraSede() };
  }
  return { recurso };
}

function aSlug(texto) {
  return String(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function extraerYoutubeId(valor) {
  if (typeof valor !== 'string') return null;
  const limpio = valor.trim();
  if (REGEX_YOUTUBE_ID.test(limpio)) return limpio;

  let url;
  try {
    url = new URL(limpio);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, '');
  let candidato = null;
  if (host === 'youtu.be') {
    candidato = url.pathname.slice(1).split('/')[0];
  } else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname === '/watch') {
      candidato = url.searchParams.get('v');
    } else if (
      url.pathname.startsWith('/shorts/') ||
      url.pathname.startsWith('/embed/') ||
      url.pathname.startsWith('/live/')
    ) {
      candidato = url.pathname.split('/')[2];
    }
  }
  return candidato && REGEX_YOUTUBE_ID.test(candidato) ? candidato : null;
}

function validarReorden(lista, ids, campo = 'ids') {
  if (!Array.isArray(ids) || ids.length !== lista.length) {
    return errorValidacion([{ campo, mensaje: 'Debes enviar todos los identificadores en el nuevo orden.' }]);
  }
  const esperados = new Set(lista.map((item) => item.id));
  const recibidos = new Set(ids.map(Number));
  if (recibidos.size !== esperados.size || [...recibidos].some((id) => !esperados.has(id))) {
    return errorValidacion([{ campo, mensaje: 'La lista de identificadores no coincide con los registros.' }]);
  }
  return null;
}

function reordenarPorSede(lista, cuerpo, usuario, campoOrden = 'orden') {
  const ids = cuerpo?.ids;
  let sedeId = usuario.sede?.id ?? 1;
  if (esAdministrador(usuario) && Array.isArray(ids) && ids.length > 0) {
    const primero = lista.find((item) => item.id === Number(ids[0]));
    if (primero) sedeId = primero.sede.id;
  }
  const deSede = lista.filter((item) => item.sede.id === sedeId);
  const fallo = validarReorden(deSede, ids);
  if (fallo) return { respuesta: fallo };

  const mapaOrden = new Map(ids.map((id, indice) => [Number(id), indice + 1]));
  for (const item of deSede) {
    item[campoOrden] = mapaOrden.get(item.id);
  }
  deSede.sort((a, b) => a[campoOrden] - b[campoOrden]);
  return { datos: deSede };
}

function validarContenidoServicio(contenido, detalles) {
  if (!contenido || typeof contenido !== 'object' || Array.isArray(contenido)) {
    detalles.push({ campo: 'contenido', mensaje: 'El contenido del servicio debe ser un objeto.' });
    return;
  }
  const clavesExtra = Object.keys(contenido).filter((k) => k !== 'datos');
  if (clavesExtra.length > 0 || !Array.isArray(contenido.datos)) {
    detalles.push({ campo: 'contenido', mensaje: 'El contenido debe incluir únicamente la lista «datos».' });
    return;
  }
  if (contenido.datos.length > 20) {
    detalles.push({ campo: 'contenido', mensaje: 'El contenido puede tener hasta 20 elementos.' });
    return;
  }
  contenido.datos.forEach((fila, i) => {
    if (!fila || typeof fila !== 'object' || Array.isArray(fila)) {
      detalles.push({ campo: `contenido.datos.${i}`, mensaje: 'Cada elemento debe ser un objeto etiqueta–valor.' });
      return;
    }
    const extraFila = Object.keys(fila).filter((k) => k !== 'etiqueta' && k !== 'valor');
    if (extraFila.length > 0) {
      detalles.push({ campo: `contenido.datos.${i}`, mensaje: 'Solo se permiten las claves etiqueta y valor.' });
    }
    const etq = typeof fila.etiqueta === 'string' ? fila.etiqueta.trim() : '';
    const val = typeof fila.valor === 'string' ? fila.valor.trim() : '';
    if (!etq || etq.length > 60) {
      detalles.push({
        campo: `contenido.datos.${i}.etiqueta`,
        mensaje: 'La etiqueta es obligatoria y admite hasta 60 caracteres.',
      });
    }
    if (!val || val.length > 300) {
      detalles.push({
        campo: `contenido.datos.${i}.valor`,
        mensaje: 'El valor es obligatorio y admite hasta 300 caracteres.',
      });
    }
  });
}

function validarHorarioCuerpo(cuerpo, actual = null) {
  const detalles = [];
  const tipoId = cuerpo.tipoHorarioId !== undefined ? Number(cuerpo.tipoHorarioId) : actual?.tipo.id;
  const tipo = CATALOGOS.tiposHorario.find((t) => t.id === tipoId);
  if (!tipo) {
    detalles.push({ campo: 'tipoHorarioId', mensaje: 'El tipo de horario es obligatorio.' });
  }

  const dia = cuerpo.diaSemana !== undefined ? Number(cuerpo.diaSemana) : actual?.diaSemana;
  if (!Number.isInteger(dia) || dia < 1 || dia > 7) {
    detalles.push({ campo: 'diaSemana', mensaje: 'El día debe estar entre 1 (lunes) y 7 (domingo).' });
  }

  const horaInicio = cuerpo.horaInicio !== undefined ? cuerpo.horaInicio : actual?.horaInicio;
  if (typeof horaInicio !== 'string' || !REGEX_HORA.test(horaInicio)) {
    detalles.push({ campo: 'horaInicio', mensaje: 'La hora de inicio debe tener formato HH:mm.' });
  }

  const horaFin = cuerpo.horaFin !== undefined ? cuerpo.horaFin : actual?.horaFin ?? null;
  if (horaFin !== null) {
    if (typeof horaFin !== 'string' || !REGEX_HORA.test(horaFin)) {
      detalles.push({ campo: 'horaFin', mensaje: 'La hora de fin debe tener formato HH:mm.' });
    } else if (typeof horaInicio === 'string' && REGEX_HORA.test(horaInicio) && horaFin <= horaInicio) {
      detalles.push({ campo: 'horaFin', mensaje: 'La hora de fin debe ser posterior a la hora de inicio.' });
    }
  }

  const descripcion = cuerpo.descripcion !== undefined ? cuerpo.descripcion : actual?.descripcion ?? null;
  if (descripcion !== null && (typeof descripcion !== 'string' || descripcion.length > 150)) {
    detalles.push({ campo: 'descripcion', mensaje: 'La descripción puede tener hasta 150 caracteres.' });
  }

  return {
    detalles,
    valores: {
      tipo,
      diaSemana: dia,
      horaInicio,
      horaFin: horaFin || null,
      descripcion: typeof descripcion === 'string' && descripcion.trim() ? descripcion.trim() : null,
      activo: cuerpo.activo !== undefined ? Boolean(cuerpo.activo) : actual?.activo ?? true,
    },
  };
}

function ordenarHorarios(lista) {
  return [...lista].sort(
    (a, b) => a.tipo.id - b.tipo.id || a.diaSemana - b.diaSemana || a.horaInicio.localeCompare(b.horaInicio),
  );
}

function construirVideo(cuerpo, sede, orden, actual = null) {
  const youtubeVideoId = actual ? actual.youtubeVideoId : extraerYoutubeId(cuerpo.youtube);
  const ytId =
    cuerpo.youtube !== undefined ? extraerYoutubeId(cuerpo.youtube) : youtubeVideoId;

  return {
    id: actual ? actual.id : sigVideoId++,
    sede,
    titulo: (cuerpo.titulo ?? actual?.titulo ?? '').trim(),
    descripcion:
      cuerpo.descripcion !== undefined
        ? cuerpo.descripcion?.trim() || null
        : actual?.descripcion ?? null,
    youtubeVideoId: ytId,
    urlVideo: `https://www.youtube.com/watch?v=${ytId}`,
    urlInsercion: `https://www.youtube-nocookie.com/embed/${ytId}`,
    urlMiniatura: `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`,
    duracionSegundos:
      cuerpo.duracionSegundos !== undefined
        ? cuerpo.duracionSegundos === null
          ? null
          : Number(cuerpo.duracionSegundos)
        : actual?.duracionSegundos ?? null,
    destacado: cuerpo.destacado !== undefined ? Boolean(cuerpo.destacado) : actual?.destacado ?? false,
    orden,
    fechaPublicacion:
      cuerpo.fechaPublicacion !== undefined
        ? cuerpo.fechaPublicacion || null
        : actual?.fechaPublicacion ?? null,
  };
}

const controladorPaginas = crearControladorPaginas({
  autenticar,
  esAdministrador,
  resolverSedeFiltro,
  resolverSedeCreacion,
  leerPorId,
  aSlug,
  validarReorden,
  error,
  errorValidacion,
  otraSede,
});

export const handlersContenido = [
  // ---- §1 Catálogos ----
  http.get(api('/admin/catalogos'), () => {
    const auth = autenticar();
    if (auth.respuesta) return auth.respuesta;
    return HttpResponse.json({ datos: CATALOGOS });
  }),

  // ---- §5 Horarios ----
  http.get(api('/admin/horarios'), ({ request }) => {
    const auth = autenticar();
    if (auth.respuesta) return auth.respuesta;

    const filtro = resolverSedeFiltro(request, auth.usuario);
    if (filtro.respuesta) return filtro.respuesta;

    let lista = horarios;
    if (filtro.slugSede) lista = lista.filter((h) => h.sede.slug === filtro.slugSede);

    const tipo = filtro.parametros.get('tipo');
    if (tipo) {
      const ids = tipo.split(',').map((v) => Number(v.trim()));
      lista = lista.filter((h) => ids.includes(h.tipo.id));
    }

    const activo = filtro.parametros.get('activo');
    if (activo === 'true' || activo === 'false') {
      lista = lista.filter((h) => h.activo === (activo === 'true'));
    }

    return HttpResponse.json({ datos: ordenarHorarios(lista) });
  }),

  http.get(api('/admin/horarios/:id'), ({ params }) => {
    const auth = autenticar();
    if (auth.respuesta) return auth.respuesta;
    const { recurso, respuesta } = leerPorId(horarios, params.id, auth.usuario, 'El horario no existe.');
    return respuesta ?? HttpResponse.json({ datos: recurso });
  }),

  http.post(api('/admin/horarios'), async ({ request }) => {
    const auth = autenticar('horarios.gestionar', 'Tu rol no tiene permiso para gestionar horarios.');
    if (auth.respuesta) return auth.respuesta;

    const cuerpo = await request.json().catch(() => null);
    if (!cuerpo) return errorValidacion([{ campo: 'cuerpo', mensaje: 'El cuerpo JSON no es válido.' }]);

    const sedeRes = resolverSedeCreacion(cuerpo, auth.usuario);
    if (sedeRes.respuesta) return sedeRes.respuesta;

    const { detalles, valores } = validarHorarioCuerpo(cuerpo);
    if (detalles.length) return errorValidacion(detalles);

    const nuevo = { id: sigHorarioId++, sede: sedeRes.sede, ...valores };
    horarios.push(nuevo);
    return HttpResponse.json({ datos: nuevo }, { status: 201, headers: { Location: `/api/admin/horarios/${nuevo.id}` } });
  }),

  http.patch(api('/admin/horarios/:id'), async ({ request, params }) => {
    const auth = autenticar('horarios.gestionar', 'Tu rol no tiene permiso para gestionar horarios.');
    if (auth.respuesta) return auth.respuesta;

    const { recurso, respuesta } = leerPorId(horarios, params.id, auth.usuario, 'El horario no existe.');
    if (respuesta) return respuesta;

    const cuerpo = await request.json().catch(() => null);
    if (!cuerpo) return errorValidacion([{ campo: 'cuerpo', mensaje: 'El cuerpo JSON no es válido.' }]);

    const { detalles, valores } = validarHorarioCuerpo(cuerpo, recurso);
    if (detalles.length) return errorValidacion(detalles);

    Object.assign(recurso, valores);
    return HttpResponse.json({ datos: recurso });
  }),

  http.delete(api('/admin/horarios/:id'), ({ params }) => {
    const auth = autenticar('horarios.gestionar', 'Tu rol no tiene permiso para gestionar horarios.');
    if (auth.respuesta) return auth.respuesta;

    const { recurso, respuesta } = leerPorId(horarios, params.id, auth.usuario, 'El horario no existe.');
    if (respuesta) return respuesta;

    horarios = horarios.filter((h) => h.id !== recurso.id);
    return new HttpResponse(null, { status: 204 });
  }),

  // ---- §6 Servicios y preguntas frecuentes ----
  http.get(api('/admin/servicios'), ({ request }) => {
    const auth = autenticar();
    if (auth.respuesta) return auth.respuesta;

    const filtro = resolverSedeFiltro(request, auth.usuario);
    if (filtro.respuesta) return filtro.respuesta;

    let lista = servicios;
    if (filtro.slugSede) lista = lista.filter((s) => s.sede.slug === filtro.slugSede);

    const visible = filtro.parametros.get('visible');
    if (visible === 'true' || visible === 'false') {
      lista = lista.filter((s) => s.visible === (visible === 'true'));
    }

    return HttpResponse.json({ datos: [...lista].sort((a, b) => a.orden - b.orden) });
  }),

  http.post(api('/admin/servicios/reordenar'), async ({ request }) => {
    const auth = autenticar('servicios.gestionar', 'Tu rol no tiene permiso para gestionar servicios.');
    if (auth.respuesta) return auth.respuesta;

    const cuerpo = await request.json().catch(() => null);
    const res = reordenarPorSede(servicios, cuerpo, auth.usuario);
    return res.respuesta ?? HttpResponse.json({ datos: res.datos });
  }),

  http.get(api('/admin/servicios/:id'), ({ params }) => {
    const auth = autenticar();
    if (auth.respuesta) return auth.respuesta;
    const { recurso, respuesta } = leerPorId(servicios, params.id, auth.usuario, 'El servicio no existe.');
    return respuesta ?? HttpResponse.json({ datos: recurso });
  }),

  http.post(api('/admin/servicios'), async ({ request }) => {
    const auth = autenticar('servicios.gestionar', 'Tu rol no tiene permiso para gestionar servicios.');
    if (auth.respuesta) return auth.respuesta;

    const cuerpo = await request.json().catch(() => null);
    if (!cuerpo) return errorValidacion([{ campo: 'cuerpo', mensaje: 'El cuerpo JSON no es válido.' }]);

    const sedeRes = resolverSedeCreacion(cuerpo, auth.usuario);
    if (sedeRes.respuesta) return sedeRes.respuesta;

    const detalles = [];
    const nombre = typeof cuerpo.nombre === 'string' ? cuerpo.nombre.trim() : '';
    if (!nombre || nombre.length > 100) {
      detalles.push({ campo: 'nombre', mensaje: 'El nombre es obligatorio y admite hasta 100 caracteres.' });
    }
    const descripcionCorta = typeof cuerpo.descripcionCorta === 'string' ? cuerpo.descripcionCorta.trim() : '';
    if (!descripcionCorta || descripcionCorta.length > 300) {
      detalles.push({
        campo: 'descripcionCorta',
        mensaje: 'La descripción corta es obligatoria y admite hasta 300 caracteres.',
      });
    }
    if (cuerpo.icono !== undefined && cuerpo.icono !== null && (typeof cuerpo.icono !== 'string' || cuerpo.icono.length > 40)) {
      detalles.push({ campo: 'icono', mensaje: 'El ícono puede tener hasta 40 caracteres.' });
    }
    validarContenidoServicio(cuerpo.contenido ?? { datos: [] }, detalles);
    if (detalles.length) return errorValidacion(detalles);

    const slug = cuerpo.slug ? aSlug(cuerpo.slug) : aSlug(nombre);
    if (servicios.some((s) => s.sede.id === sedeRes.sede.id && s.slug === slug)) {
      return error(409, 'CONFLICTO', `Ya existe un servicio con el slug «${slug}» en esta sede.`);
    }

    const deSede = servicios.filter((s) => s.sede.id === sedeRes.sede.id);
    const maxOrden = deSede.reduce((max, s) => Math.max(max, s.orden), 0);

    const nuevo = {
      id: sigServicioId++,
      sede: sedeRes.sede,
      slug,
      nombre,
      descripcionCorta,
      icono: cuerpo.icono?.trim() || null,
      contenido: cuerpo.contenido ?? { datos: [] },
      orden: maxOrden + 1,
      visible: cuerpo.visible !== undefined ? Boolean(cuerpo.visible) : true,
      preguntasFrecuentes: [],
    };
    servicios.push(nuevo);
    return HttpResponse.json({ datos: nuevo }, { status: 201, headers: { Location: `/api/admin/servicios/${nuevo.id}` } });
  }),

  http.patch(api('/admin/servicios/:id'), async ({ request, params }) => {
    const auth = autenticar('servicios.gestionar', 'Tu rol no tiene permiso para gestionar servicios.');
    if (auth.respuesta) return auth.respuesta;

    const { recurso, respuesta } = leerPorId(servicios, params.id, auth.usuario, 'El servicio no existe.');
    if (respuesta) return respuesta;

    const cuerpo = await request.json().catch(() => null);
    if (!cuerpo) return errorValidacion([{ campo: 'cuerpo', mensaje: 'El cuerpo JSON no es válido.' }]);

    const detalles = [];
    const nombre = cuerpo.nombre !== undefined ? String(cuerpo.nombre ?? '').trim() : recurso.nombre;
    if (!nombre || nombre.length > 100) {
      detalles.push({ campo: 'nombre', mensaje: 'El nombre es obligatorio y admite hasta 100 caracteres.' });
    }
    const descripcionCorta =
      cuerpo.descripcionCorta !== undefined ? String(cuerpo.descripcionCorta ?? '').trim() : recurso.descripcionCorta;
    if (!descripcionCorta || descripcionCorta.length > 300) {
      detalles.push({
        campo: 'descripcionCorta',
        mensaje: 'La descripción corta es obligatoria y admite hasta 300 caracteres.',
      });
    }
    if (cuerpo.icono !== undefined && cuerpo.icono !== null && (typeof cuerpo.icono !== 'string' || cuerpo.icono.length > 40)) {
      detalles.push({ campo: 'icono', mensaje: 'El ícono puede tener hasta 40 caracteres.' });
    }
    if (cuerpo.contenido !== undefined) {
      validarContenidoServicio(cuerpo.contenido, detalles);
    }
    if (detalles.length) return errorValidacion(detalles);

    const slug = cuerpo.slug !== undefined ? (cuerpo.slug ? aSlug(cuerpo.slug) : aSlug(nombre)) : recurso.slug;
    if (servicios.some((s) => s.id !== recurso.id && s.sede.id === recurso.sede.id && s.slug === slug)) {
      return error(409, 'CONFLICTO', `Ya existe un servicio con el slug «${slug}» en esta sede.`);
    }

    recurso.nombre = nombre;
    recurso.slug = slug;
    recurso.descripcionCorta = descripcionCorta;
    if (cuerpo.icono !== undefined) recurso.icono = cuerpo.icono?.trim() || null;
    if (cuerpo.contenido !== undefined) recurso.contenido = cuerpo.contenido;
    if (cuerpo.visible !== undefined) recurso.visible = Boolean(cuerpo.visible);

    return HttpResponse.json({ datos: recurso });
  }),

  http.delete(api('/admin/servicios/:id'), ({ params }) => {
    const auth = autenticar('servicios.gestionar', 'Tu rol no tiene permiso para gestionar servicios.');
    if (auth.respuesta) return auth.respuesta;

    const { recurso, respuesta } = leerPorId(servicios, params.id, auth.usuario, 'El servicio no existe.');
    if (respuesta) return respuesta;

    servicios = servicios.filter((s) => s.id !== recurso.id);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(api('/admin/servicios/:id/preguntas-frecuentes'), async ({ request, params }) => {
    const auth = autenticar('servicios.gestionar', 'Tu rol no tiene permiso para gestionar servicios.');
    if (auth.respuesta) return auth.respuesta;

    const { recurso, respuesta } = leerPorId(servicios, params.id, auth.usuario, 'El servicio no existe.');
    if (respuesta) return respuesta;

    const cuerpo = await request.json().catch(() => null);
    if (!cuerpo) return errorValidacion([{ campo: 'cuerpo', mensaje: 'El cuerpo JSON no es válido.' }]);

    const detalles = [];
    const pregunta = typeof cuerpo.pregunta === 'string' ? cuerpo.pregunta.trim() : '';
    const respuestaTxt = typeof cuerpo.respuesta === 'string' ? cuerpo.respuesta.trim() : '';
    if (!pregunta || pregunta.length > 300) {
      detalles.push({ campo: 'pregunta', mensaje: 'La pregunta es obligatoria y admite hasta 300 caracteres.' });
    }
    if (!respuestaTxt || respuestaTxt.length > 2000) {
      detalles.push({ campo: 'respuesta', mensaje: 'La respuesta es obligatoria y admite hasta 2000 caracteres.' });
    }
    if (detalles.length) return errorValidacion(detalles);

    const maxOrden = recurso.preguntasFrecuentes.reduce((m, p) => Math.max(m, p.orden), -1);
    const nueva = {
      id: sigPreguntaId++,
      pregunta,
      respuesta: respuestaTxt,
      orden: maxOrden + 1,
      activa: cuerpo.activa !== undefined ? Boolean(cuerpo.activa) : true,
    };
    recurso.preguntasFrecuentes.push(nueva);
    return HttpResponse.json(
      { datos: nueva },
      { status: 201, headers: { Location: `/api/admin/servicios/${recurso.id}/preguntas-frecuentes/${nueva.id}` } },
    );
  }),

  http.post(api('/admin/servicios/:id/preguntas-frecuentes/reordenar'), async ({ request, params }) => {
    const auth = autenticar('servicios.gestionar', 'Tu rol no tiene permiso para gestionar servicios.');
    if (auth.respuesta) return auth.respuesta;

    const { recurso, respuesta } = leerPorId(servicios, params.id, auth.usuario, 'El servicio no existe.');
    if (respuesta) return respuesta;

    const cuerpo = await request.json().catch(() => null);
    const fallo = validarReorden(recurso.preguntasFrecuentes, cuerpo?.ids);
    if (fallo) return fallo;

    const mapaOrden = new Map(cuerpo.ids.map((id, indice) => [Number(id), indice]));
    for (const p of recurso.preguntasFrecuentes) {
      p.orden = mapaOrden.get(p.id);
    }
    recurso.preguntasFrecuentes.sort((a, b) => a.orden - b.orden);
    return HttpResponse.json({ datos: recurso.preguntasFrecuentes });
  }),

  http.patch(api('/admin/servicios/:id/preguntas-frecuentes/:preguntaId'), async ({ request, params }) => {
    const auth = autenticar('servicios.gestionar', 'Tu rol no tiene permiso para gestionar servicios.');
    if (auth.respuesta) return auth.respuesta;

    const { recurso, respuesta } = leerPorId(servicios, params.id, auth.usuario, 'El servicio no existe.');
    if (respuesta) return respuesta;

    const pf = recurso.preguntasFrecuentes.find((p) => p.id === Number(params.preguntaId));
    if (!pf) return error(404, 'NO_ENCONTRADO', 'La pregunta frecuente no existe.');

    const cuerpo = await request.json().catch(() => null);
    if (!cuerpo) return errorValidacion([{ campo: 'cuerpo', mensaje: 'El cuerpo JSON no es válido.' }]);

    const detalles = [];
    const pregunta = cuerpo.pregunta !== undefined ? String(cuerpo.pregunta ?? '').trim() : pf.pregunta;
    const respuestaTxt = cuerpo.respuesta !== undefined ? String(cuerpo.respuesta ?? '').trim() : pf.respuesta;
    if (!pregunta || pregunta.length > 300) {
      detalles.push({ campo: 'pregunta', mensaje: 'La pregunta es obligatoria y admite hasta 300 caracteres.' });
    }
    if (!respuestaTxt || respuestaTxt.length > 2000) {
      detalles.push({ campo: 'respuesta', mensaje: 'La respuesta es obligatoria y admite hasta 2000 caracteres.' });
    }
    if (detalles.length) return errorValidacion(detalles);

    pf.pregunta = pregunta;
    pf.respuesta = respuestaTxt;
    if (cuerpo.activa !== undefined) pf.activa = Boolean(cuerpo.activa);
    return HttpResponse.json({ datos: pf });
  }),

  http.delete(api('/admin/servicios/:id/preguntas-frecuentes/:preguntaId'), ({ params }) => {
    const auth = autenticar('servicios.gestionar', 'Tu rol no tiene permiso para gestionar servicios.');
    if (auth.respuesta) return auth.respuesta;

    const { recurso, respuesta } = leerPorId(servicios, params.id, auth.usuario, 'El servicio no existe.');
    if (respuesta) return respuesta;

    const existe = recurso.preguntasFrecuentes.some((p) => p.id === Number(params.preguntaId));
    if (!existe) return error(404, 'NO_ENCONTRADO', 'La pregunta frecuente no existe.');

    recurso.preguntasFrecuentes = recurso.preguntasFrecuentes.filter((p) => p.id !== Number(params.preguntaId));
    return new HttpResponse(null, { status: 204 });
  }),

  // ---- §7 Grupos pastorales ----
  http.get(api('/admin/grupos-pastorales'), ({ request }) => {
    const auth = autenticar();
    if (auth.respuesta) return auth.respuesta;

    const filtro = resolverSedeFiltro(request, auth.usuario);
    if (filtro.respuesta) return filtro.respuesta;

    let lista = grupos;
    if (filtro.slugSede) lista = lista.filter((g) => g.sede.slug === filtro.slugSede);

    const visible = filtro.parametros.get('visible');
    if (visible === 'true' || visible === 'false') {
      lista = lista.filter((g) => g.visible === (visible === 'true'));
    }

    return HttpResponse.json({ datos: [...lista].sort((a, b) => a.orden - b.orden) });
  }),

  http.post(api('/admin/grupos-pastorales/reordenar'), async ({ request }) => {
    const auth = autenticar('grupos.gestionar', 'Tu rol no tiene permiso para gestionar grupos pastorales.');
    if (auth.respuesta) return auth.respuesta;

    const cuerpo = await request.json().catch(() => null);
    const res = reordenarPorSede(grupos, cuerpo, auth.usuario);
    return res.respuesta ?? HttpResponse.json({ datos: res.datos });
  }),

  http.get(api('/admin/grupos-pastorales/:id'), ({ params }) => {
    const auth = autenticar();
    if (auth.respuesta) return auth.respuesta;
    const { recurso, respuesta } = leerPorId(grupos, params.id, auth.usuario, 'El grupo pastoral no existe.');
    return respuesta ?? HttpResponse.json({ datos: recurso });
  }),

  http.post(api('/admin/grupos-pastorales'), async ({ request }) => {
    const auth = autenticar('grupos.gestionar', 'Tu rol no tiene permiso para gestionar grupos pastorales.');
    if (auth.respuesta) return auth.respuesta;

    const cuerpo = await request.json().catch(() => null);
    if (!cuerpo) return errorValidacion([{ campo: 'cuerpo', mensaje: 'El cuerpo JSON no es válido.' }]);

    const sedeRes = resolverSedeCreacion(cuerpo, auth.usuario);
    if (sedeRes.respuesta) return sedeRes.respuesta;

    const detalles = [];
    const nombre = typeof cuerpo.nombre === 'string' ? cuerpo.nombre.trim() : '';
    if (!nombre || nombre.length > 100) {
      detalles.push({ campo: 'nombre', mensaje: 'El nombre es obligatorio y admite hasta 100 caracteres.' });
    }
    if (cuerpo.descripcion !== undefined && cuerpo.descripcion !== null && (typeof cuerpo.descripcion !== 'string' || cuerpo.descripcion.length > 2000)) {
      detalles.push({ campo: 'descripcion', mensaje: 'La descripción puede tener hasta 2000 caracteres.' });
    }
    if (cuerpo.horarioReunion !== undefined && cuerpo.horarioReunion !== null && (typeof cuerpo.horarioReunion !== 'string' || cuerpo.horarioReunion.length > 100)) {
      detalles.push({ campo: 'horarioReunion', mensaje: 'El horario de reunión puede tener hasta 100 caracteres.' });
    }
    if (cuerpo.contacto !== undefined && cuerpo.contacto !== null && (typeof cuerpo.contacto !== 'string' || cuerpo.contacto.length > 120)) {
      detalles.push({ campo: 'contacto', mensaje: 'El contacto puede tener hasta 120 caracteres.' });
    }
    if (cuerpo.icono !== undefined && cuerpo.icono !== null && (typeof cuerpo.icono !== 'string' || cuerpo.icono.length > 40)) {
      detalles.push({ campo: 'icono', mensaje: 'El ícono puede tener hasta 40 caracteres.' });
    }
    let imagen = null;
    if (cuerpo.imagenId !== undefined && cuerpo.imagenId !== null) {
      imagen = buscarImagenEnBiblioteca(Number(cuerpo.imagenId));
      if (!imagen) detalles.push({ campo: 'imagenId', mensaje: 'La imagen indicada no existe.' });
    }
    if (detalles.length) return errorValidacion(detalles);

    const deSede = grupos.filter((g) => g.sede.id === sedeRes.sede.id);
    const maxOrden = deSede.reduce((max, g) => Math.max(max, g.orden), 0);

    const nuevo = {
      id: sigGrupoId++,
      sede: sedeRes.sede,
      nombre,
      descripcion: cuerpo.descripcion?.trim() || null,
      horarioReunion: cuerpo.horarioReunion?.trim() || null,
      contacto: cuerpo.contacto?.trim() || null,
      icono: cuerpo.icono?.trim() || null,
      imagen,
      orden: maxOrden + 1,
      visible: cuerpo.visible !== undefined ? Boolean(cuerpo.visible) : true,
    };
    grupos.push(nuevo);
    return HttpResponse.json(
      { datos: nuevo },
      { status: 201, headers: { Location: `/api/admin/grupos-pastorales/${nuevo.id}` } },
    );
  }),

  http.patch(api('/admin/grupos-pastorales/:id'), async ({ request, params }) => {
    const auth = autenticar('grupos.gestionar', 'Tu rol no tiene permiso para gestionar grupos pastorales.');
    if (auth.respuesta) return auth.respuesta;

    const { recurso, respuesta } = leerPorId(grupos, params.id, auth.usuario, 'El grupo pastoral no existe.');
    if (respuesta) return respuesta;

    const cuerpo = await request.json().catch(() => null);
    if (!cuerpo) return errorValidacion([{ campo: 'cuerpo', mensaje: 'El cuerpo JSON no es válido.' }]);

    const detalles = [];
    const nombre = cuerpo.nombre !== undefined ? String(cuerpo.nombre ?? '').trim() : recurso.nombre;
    if (!nombre || nombre.length > 100) {
      detalles.push({ campo: 'nombre', mensaje: 'El nombre es obligatorio y admite hasta 100 caracteres.' });
    }
    if (cuerpo.descripcion !== undefined && cuerpo.descripcion !== null && (typeof cuerpo.descripcion !== 'string' || cuerpo.descripcion.length > 2000)) {
      detalles.push({ campo: 'descripcion', mensaje: 'La descripción puede tener hasta 2000 caracteres.' });
    }
    if (cuerpo.horarioReunion !== undefined && cuerpo.horarioReunion !== null && (typeof cuerpo.horarioReunion !== 'string' || cuerpo.horarioReunion.length > 100)) {
      detalles.push({ campo: 'horarioReunion', mensaje: 'El horario de reunión puede tener hasta 100 caracteres.' });
    }
    if (cuerpo.contacto !== undefined && cuerpo.contacto !== null && (typeof cuerpo.contacto !== 'string' || cuerpo.contacto.length > 120)) {
      detalles.push({ campo: 'contacto', mensaje: 'El contacto puede tener hasta 120 caracteres.' });
    }
    if (cuerpo.icono !== undefined && cuerpo.icono !== null && (typeof cuerpo.icono !== 'string' || cuerpo.icono.length > 40)) {
      detalles.push({ campo: 'icono', mensaje: 'El ícono puede tener hasta 40 caracteres.' });
    }
    let imagen = recurso.imagen;
    if (cuerpo.imagenId !== undefined) {
      if (cuerpo.imagenId === null) {
        imagen = null;
      } else {
        imagen = buscarImagenEnBiblioteca(Number(cuerpo.imagenId));
        if (!imagen) detalles.push({ campo: 'imagenId', mensaje: 'La imagen indicada no existe.' });
      }
    }
    if (detalles.length) return errorValidacion(detalles);

    recurso.nombre = nombre;
    if (cuerpo.descripcion !== undefined) recurso.descripcion = cuerpo.descripcion?.trim() || null;
    if (cuerpo.horarioReunion !== undefined) recurso.horarioReunion = cuerpo.horarioReunion?.trim() || null;
    if (cuerpo.contacto !== undefined) recurso.contacto = cuerpo.contacto?.trim() || null;
    if (cuerpo.icono !== undefined) recurso.icono = cuerpo.icono?.trim() || null;
    recurso.imagen = imagen;
    if (cuerpo.visible !== undefined) recurso.visible = Boolean(cuerpo.visible);

    return HttpResponse.json({ datos: recurso });
  }),

  http.delete(api('/admin/grupos-pastorales/:id'), ({ params }) => {
    const auth = autenticar('grupos.gestionar', 'Tu rol no tiene permiso para gestionar grupos pastorales.');
    if (auth.respuesta) return auth.respuesta;

    const { recurso, respuesta } = leerPorId(grupos, params.id, auth.usuario, 'El grupo pastoral no existe.');
    if (respuesta) return respuesta;

    grupos = grupos.filter((g) => g.id !== recurso.id);
    return new HttpResponse(null, { status: 204 });
  }),

  // ---- §8 Videos ----
  http.get(api('/admin/videos'), ({ request }) => {
    const auth = autenticar();
    if (auth.respuesta) return auth.respuesta;

    const filtro = resolverSedeFiltro(request, auth.usuario);
    if (filtro.respuesta) return filtro.respuesta;

    let lista = videos;
    if (filtro.slugSede) lista = lista.filter((v) => v.sede.slug === filtro.slugSede);

    const destacado = filtro.parametros.get('destacado');
    if (destacado === 'true' || destacado === 'false') {
      lista = lista.filter((v) => v.destacado === (destacado === 'true'));
    }

    return HttpResponse.json({
      datos: [...lista].sort((a, b) => Number(b.destacado) - Number(a.destacado) || a.orden - b.orden),
    });
  }),

  http.post(api('/admin/videos/reordenar'), async ({ request }) => {
    const auth = autenticar('videos.gestionar', 'Tu rol no tiene permiso para gestionar videos.');
    if (auth.respuesta) return auth.respuesta;

    const cuerpo = await request.json().catch(() => null);
    const res = reordenarPorSede(videos, cuerpo, auth.usuario);
    return res.respuesta ?? HttpResponse.json({ datos: res.datos });
  }),

  http.get(api('/admin/videos/:id'), ({ params }) => {
    const auth = autenticar();
    if (auth.respuesta) return auth.respuesta;
    const { recurso, respuesta } = leerPorId(videos, params.id, auth.usuario, 'El video no existe.');
    return respuesta ?? HttpResponse.json({ datos: recurso });
  }),

  http.post(api('/admin/videos'), async ({ request }) => {
    const auth = autenticar('videos.gestionar', 'Tu rol no tiene permiso para gestionar videos.');
    if (auth.respuesta) return auth.respuesta;

    const cuerpo = await request.json().catch(() => null);
    if (!cuerpo) return errorValidacion([{ campo: 'cuerpo', mensaje: 'El cuerpo JSON no es válido.' }]);

    const sedeRes = resolverSedeCreacion(cuerpo, auth.usuario);
    if (sedeRes.respuesta) return sedeRes.respuesta;

    const detalles = [];
    const ytId = extraerYoutubeId(cuerpo.youtube);
    if (!ytId) {
      detalles.push({ campo: 'youtube', mensaje: 'Ingresa una URL o identificador válido de YouTube.' });
    }
    const titulo = typeof cuerpo.titulo === 'string' ? cuerpo.titulo.trim() : '';
    if (!titulo || titulo.length > 160) {
      detalles.push({ campo: 'titulo', mensaje: 'El título es obligatorio y admite hasta 160 caracteres.' });
    }
    if (cuerpo.duracionSegundos !== undefined && cuerpo.duracionSegundos !== null) {
      const dur = Number(cuerpo.duracionSegundos);
      if (!Number.isInteger(dur) || dur <= 0) {
        detalles.push({ campo: 'duracionSegundos', mensaje: 'La duración debe ser un entero positivo en segundos.' });
      }
    }
    if (cuerpo.fechaPublicacion !== undefined && cuerpo.fechaPublicacion !== null && !REGEX_FECHA.test(cuerpo.fechaPublicacion)) {
      detalles.push({ campo: 'fechaPublicacion', mensaje: 'La fecha debe tener formato YYYY-MM-DD.' });
    }
    if (detalles.length) return errorValidacion(detalles);

    if (videos.some((v) => v.youtubeVideoId === ytId)) {
      return error(409, 'CONFLICTO', 'Este video de YouTube ya está registrado.');
    }

    const deSede = videos.filter((v) => v.sede.id === sedeRes.sede.id);
    const maxOrden = deSede.reduce((max, v) => Math.max(max, v.orden), 0);

    const nuevo = construirVideo(cuerpo, sedeRes.sede, maxOrden + 1);
    videos.push(nuevo);
    return HttpResponse.json({ datos: nuevo }, { status: 201, headers: { Location: `/api/admin/videos/${nuevo.id}` } });
  }),

  http.patch(api('/admin/videos/:id'), async ({ request, params }) => {
    const auth = autenticar('videos.gestionar', 'Tu rol no tiene permiso para gestionar videos.');
    if (auth.respuesta) return auth.respuesta;

    const { recurso, respuesta } = leerPorId(videos, params.id, auth.usuario, 'El video no existe.');
    if (respuesta) return respuesta;

    const cuerpo = await request.json().catch(() => null);
    if (!cuerpo) return errorValidacion([{ campo: 'cuerpo', mensaje: 'El cuerpo JSON no es válido.' }]);

    const detalles = [];
    let ytId = recurso.youtubeVideoId;
    if (cuerpo.youtube !== undefined) {
      ytId = extraerYoutubeId(cuerpo.youtube);
      if (!ytId) {
        detalles.push({ campo: 'youtube', mensaje: 'Ingresa una URL o identificador válido de YouTube.' });
      }
    }
    const titulo = cuerpo.titulo !== undefined ? String(cuerpo.titulo ?? '').trim() : recurso.titulo;
    if (!titulo || titulo.length > 160) {
      detalles.push({ campo: 'titulo', mensaje: 'El título es obligatorio y admite hasta 160 caracteres.' });
    }
    if (cuerpo.duracionSegundos !== undefined && cuerpo.duracionSegundos !== null) {
      const dur = Number(cuerpo.duracionSegundos);
      if (!Number.isInteger(dur) || dur <= 0) {
        detalles.push({ campo: 'duracionSegundos', mensaje: 'La duración debe ser un entero positivo en segundos.' });
      }
    }
    if (cuerpo.fechaPublicacion !== undefined && cuerpo.fechaPublicacion !== null && !REGEX_FECHA.test(cuerpo.fechaPublicacion)) {
      detalles.push({ campo: 'fechaPublicacion', mensaje: 'La fecha debe tener formato YYYY-MM-DD.' });
    }
    if (detalles.length) return errorValidacion(detalles);

    if (videos.some((v) => v.id !== recurso.id && v.youtubeVideoId === ytId)) {
      return error(409, 'CONFLICTO', 'Este video de YouTube ya está registrado.');
    }

    const actualizado = construirVideo(cuerpo, recurso.sede, recurso.orden, recurso);
    Object.assign(recurso, actualizado);
    return HttpResponse.json({ datos: recurso });
  }),

  http.delete(api('/admin/videos/:id'), ({ params }) => {
    const auth = autenticar('videos.gestionar', 'Tu rol no tiene permiso para gestionar videos.');
    if (auth.respuesta) return auth.respuesta;

    const { recurso, respuesta } = leerPorId(videos, params.id, auth.usuario, 'El video no existe.');
    if (respuesta) return respuesta;

    videos = videos.filter((v) => v.id !== recurso.id);
    return new HttpResponse(null, { status: 204 });
  }),

  // ---- §9 Sedes y redes sociales ----
  http.get(api('/admin/sedes'), () => {
    const auth = autenticar();
    if (auth.respuesta) return auth.respuesta;

    const lista = esAdministrador(auth.usuario)
      ? sedes
      : sedes.filter((s) => s.id === auth.usuario.sede.id);

    return HttpResponse.json({ datos: lista });
  }),

  http.get(api('/admin/sedes/:id'), ({ params }) => {
    const auth = autenticar();
    if (auth.respuesta) return auth.respuesta;

    const sede = sedes.find((s) => s.id === Number(params.id));
    if (!sede) return error(404, 'NO_ENCONTRADO', 'La sede no existe.');
    if (!esAdministrador(auth.usuario) && sede.id !== auth.usuario.sede.id) return otraSede();

    return HttpResponse.json({ datos: sede });
  }),

  http.post(api('/admin/sedes'), async ({ request }) => {
    const auth = autenticar('sedes.gestionar', 'Solo el Administrador puede crear sedes.');
    if (auth.respuesta) return auth.respuesta;

    const cuerpo = await request.json().catch(() => null);
    if (!cuerpo) return errorValidacion([{ campo: 'cuerpo', mensaje: 'El cuerpo JSON no es válido.' }]);

    const detalles = [];
    const nombre = typeof cuerpo.nombre === 'string' ? cuerpo.nombre.trim() : '';
    if (!nombre || nombre.length > 120) {
      detalles.push({ campo: 'nombre', mensaje: 'El nombre es obligatorio y admite hasta 120 caracteres.' });
    }
    const tipoObj = CATALOGOS.tiposSede.find((t) => t.codigo === cuerpo.tipo);
    if (!tipoObj) {
      detalles.push({ campo: 'tipo', mensaje: 'El tipo de sede debe ser PARROQUIA o CAPILLA.' });
    }
    let sedePadre = null;
    if (cuerpo.sedePadreId !== undefined && cuerpo.sedePadreId !== null) {
      const padre = sedes.find((s) => s.id === Number(cuerpo.sedePadreId));
      if (!padre) detalles.push({ campo: 'sedePadreId', mensaje: 'La sede padre indicada no existe.' });
      else sedePadre = resumenSede(padre);
    }
    if (detalles.length) return errorValidacion(detalles);

    const slug = cuerpo.slug ? aSlug(cuerpo.slug) : aSlug(nombre);
    if (sedes.some((s) => s.slug === slug)) {
      return error(409, 'CONFLICTO', `Ya existe una sede con el slug «${slug}».`);
    }

    const nueva = {
      id: sigSedeId++,
      nombre,
      slug,
      tipo: { codigo: tipoObj.codigo, nombre: tipoObj.nombre },
      sedePadre,
      direccion: cuerpo.direccion?.trim() || null,
      telefono: cuerpo.telefono?.trim() || null,
      whatsapp: cuerpo.whatsapp?.trim() || null,
      correo: cuerpo.correo?.trim() || null,
      ubicacion: null,
      imagenPortada: null,
      redesSociales: [],
      configuracion: {},
      activo: cuerpo.activo !== undefined ? Boolean(cuerpo.activo) : false,
    };
    sedes.push(nueva);
    return HttpResponse.json({ datos: nueva }, { status: 201, headers: { Location: `/api/admin/sedes/${nueva.id}` } });
  }),

  http.patch(api('/admin/sedes/:id'), async ({ request, params }) => {
    const auth = autenticar();
    if (auth.respuesta) return auth.respuesta;

    const puedeGestionarSedes = tienePermiso(auth.usuario, 'sedes.gestionar');
    const puedeEditarPropia = tienePermiso(auth.usuario, 'sede.editar');
    if (!puedeGestionarSedes && !puedeEditarPropia) {
      return sinPermiso('Tu rol no tiene permiso para editar la sede.');
    }

    const sede = sedes.find((s) => s.id === Number(params.id));
    if (!sede) return error(404, 'NO_ENCONTRADO', 'La sede no existe.');
    if (!puedeGestionarSedes && sede.id !== auth.usuario.sede.id) return otraSede();

    const cuerpo = await request.json().catch(() => null);
    if (!cuerpo) return errorValidacion([{ campo: 'cuerpo', mensaje: 'El cuerpo JSON no es válido.' }]);

    const camposSoloAdmin = ['slug', 'tipo', 'sedePadreId', 'activo'];
    if (!puedeGestionarSedes && camposSoloAdmin.some((c) => c in cuerpo)) {
      return sinPermiso('Tu rol no tiene permiso para cambiar el estado o estructura de la sede.');
    }

    const detalles = [];
    if (cuerpo.nombre !== undefined) {
      const n = String(cuerpo.nombre ?? '').trim();
      if (!n || n.length > 120) {
        detalles.push({ campo: 'nombre', mensaje: 'El nombre es obligatorio y admite hasta 120 caracteres.' });
      }
    }
    if (cuerpo.correo !== undefined && cuerpo.correo !== null && cuerpo.correo !== '') {
      if (typeof cuerpo.correo !== 'string' || cuerpo.correo.length > 120 || !REGEX_CORREO.test(cuerpo.correo.trim())) {
        detalles.push({ campo: 'correo', mensaje: 'El correo no tiene un formato válido.' });
      }
    }
    const tieneLat = 'latitud' in cuerpo;
    const tieneLon = 'longitud' in cuerpo;
    if (tieneLat !== tieneLon) {
      detalles.push({
        campo: tieneLat ? 'longitud' : 'latitud',
        mensaje: 'Debes enviar latitud y longitud juntas.',
      });
    } else if (tieneLat && (cuerpo.latitud !== null || cuerpo.longitud !== null)) {
      const lat = Number(cuerpo.latitud);
      const lon = Number(cuerpo.longitud);
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
        detalles.push({ campo: 'latitud', mensaje: 'La latitud debe ser un número entre -90 y 90.' });
      }
      if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
        detalles.push({ campo: 'longitud', mensaje: 'La longitud debe ser un número entre -180 y 180.' });
      }
    }

    let imagenPortada = sede.imagenPortada;
    if (cuerpo.imagenPortadaId !== undefined) {
      if (cuerpo.imagenPortadaId === null) {
        imagenPortada = null;
      } else {
        imagenPortada = buscarImagenEnBiblioteca(Number(cuerpo.imagenPortadaId));
        if (!imagenPortada) {
          detalles.push({ campo: 'imagenPortadaId', mensaje: 'La imagen de portada indicada no existe.' });
        }
      }
    }

    let redesActualizadas;
    if (cuerpo.redesSociales !== undefined) {
      if (!Array.isArray(cuerpo.redesSociales)) {
        detalles.push({ campo: 'redesSociales', mensaje: 'Las redes sociales deben ser una lista.' });
      } else {
        redesActualizadas = [];
        cuerpo.redesSociales.forEach((item, i) => {
          const cat = CATALOGOS.redesSociales.find((r) => r.id === Number(item?.redSocialId));
          if (!cat) {
            detalles.push({ campo: `redesSociales.${i}.redSocialId`, mensaje: 'La red social no es válida.' });
            return;
          }
          const url = typeof item.url === 'string' ? item.url.trim() : '';
          if (!url.startsWith('https://')) {
            detalles.push({ campo: `redesSociales.${i}.url`, mensaje: 'La URL debe empezar con https://.' });
            return;
          }
          redesActualizadas.push({ id: cat.id, nombre: cat.nombre, icono: cat.icono, url });
        });
      }
    }

    if (detalles.length) return errorValidacion(detalles);

    if (cuerpo.nombre !== undefined) sede.nombre = cuerpo.nombre.trim();
    if (cuerpo.direccion !== undefined) sede.direccion = cuerpo.direccion?.trim() || null;
    if (cuerpo.telefono !== undefined) sede.telefono = cuerpo.telefono?.trim() || null;
    if (cuerpo.whatsapp !== undefined) sede.whatsapp = cuerpo.whatsapp?.trim() || null;
    if (cuerpo.correo !== undefined) sede.correo = cuerpo.correo?.trim() || null;
    if (tieneLat) {
      sede.ubicacion =
        cuerpo.latitud === null ? null : { latitud: Number(cuerpo.latitud), longitud: Number(cuerpo.longitud) };
    }
    sede.imagenPortada = imagenPortada;
    if (redesActualizadas !== undefined) sede.redesSociales = redesActualizadas;
    if (cuerpo.configuracion && typeof cuerpo.configuracion === 'object') {
      const copia = { ...sede.configuracion };
      for (const [clave, valor] of Object.entries(cuerpo.configuracion)) {
        if (valor === null) delete copia[clave];
        else copia[clave] = valor;
      }
      sede.configuracion = copia;
    }
    if (puedeGestionarSedes) {
      if (cuerpo.slug !== undefined) sede.slug = aSlug(cuerpo.slug);
      if (cuerpo.activo !== undefined) sede.activo = Boolean(cuerpo.activo);
    }

    return HttpResponse.json({ datos: sede });
  }),

  ...controladorPaginas.handlers,
];
