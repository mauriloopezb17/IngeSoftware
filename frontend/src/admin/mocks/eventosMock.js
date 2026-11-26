// Eventos simulados del panel (docs/api/admin.md §4): estado en memoria, filtros, validaciones,
// permisos (eventos.gestionar) y la regla de «finalizado» del portal (publico.md, RF-09).
// Los primeros cuatro son los de la landing (a 6, 7, 8 y 13 días de hoy); el 5 es el ejemplo del contrato.
import { http, HttpResponse } from 'msw';

import { api } from '../../mocks/api.js';
import { CATALOGOS } from '../contenido/mocks/datos.js';
import {
  autenticar,
  autorDe,
  autorizar,
  camposNoPermitidos,
  consultaInvalida,
  cuerpoInvalido,
  errorValidacion,
  esFechaHoraConZona,
  esFechaSimple,
  leerCuerpo,
  leerDeLaSede,
  leerPaginacion,
  paginar,
  respuestaError,
  sedeDeLaLista,
} from './apoyoMock.js';
import { buscarArchivo, buscarArchivoPorUrl } from './multimediaMock.js';
import { fechaBolivia, SEDE_PRINCIPAL } from './usuarios.js';

const CATEGORIAS_EVENTO = CATALOGOS.categoriasEvento;
const ESTADOS = {
  BORRADOR: { codigo: 'BORRADOR', nombre: 'Borrador' },
  PUBLICADO: { codigo: 'PUBLICADO', nombre: 'Publicado' },
  ARCHIVADO: { codigo: 'ARCHIVADO', nombre: 'Archivado' },
};
const SECRETARIA = { id: 3, nombreCompleto: 'Secretaría (desarrollo)' };
const PARROCO = { id: 2, nombreCompleto: 'Párroco (desarrollo)' };

const DIA = 24 * 60 * 60 * 1000;
// Día relativo a hoy (en Bolivia) a una hora fija: "2026-11-18T19:00:00-04:00".
function diaRelativo(dias, hora) {
  const dia = fechaBolivia(new Date(Date.now() + dias * DIA)).slice(0, 10);
  return `${dia}T${hora}:00-04:00`;
}

const categoria = (id) => CATEGORIAS_EVENTO.find((c) => c.id === id);

const evento = (datos) => ({
  sede: SEDE_PRINCIPAL,
  estado: ESTADOS.PUBLICADO,
  descripcion: null,
  lugar: 'Templo parroquial',
  fechaFin: null,
  todoElDia: false,
  imagenId: null,
  detalle: null,
  idExternoM365: null,
  creadoPor: SECRETARIA,
  ...datos,
});

