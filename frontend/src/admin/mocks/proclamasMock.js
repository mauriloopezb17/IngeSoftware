// Proclamas simuladas del panel (docs/api/admin.md §10, RF-02): estado en memoria, filtros, validaciones,
// permisos (proclamas.gestionar) y reglas de sus publicaciones (hasta 3, fechas crecientes y anteriores al
// matrimonio; solo se quita la última; no se elimina una proclama con publicaciones ya alcanzadas).
import { http, HttpResponse } from 'msw';

import { api } from '../../mocks/api.js';
import {
  autenticar,
  autorizar,
  camposNoPermitidos,
  conflicto,
  consultaInvalida,
  cuerpoInvalido,
  errorValidacion,
  esFechaHoraConZona,
  esFechaSimple,
  hoyBolivia,
  leerCuerpo,
  leerDeLaSede,
  leerPaginacion,
  paginar,
  respuestaError,
  sedeDeLaLista,
} from './apoyoMock.js';
import { fechaBolivia, SEDE_PRINCIPAL } from './usuarios.js';

const DIA = 24 * 60 * 60 * 1000;
const dia = (n) => hoyBolivia(new Date(Date.now() + n * DIA)); // "YYYY-MM-DD" a n días de hoy
const matrimonio = (n, hora = '12:00') => `${dia(n)}T${hora}:00-04:00`;
const diaDe = (iso) => fechaBolivia(new Date(iso)).slice(0, 10);

const MAX_PUBLICACIONES = 3;

const proclama = (id, contrayente1, contrayente2, fechaMatrimonio, fechas) => ({
  id,
  sede: SEDE_PRINCIPAL,
  contrayente1,
  contrayente2,
  fechaMatrimonio,
  tramiteOrigenId: null,
  fechaRegistro: matrimonio(-40, '11:20'),
  publicaciones: fechas.map((fecha, i) => ({ numero: i + 1, fecha })),
});

// Los nombres son los ficticios de la landing (publico.md). Las fechas son relativas a hoy para que
// cada caso (vigente, programada, celebrada) lo siga siendo.
function crearProclamasIniciales() {
  return [
    proclama(1, 'Juan Carlos M. Q.', 'María Fernanda R. V.', matrimonio(1, '11:00'), [dia(-19), dia(-12), dia(-5)]),
    proclama(2, 'Diego A. Choque L.', 'Camila S. Paredes', matrimonio(8, '16:00'), [dia(-12), dia(-5)]),
    proclama(3, 'Luis F. Gutiérrez', 'Andrea Mamani C.', matrimonio(22), [dia(-5)]),
    proclama(4, 'Rodrigo T. Vargas', 'Daniela P. Quispe', matrimonio(40, '10:00'), [dia(3)]), // programada
    proclama(5, 'Marcelo J. Flores', 'Lucía E. Condori', matrimonio(-10, '17:00'), [dia(-31), dia(-24), dia(-17)]), // celebrada
  ];
}

let proclamas = crearProclamasIniciales();
let siguienteId = 6;

export function reiniciarProclamas() {
  proclamas = crearProclamasIniciales();
  siguienteId = 6;
}

const alcanzada = (pub, hoy) => pub.fecha <= hoy;

// Última proclama ya publicada (cuya fecha llegó); null si ninguna ha llegado todavía.
function numeroActual(p, hoy) {
  const llegadas = p.publicaciones.filter((pub) => alcanzada(pub, hoy));
  return llegadas.length ? llegadas[llegadas.length - 1].numero : null;
}

// `vigente`: al menos una publicación ya alcanzada y el matrimonio no pasó (admin.md §10).
const esVigente = (p, ahora = new Date()) =>
  p.publicaciones.some((pub) => alcanzada(pub, hoyBolivia(ahora))) && new Date(p.fechaMatrimonio) > ahora;

export function serializarProclama(p) {
  const hoy = hoyBolivia();
  return {
    ...p,
    publicaciones: p.publicaciones.map((pub) => ({ ...pub })),
    numeroProclama: numeroActual(p, hoy),
    vigente: esVigente(p),
  };
}

const normalizar = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

// ---- Validación ----