function crearEventosIniciales() {
  return [
    evento({ id: 1, titulo: 'Adoración eucarística comunitaria', fechaInicio: diaRelativo(6, '19:00'), categoria: categoria(1) }),
    evento({
      id: 2,
      titulo: 'Misa de sanación',
      descripcion: 'Horarios: 8:00 – 10:00 – 12:00',
      fechaInicio: diaRelativo(7, '08:00'),
      categoria: categoria(2),
      detalle: {
        contenido: {
          formato: 'blocknote',
          version: 1,
          bloques: [
            {
              id: 'ev-ejemplo-p1',
              type: 'paragraph',
              props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
              content: [
                {
                  type: 'text',
                  text: 'Celebración comunitaria y oración por los enfermos (texto de ejemplo).',
                  styles: {},
                },
              ],
              children: [],
            },
          ],
        },
        direccion: 'Av. Héctor Ormachea N.º 167, Obrajes, La Paz',
        enlaceMapa: 'https://www.google.com/maps/search/?api=1&query=-16.5267952%2C-68.1082157',
        programa: [
          { hora: '08:00', actividad: 'Primera misa de sanación (ejemplo)' },
          { hora: '10:00', actividad: 'Misa central (ejemplo)' },
          { hora: '12:00', actividad: 'Tercera misa (ejemplo)' },
        ],
        responsable: {
          nombre: 'Equipo de Liturgia (ejemplo)',
          rol: 'Coordinación pastoral',
          telefono: '(2) 278 4937',
          correo: null,
        },
        enlaces: [],
      },
    }),
    evento({ id: 3, titulo: 'Misa por los difuntos de la comunidad', fechaInicio: diaRelativo(8, '19:00'), categoria: categoria(1) }),
    evento({
      id: 4,
      titulo: 'Charla pre-bautismal para padres y padrinos',
      lugar: 'Salón parroquial',
      fechaInicio: diaRelativo(13, '09:30'),
      categoria: categoria(3),
    }),
    evento({
      id: 5,
      titulo: 'Solemnidad de Cristo Rey del Universo',
      descripcion: 'Santa Misa solemne y procesión con el Santísimo alrededor de la plaza.',
      fechaInicio: diaRelativo(9, '10:00'),
      fechaFin: diaRelativo(9, '12:00'),
      categoria: categoria(2),
      imagenId: 3,
    }),
    evento({
      id: 6,
      titulo: 'Kermés parroquial',
      descripcion: 'Comidas típicas, juegos y rifa a beneficio de la obra del atrio.',
      lugar: 'Atrio de la parroquia',
      fechaInicio: diaRelativo(-10, '00:00'),
      todoElDia: true,
      categoria: categoria(4),
      creadoPor: PARROCO,
    }),
    evento({
      id: 7,
      titulo: 'Retiro de catequistas',
      lugar: 'Casa de retiros de Obrajes',
      fechaInicio: diaRelativo(-3, '08:00'),
      fechaFin: diaRelativo(-3, '17:00'),
      categoria: categoria(3),
    }),
    evento({
      id: 8,
      titulo: 'Concierto de villancicos',
      fechaInicio: diaRelativo(30, '19:30'),
      categoria: categoria(4),
      estado: ESTADOS.BORRADOR,
    }),
    evento({
      id: 9,
      titulo: 'Novena al Señor de la Exaltación (suspendida)',
      fechaInicio: diaRelativo(20, '18:30'),
      categoria: categoria(1),
      estado: ESTADOS.ARCHIVADO,
    }),
  ];
}

let eventos = crearEventosIniciales();
let siguienteId = 10;

export function reiniciarEventos() {
  eventos = crearEventosIniciales();
  siguienteId = 10;
}

export const listaEventos = () => eventos;

// ---- Regla de «finalizado» (publico.md, GET /eventos) ----

const finDelDia = (iso) => new Date(`${fechaBolivia(new Date(iso)).slice(0, 10)}T23:59:59-04:00`);

// Con fechaFin, termina en fechaFin (si es de todo el día, al final de ese día); sin fechaFin, al final
// del día de fechaInicio, en hora de Bolivia.
export function finDelEvento(ev) {
  if (ev.fechaFin) return ev.todoElDia ? finDelDia(ev.fechaFin) : new Date(ev.fechaFin);
  return finDelDia(ev.fechaInicio);
}

export const estaFinalizado = (ev, ahora = new Date()) => finDelEvento(ev) <= ahora;

function imagenDe(id) {
  const archivo = id ? buscarArchivo(id) : null;
  if (!archivo || !archivo.tipoMime.startsWith('image/')) return null;
  return {
    id: archivo.id,
    url: archivo.url,
    textoAlternativo: archivo.textoAlternativo ?? null,
    ancho: archivo.ancho ?? null,
    alto: archivo.alto ?? null,
    variantes: archivo.variantes ?? [],
  };
}

export function serializarEvento(ev) {
  const { imagenId, ...resto } = ev;
  return { ...resto, imagen: imagenDe(imagenId), finalizado: estaFinalizado(ev) };
}

// ---- Validación (admin.md §4) ----

// Cuerpos estrictos como en la API: idExternoM365 (solo lectura) u otro campo desconocido es «Campo no permitido.».
const CAMPOS_EDITAR = [
  'titulo',
  'descripcion',
  'lugar',
  'fechaInicio',
  'fechaFin',
  'todoElDia',
  'categoriaEventoId',
  'imagenId',
  'estado',
  'detalle',
];
const CAMPOS_CREAR = ['sedeId', ...CAMPOS_EDITAR];
const CAMPOS_DETALLE = ['contenido', 'direccion', 'enlaceMapa', 'programa', 'responsable', 'enlaces'];

function esGoogleMapsValido(valor) {
  try {
    const url = new URL(valor);
    if (url.protocol !== 'https:') return false;
    const host = url.hostname.toLowerCase();
    if (host === 'maps.app.goo.gl') return url.pathname.length > 1;
    if (host === 'goo.gl') return url.pathname.startsWith('/maps/');
    if (/^(www\.)?google\.[a-z.]{2,10}$/.test(host)) return url.pathname.startsWith('/maps');
    if (/^maps\.google\.[a-z.]{2,10}$/.test(host)) return true;
    return false;
  } catch {
    return false;
  }
}

function esUrlHttpsValida(valor) {
  try {
    return /^https:\/\/\S+$/i.test(valor) && new URL(valor).protocol === 'https:';
  } catch {
    return false;
  }
}

function validarBloquesDetalle(bloques, sede, prefijo, detalles) {
  if (!Array.isArray(bloques)) {
    detalles.push({ campo: `${prefijo}.bloques`, mensaje: 'Debe ser una lista de bloques.' });
    return;
  }
  bloques.forEach((bloque, indice) => {
    if (bloque?.type === 'image' || bloque?.type === 'video') {
      const clase = bloque.type === 'image' ? 'image/' : 'video/';
      const archivo = buscarArchivoPorUrl(bloque.props?.url);
      if (!archivo || archivo.sede.id !== sede.id) {
        detalles.push({
          campo: `${prefijo}.bloques.${indice}.props.url`,
          mensaje: `Debe ser ${bloque.type === 'image' ? 'una imagen' : 'un video'} de la biblioteca multimedia de esta sede.`,
        });
      } else if (!archivo.tipoMime.startsWith(clase)) {
        detalles.push({
          campo: `${prefijo}.bloques.${indice}.props.url`,
          mensaje: `El archivo no es ${bloque.type === 'image' ? 'una imagen' : 'un video'}.`,
        });
      }
    }
    if (Array.isArray(bloque?.children) && bloque.children.length > 0) {
      validarBloquesDetalle(bloque.children, sede, `${prefijo}.bloques.${indice}.children`, detalles);
    }
  });
}