function validarNombres(cuerpo, { parcial }) {
  const detalles = [];
  for (const campo of ['contrayente1', 'contrayente2']) {
    if (parcial && !(campo in cuerpo)) continue;
    const valor = typeof cuerpo[campo] === 'string' ? cuerpo[campo].trim() : '';
    if (!valor || valor.length > 150) detalles.push({ campo, mensaje: 'El nombre es obligatorio, hasta 150 caracteres.' });
  }
  return detalles;
}

// Fechas de publicación: estrictamente crecientes y anteriores al día del matrimonio (hora de Bolivia).
// `campoDe(i)` da el campo del detalle: `publicaciones.N.fecha` al crear, `fecha` en las rutas de publicaciones.
function validarFechas(fechas, fechaMatrimonio, campoDe) {
  const detalles = [];
  const limite = diaDe(fechaMatrimonio);
  fechas.forEach((fecha, i) => {
    if (!esFechaSimple(fecha)) detalles.push({ campo: campoDe(i), mensaje: 'Debe ser una fecha con el formato YYYY-MM-DD.' });
    else if (i > 0 && fecha <= fechas[i - 1])
      detalles.push({ campo: campoDe(i), mensaje: 'Debe ser posterior a la proclama anterior.' });
    else if (fecha >= limite) detalles.push({ campo: campoDe(i), mensaje: 'Debe ser anterior a la fecha del matrimonio.' });
  });
  return detalles;
}

const CAMPOS_CREAR = ['sedeId', 'contrayente1', 'contrayente2', 'fechaMatrimonio', 'tramiteOrigenId', 'publicaciones'];
const CAMPOS_EDITAR = ['contrayente1', 'contrayente2', 'fechaMatrimonio'];

const SIN_PERMISO = 'Tu rol no tiene permiso para gestionar las proclamas.';
const NO_EXISTE = 'La proclama no existe.';

function listar(parametros, slugSede) {
  const detalles = [];
  const paginacion = leerPaginacion(parametros);
  if (paginacion.detalles) detalles.push(...paginacion.detalles);

  const vigentes = parametros.get('vigentes');
  if (vigentes && vigentes !== 'true' && vigentes !== 'false')
    detalles.push({ campo: 'query.vigentes', mensaje: 'Debe ser true o false.' });
  const anio = parametros.get('anio');
  if (anio && !(/^\d{4}$/.test(anio) && Number(anio) >= 1900 && Number(anio) <= 2100))
    detalles.push({ campo: 'query.anio', mensaje: 'Debe ser un año entre 1900 y 2100.' });
  const orden = parametros.get('orden') ?? 'fechaMatrimonio';
  if (orden !== 'fechaMatrimonio' && orden !== '-fechaMatrimonio')
    detalles.push({ campo: 'query.orden', mensaje: 'Orden no válido: fechaMatrimonio o -fechaMatrimonio.' });
  if (detalles.length) return { detalles };

  const buscar = normalizar(parametros.get('buscar')?.trim());
  const ahora = new Date();
  let resultado = proclamas.filter(
    (p) =>
      (!slugSede || p.sede.slug === slugSede) &&
      (!vigentes || esVigente(p, ahora) === (vigentes === 'true')) &&
      (!anio || diaDe(p.fechaMatrimonio).startsWith(anio)) &&
      (!buscar || normalizar(`${p.contrayente1} ${p.contrayente2}`).includes(buscar)),
  );
  resultado = [...resultado].sort((a, b) => new Date(a.fechaMatrimonio) - new Date(b.fechaMatrimonio));
  if (orden.startsWith('-')) resultado.reverse();

  const pagina = paginar(resultado, paginacion);
  return { ...pagina, datos: pagina.datos.map(serializarProclama) };
}

const respuesta = (p) => HttpResponse.json({ datos: serializarProclama(p) });
const noTieneLaPublicacion = (numero) =>
  respuestaError({ estado: 404, codigo: 'NO_ENCONTRADO', mensaje: `La proclama no tiene la publicación ${numero}.` });
const fallo = ({ error }) => respuestaError(error);