function validarDetalle(detalle, { sede }) {
  const detalles = [];
  if (detalle === null) return detalles;
  if (!detalle || typeof detalle !== 'object' || Array.isArray(detalle)) {
    return [{ campo: 'detalle', mensaje: 'Debe ser un objeto o null.' }];
  }

  for (const clave of Object.keys(detalle)) {
    if (!CAMPOS_DETALLE.includes(clave)) {
      detalles.push({ campo: `detalle.${clave}`, mensaje: 'Campo no permitido.' });
    }
  }

  if (detalle.contenido !== undefined && detalle.contenido !== null) {
    if (typeof detalle.contenido !== 'object' || detalle.contenido.formato !== 'blocknote' || detalle.contenido.version !== 1) {
      detalles.push({ campo: 'detalle.contenido', mensaje: 'Documento BlockNote inválido.' });
    } else {
      validarBloquesDetalle(detalle.contenido.bloques, sede, 'detalle.contenido', detalles);
    }
  }

  if (detalle.direccion !== undefined && detalle.direccion !== null) {
    if (typeof detalle.direccion !== 'string' || detalle.direccion.trim().length > 200) {
      detalles.push({ campo: 'detalle.direccion', mensaje: 'Puede tener hasta 200 caracteres.' });
    }
  }

  if (detalle.enlaceMapa !== undefined && detalle.enlaceMapa !== null && detalle.enlaceMapa !== '') {
    if (typeof detalle.enlaceMapa !== 'string' || detalle.enlaceMapa.trim().length > 1000 || !esGoogleMapsValido(detalle.enlaceMapa.trim())) {
      detalles.push({ campo: 'detalle.enlaceMapa', mensaje: 'Debe ser una URL https:// de Google Maps.' });
    }
  }

  if (detalle.programa !== undefined) {
    if (!Array.isArray(detalle.programa) || detalle.programa.length > 20) {
      detalles.push({ campo: 'detalle.programa', mensaje: 'Puede tener hasta 20 actividades.' });
    } else {
      detalle.programa.forEach((item, i) => {
        if (!item || typeof item !== 'object') {
          detalles.push({ campo: `detalle.programa.${i}`, mensaje: 'Actividad inválida.' });
          return;
        }
        if (typeof item.hora !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.hora.trim())) {
          detalles.push({ campo: `detalle.programa.${i}.hora`, mensaje: 'Debe tener formato HH:MM (24 horas).' });
        }
        if (typeof item.actividad !== 'string' || !item.actividad.trim() || item.actividad.trim().length > 120) {
          detalles.push({ campo: `detalle.programa.${i}.actividad`, mensaje: 'Debe tener entre 1 y 120 caracteres.' });
        }
      });
    }
  }

  if (detalle.responsable !== undefined && detalle.responsable !== null) {
    const r = detalle.responsable;
    if (typeof r !== 'object' || Array.isArray(r)) {
      detalles.push({ campo: 'detalle.responsable', mensaje: 'Debe ser un objeto o null.' });
    } else {
      for (const k of Object.keys(r)) {
        if (!['nombre', 'rol', 'telefono', 'correo'].includes(k)) {
          detalles.push({ campo: `detalle.responsable.${k}`, mensaje: 'Campo no permitido.' });
        }
      }
      if (typeof r.nombre !== 'string' || !r.nombre.trim() || r.nombre.trim().length > 120) {
        detalles.push({ campo: 'detalle.responsable.nombre', mensaje: 'Es obligatorio y puede tener hasta 120 caracteres.' });
      }
      if (r.rol !== undefined && r.rol !== null && (typeof r.rol !== 'string' || r.rol.trim().length > 80)) {
        detalles.push({ campo: 'detalle.responsable.rol', mensaje: 'Puede tener hasta 80 caracteres.' });
      }
      if (r.telefono !== undefined && r.telefono !== null && r.telefono !== '' && (typeof r.telefono !== 'string' || !/^[+\d()\s.-]{5,30}$/.test(r.telefono.trim()))) {
        detalles.push({ campo: 'detalle.responsable.telefono', mensaje: 'Debe ser un número de teléfono válido.' });
      }
      if (r.correo !== undefined && r.correo !== null && r.correo !== '' && (typeof r.correo !== 'string' || r.correo.trim().length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.correo.trim()))) {
        detalles.push({ campo: 'detalle.responsable.correo', mensaje: 'Debe ser un correo electrónico válido.' });
      }
    }
  }

  if (detalle.enlaces !== undefined) {
    if (!Array.isArray(detalle.enlaces) || detalle.enlaces.length > 10) {
      detalles.push({ campo: 'detalle.enlaces', mensaje: 'Puede tener hasta 10 enlaces.' });
    } else {
      detalle.enlaces.forEach((item, i) => {
        if (!item || typeof item !== 'object') {
          detalles.push({ campo: `detalle.enlaces.${i}`, mensaje: 'Enlace inválido.' });
          return;
        }
        if (typeof item.texto !== 'string' || !item.texto.trim() || item.texto.trim().length > 80) {
          detalles.push({ campo: `detalle.enlaces.${i}.texto`, mensaje: 'Debe tener entre 1 y 80 caracteres.' });
        }
        if (typeof item.url !== 'string' || item.url.trim().length > 500 || !esUrlHttpsValida(item.url.trim())) {
          detalles.push({ campo: `detalle.enlaces.${i}.url`, mensaje: 'Debe ser una URL que empiece con https://.' });
        }
      });
    }
  }

  return detalles;
}

function normalizarDetalle(detalle) {
  if (detalle === null || detalle === undefined) return null;
  const r = detalle.responsable;
  return {
    contenido: detalle.contenido ?? null,
    direccion: detalle.direccion?.trim() || null,
    enlaceMapa: detalle.enlaceMapa?.trim() || null,
    programa: (detalle.programa ?? [])
      .map((item) => ({ hora: item.hora.trim(), actividad: item.actividad.trim() }))
      .sort((a, b) => a.hora.localeCompare(b.hora)),
    responsable: r
      ? {
          nombre: r.nombre.trim(),
          rol: r.rol?.trim() || null,
          telefono: r.telefono?.trim() || null,
          correo: r.correo?.trim() || null,
        }
      : null,
    enlaces: (detalle.enlaces ?? []).map((item) => ({
      texto: item.texto.trim(),
      url: item.url.trim(),
    })),
  };
}

function validar(cuerpo, { parcial, sede }) {
  const detalles = camposNoPermitidos(cuerpo, parcial ? CAMPOS_EDITAR : CAMPOS_CREAR);
  const mal = (campo, mensaje) => detalles.push({ campo, mensaje });
  const enviado = (campo) => !parcial || campo in cuerpo;
  const opcional = (campo) => campo in cuerpo && cuerpo[campo] !== null;

  if (enviado('titulo')) {
    const titulo = typeof cuerpo.titulo === 'string' ? cuerpo.titulo.trim() : '';
    if (titulo.length < 3 || titulo.length > 200) mal('titulo', 'El título debe tener entre 3 y 200 caracteres.');
  }
  if (enviado('fechaInicio') && !esFechaHoraConZona(cuerpo.fechaInicio))
    mal('fechaInicio', 'La fecha de inicio es obligatoria, con fecha, hora y zona.');
  if (opcional('fechaFin') && !esFechaHoraConZona(cuerpo.fechaFin))
    mal('fechaFin', 'Debe ser una fecha y hora con zona.');
  if ('todoElDia' in cuerpo && typeof cuerpo.todoElDia !== 'boolean') mal('todoElDia', 'Debe ser verdadero o falso.');
  if (enviado('categoriaEventoId')) {
    if (cuerpo.categoriaEventoId === undefined || cuerpo.categoriaEventoId === null) mal('categoriaEventoId', 'Es obligatorio.');
    else if (!CATEGORIAS_EVENTO.some((c) => c.id === cuerpo.categoriaEventoId))
      mal('categoriaEventoId', 'La categoría no existe.');
  }
  if ('estado' in cuerpo && !(cuerpo.estado in ESTADOS))
    mal('estado', 'Debe ser PUBLICADO, BORRADOR o ARCHIVADO. Los eventos no usan EN_REVISION.');
  if (opcional('descripcion') && (typeof cuerpo.descripcion !== 'string' || cuerpo.descripcion.length > 2000))
    mal('descripcion', 'La descripción puede tener hasta 2000 caracteres.');
  if (opcional('lugar') && (typeof cuerpo.lugar !== 'string' || cuerpo.lugar.length > 150))
    mal('lugar', 'El lugar puede tener hasta 150 caracteres.');
  if (opcional('imagenId')) {
    const archivo = buscarArchivo(cuerpo.imagenId);
    if (!archivo || archivo.sede.id !== sede.id)
      mal('imagenId', 'Debe ser una imagen de la biblioteca multimedia de esta sede.');
    else if (!archivo.tipoMime.startsWith('image/')) mal('imagenId', 'El archivo no es una imagen.');
  }
  if ('detalle' in cuerpo) {
    detalles.push(...validarDetalle(cuerpo.detalle, { sede }));
  }
  return detalles;
}

function aplicar(ev, cuerpo) {
  if ('titulo' in cuerpo) ev.titulo = cuerpo.titulo.trim();
  if ('descripcion' in cuerpo) ev.descripcion = cuerpo.descripcion?.trim() || null;
  if ('lugar' in cuerpo) ev.lugar = cuerpo.lugar?.trim() || null;
  if ('fechaInicio' in cuerpo) ev.fechaInicio = fechaBolivia(new Date(cuerpo.fechaInicio));
  if ('fechaFin' in cuerpo) ev.fechaFin = cuerpo.fechaFin ? fechaBolivia(new Date(cuerpo.fechaFin)) : null;
  if ('todoElDia' in cuerpo) ev.todoElDia = cuerpo.todoElDia;
  if ('categoriaEventoId' in cuerpo) ev.categoria = categoria(cuerpo.categoriaEventoId);
  if ('imagenId' in cuerpo) ev.imagenId = cuerpo.imagenId;
  if ('estado' in cuerpo) ev.estado = ESTADOS[cuerpo.estado];
  if ('detalle' in cuerpo) ev.detalle = normalizarDetalle(cuerpo.detalle);
}