// Comprobaciones comunes de las rutas con :id. Devuelve { p } o { respuesta }.
function proclamaEscribible(params) {
  const auth = autorizar('proclamas.gestionar', SIN_PERMISO);
  if (auth.respuesta) return auth;
  const leido = leerDeLaSede(proclamas, params.id, auth.usuario, NO_EXISTE);
  if (leido.respuesta) return { respuesta: leido.respuesta };
  return { p: leido.recurso };
}

export const handlersProclamas = [
  http.get(api('/admin/proclamas'), ({ request }) => {
    const { usuario, respuesta: sinSesion } = autenticar();
    if (sinSesion) return sinSesion;
    const parametros = new URL(request.url).searchParams;
    const sede = sedeDeLaLista(parametros, usuario);
    if (sede.respuesta) return sede.respuesta;
    const resultado = listar(parametros, sede.slugSede);
    if (resultado.detalles) return consultaInvalida(resultado.detalles);
    return HttpResponse.json(resultado);
  }),

  http.get(api('/admin/proclamas/:id'), ({ params }) => {
    const { usuario, respuesta: sinSesion } = autenticar();
    if (sinSesion) return sinSesion;
    const leido = leerDeLaSede(proclamas, params.id, usuario, NO_EXISTE);
    return leido.respuesta ?? respuesta(leido.recurso);
  }),

  http.post(api('/admin/proclamas'), async ({ request }) => {
    const { usuario, respuesta: denegada } = autorizar('proclamas.gestionar', SIN_PERMISO);
    if (denegada) return denegada;
    const cuerpo = await leerCuerpo(request);
    if (!cuerpo) return cuerpoInvalido();

    const detalles = [...camposNoPermitidos(cuerpo, CAMPOS_CREAR), ...validarNombres(cuerpo, { parcial: false })];
    if (!esFechaHoraConZona(cuerpo.fechaMatrimonio))
      detalles.push({ campo: 'fechaMatrimonio', mensaje: 'La fecha del matrimonio es obligatoria, con fecha, hora y zona.' });
    const fechas = Array.isArray(cuerpo.publicaciones) ? cuerpo.publicaciones.map((x) => x?.fecha) : [];
    if (cuerpo.publicaciones !== undefined && !Array.isArray(cuerpo.publicaciones))
      detalles.push({ campo: 'publicaciones', mensaje: 'Debe ser una lista.' });
    if (fechas.length > MAX_PUBLICACIONES)
      detalles.push({ campo: 'publicaciones', mensaje: `Una proclama tiene hasta ${MAX_PUBLICACIONES} publicaciones.` });
    if (!detalles.length) detalles.push(...validarFechas(fechas, cuerpo.fechaMatrimonio, (i) => `publicaciones.${i}.fecha`));
    if (detalles.length) return fallo(errorValidacion(detalles));

    const nueva = proclama(
      siguienteId,
      cuerpo.contrayente1.trim(),
      cuerpo.contrayente2.trim(),
      fechaBolivia(new Date(cuerpo.fechaMatrimonio)),
      fechas,
    );
    nueva.sede = usuario.sede ?? SEDE_PRINCIPAL;
    nueva.fechaRegistro = fechaBolivia(new Date());
    nueva.tramiteOrigenId = cuerpo.tramiteOrigenId ?? null;
    siguienteId += 1;
    proclamas.push(nueva);
    return HttpResponse.json(
      { datos: serializarProclama(nueva) },
      { status: 201, headers: { Location: `/api/admin/proclamas/${nueva.id}` } },
    );
  }),

  http.patch(api('/admin/proclamas/:id'), async ({ request, params }) => {
    const { p, respuesta: denegada } = proclamaEscribible(params);
    if (denegada) return denegada;
    const cuerpo = await leerCuerpo(request);
    if (!cuerpo) return cuerpoInvalido();

    const detalles = [...camposNoPermitidos(cuerpo, CAMPOS_EDITAR), ...validarNombres(cuerpo, { parcial: true })];
    if ('fechaMatrimonio' in cuerpo) {
      if (!esFechaHoraConZona(cuerpo.fechaMatrimonio))
        detalles.push({ campo: 'fechaMatrimonio', mensaje: 'Debe ser una fecha y hora con zona.' });
      else {
        // El matrimonio no puede quedar antes de una publicación ya programada.
        const limite = diaDe(cuerpo.fechaMatrimonio);
        if (p.publicaciones.some((pub) => pub.fecha >= limite))
          detalles.push({ campo: 'fechaMatrimonio', mensaje: 'Debe ser posterior a la última publicación de la proclama.' });
      }
    }
    if (detalles.length) return fallo(errorValidacion(detalles));

    if ('contrayente1' in cuerpo) p.contrayente1 = cuerpo.contrayente1.trim();
    if ('contrayente2' in cuerpo) p.contrayente2 = cuerpo.contrayente2.trim();
    if ('fechaMatrimonio' in cuerpo) p.fechaMatrimonio = fechaBolivia(new Date(cuerpo.fechaMatrimonio));
    return respuesta(p);
  }),

  http.delete(api('/admin/proclamas/:id'), ({ params }) => {
    const { p, respuesta: denegada } = proclamaEscribible(params);
    if (denegada) return denegada;
    // El historial es público: no se elimina si alguna publicación ya llegó a su fecha.
    if (p.publicaciones.some((pub) => alcanzada(pub, hoyBolivia())))
      return fallo(
        conflicto(
          'La proclama ya tiene publicaciones que llegaron a su fecha y forma parte del historial público: no se puede eliminar.',
        ),
      );
    proclamas = proclamas.filter((x) => x.id !== p.id);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(api('/admin/proclamas/:id/publicaciones'), async ({ request, params }) => {
    const { p, respuesta: denegada } = proclamaEscribible(params);
    if (denegada) return denegada;
    const cuerpo = await leerCuerpo(request);
    if (!cuerpo) return cuerpoInvalido();
    const extra = camposNoPermitidos(cuerpo, ['fecha']);
    if (extra.length) return fallo(errorValidacion(extra));
    if (p.publicaciones.length >= MAX_PUBLICACIONES)
      return fallo(conflicto(`La proclama ya tiene sus ${MAX_PUBLICACIONES} publicaciones.`));

    const fechas = [...p.publicaciones.map((pub) => pub.fecha), cuerpo.fecha];
    const detalles = validarFechas(fechas, p.fechaMatrimonio, () => 'fecha');
    if (detalles.length) return fallo(errorValidacion(detalles));

    p.publicaciones.push({ numero: p.publicaciones.length + 1, fecha: cuerpo.fecha });
    // 201 con la proclama completa y la Location de la proclama (admin.md §10).
    return HttpResponse.json(
      { datos: serializarProclama(p) },
      { status: 201, headers: { Location: `/api/admin/proclamas/${p.id}` } },
    );
  }),

  http.patch(api('/admin/proclamas/:id/publicaciones/:numero'), async ({ request, params }) => {
    const { p, respuesta: denegada } = proclamaEscribible(params);
    if (denegada) return denegada;
    const pub = p.publicaciones.find((x) => x.numero === Number(params.numero));
    if (!pub) return noTieneLaPublicacion(params.numero);
    const cuerpo = await leerCuerpo(request);
    if (!cuerpo) return cuerpoInvalido();
    const extra = camposNoPermitidos(cuerpo, ['fecha']);
    if (extra.length) return fallo(errorValidacion(extra));

    const fechas = p.publicaciones.map((x) => (x.numero === pub.numero ? cuerpo.fecha : x.fecha));
    const detalles = validarFechas(fechas, p.fechaMatrimonio, () => 'fecha');
    if (detalles.length) return fallo(errorValidacion(detalles.slice(0, 1)));

    pub.fecha = cuerpo.fecha;
    return respuesta(p);
  }),

  http.delete(api('/admin/proclamas/:id/publicaciones/:numero'), ({ params }) => {
    const { p, respuesta: denegada } = proclamaEscribible(params);
    if (denegada) return denegada;
    const ultima = p.publicaciones.at(-1);
    if (!p.publicaciones.some((x) => x.numero === Number(params.numero))) return noTieneLaPublicacion(params.numero);
    if (ultima.numero !== Number(params.numero))
      return fallo(conflicto(`Solo se puede quitar la última publicación (la ${ultima.numero}).`));
    p.publicaciones.pop();
    // 200 con la proclama actualizada, no 204: la proclama sigue existiendo (admin.md §10).
    return respuesta(p);
  }),
];