const finAntesDeInicio = (ev) =>
  ev.fechaFin && new Date(ev.fechaFin) < new Date(ev.fechaInicio)
    ? [{ campo: 'fechaFin', mensaje: 'La fecha de fin debe ser igual o posterior a la de inicio.' }]
    : [];

// ---- Listado ----

function listar(parametros, slugSede) {
  const detalles = [];
  const paginacion = leerPaginacion(parametros);
  if (paginacion.detalles) detalles.push(...paginacion.detalles);

  const desde = parametros.get('desde');
  const hasta = parametros.get('hasta');
  if (desde && !esFechaSimple(desde)) detalles.push({ campo: 'query.desde', mensaje: 'Debe ser una fecha YYYY-MM-DD.' });
  if (hasta && !esFechaSimple(hasta)) detalles.push({ campo: 'query.hasta', mensaje: 'Debe ser una fecha YYYY-MM-DD.' });

  const categorias = (parametros.get('categoria') ?? '').split(',').filter(Boolean).map(Number);
  if (categorias.some((id) => !Number.isInteger(id)))
    detalles.push({ campo: 'query.categoria', mensaje: 'Deben ser ids de categoría separados por comas.' });

  const estados = (parametros.get('estado') ?? '').split(',').filter(Boolean);
  if (estados.some((e) => !(e in ESTADOS)))
    detalles.push({ campo: 'query.estado', mensaje: 'Valores permitidos: BORRADOR, PUBLICADO, ARCHIVADO.' });

  const finalizados = parametros.get('finalizados');
  if (finalizados && finalizados !== 'true' && finalizados !== 'false')
    detalles.push({ campo: 'query.finalizados', mensaje: 'Debe ser true o false.' });

  const orden = parametros.get('orden') ?? 'fechaInicio';
  if (orden !== 'fechaInicio' && orden !== '-fechaInicio')
    detalles.push({ campo: 'query.orden', mensaje: 'Orden no válido: fechaInicio o -fechaInicio.' });

  if (desde && hasta && !detalles.length && hasta < desde)
    detalles.push({ campo: 'query.hasta', mensaje: 'Debe ser igual o posterior a desde.' });
  if (detalles.length) return { detalles };

  const diaDe = (iso) => fechaBolivia(new Date(iso)).slice(0, 10);
  const ahora = new Date();
  let resultado = eventos.filter(
    (ev) =>
      (!slugSede || ev.sede.slug === slugSede) &&
      // Todo evento que se cruce con el rango de días (hora de Bolivia), no solo los que empiezan en él.
      (!desde || diaDe(ev.fechaFin ?? ev.fechaInicio) >= desde) &&
      (!hasta || diaDe(ev.fechaInicio) <= hasta) &&
      (!categorias.length || categorias.includes(ev.categoria.id)) &&
      (!estados.length || estados.includes(ev.estado.codigo)) &&
      (!finalizados || estaFinalizado(ev, ahora) === (finalizados === 'true')),
  );
  resultado = [...resultado].sort((a, b) => new Date(a.fechaInicio) - new Date(b.fechaInicio));
  if (orden.startsWith('-')) resultado.reverse();

  const pagina = paginar(resultado, paginacion);
  return { ...pagina, datos: pagina.datos.map(serializarEvento) };
}

const SIN_PERMISO = 'Tu rol no tiene permiso para gestionar el calendario parroquial.';
const NO_EXISTE = 'El evento no existe.';

export const handlersEventos = [
  http.get(api('/admin/eventos'), ({ request }) => {
    const { usuario, respuesta } = autenticar();
    if (respuesta) return respuesta;
    const parametros = new URL(request.url).searchParams;
    const sede = sedeDeLaLista(parametros, usuario);
    if (sede.respuesta) return sede.respuesta;

    const resultado = listar(parametros, sede.slugSede);
    if (resultado.detalles) return consultaInvalida(resultado.detalles);
    return HttpResponse.json(resultado);
  }),

  http.get(api('/admin/eventos/:id'), ({ params }) => {
    const { usuario, respuesta } = autenticar();
    if (respuesta) return respuesta;
    const leido = leerDeLaSede(eventos, params.id, usuario, NO_EXISTE);
    if (leido.respuesta) return leido.respuesta;
    return HttpResponse.json({ datos: serializarEvento(leido.recurso) });
  }),

  http.post(api('/admin/eventos'), async ({ request }) => {
    const { usuario, respuesta } = autorizar('eventos.gestionar', SIN_PERMISO);
    if (respuesta) return respuesta;
    const cuerpo = await leerCuerpo(request);
    if (!cuerpo) return cuerpoInvalido();

    const sede = usuario.sede ?? SEDE_PRINCIPAL;
    const detalles = validar(cuerpo, { parcial: false, sede });
    const nuevo = evento({ id: siguienteId, sede, creadoPor: autorDe(usuario), lugar: null });
    if (!detalles.length) {
      aplicar(nuevo, { estado: 'PUBLICADO', todoElDia: false, ...cuerpo });
      detalles.push(...finAntesDeInicio(nuevo));
    }
    if (detalles.length) return respuestaError(errorValidacion(detalles).error);

    siguienteId += 1;
    eventos.push(nuevo);
    return HttpResponse.json(
      { datos: serializarEvento(nuevo) },
      { status: 201, headers: { Location: `/api/admin/eventos/${nuevo.id}` } },
    );
  }),

  http.patch(api('/admin/eventos/:id'), async ({ request, params }) => {
    const { usuario, respuesta } = autorizar('eventos.gestionar', SIN_PERMISO);
    if (respuesta) return respuesta;
    const leido = leerDeLaSede(eventos, params.id, usuario, NO_EXISTE);
    if (leido.respuesta) return leido.respuesta;
    const cuerpo = await leerCuerpo(request);
    if (!cuerpo) return cuerpoInvalido();

    const detalles = validar(cuerpo, { parcial: true, sede: leido.recurso.sede });
    if (detalles.length) return respuestaError(errorValidacion(detalles).error);
    const copia = { ...leido.recurso };
    aplicar(copia, cuerpo);
    const fechas = finAntesDeInicio(copia);
    if (fechas.length) return respuestaError(errorValidacion(fechas).error);

    Object.assign(leido.recurso, copia);
    return HttpResponse.json({ datos: serializarEvento(leido.recurso) });
  }),

  http.patch(api('/admin/eventos/:id/detalle'), async ({ request, params }) => {
    const { respuesta } = autorizar('eventos.detalle', 'Tu rol no tiene permiso para editar la página de los eventos.');
    if (respuesta) return respuesta;
    const { usuario } = autenticar();
    const leido = leerDeLaSede(eventos, params.id, usuario, NO_EXISTE);
    if (leido.respuesta) return leido.respuesta;
    const cuerpo = await leerCuerpo(request);
    if (!cuerpo) return cuerpoInvalido();

    const detalles = camposNoPermitidos(cuerpo, ['detalle']);
    if (!('detalle' in cuerpo)) detalles.push({ campo: 'detalle', mensaje: 'Es obligatorio.' });
    else detalles.push(...validarDetalle(cuerpo.detalle, { sede: leido.recurso.sede }));
    if (detalles.length) return respuestaError(errorValidacion(detalles).error);

    leido.recurso.detalle = normalizarDetalle(cuerpo.detalle);
    return HttpResponse.json({ datos: serializarEvento(leido.recurso) });
  }),

  http.delete(api('/admin/eventos/:id'), ({ params }) => {
    const { usuario, respuesta } = autorizar('eventos.gestionar', SIN_PERMISO);
    if (respuesta) return respuesta;
    const leido = leerDeLaSede(eventos, params.id, usuario, NO_EXISTE);
    if (leido.respuesta) return leido.respuesta;
    eventos = eventos.filter((ev) => ev.id !== leido.recurso.id);
    return new HttpResponse(null, { status: 204 });
  }),
];
