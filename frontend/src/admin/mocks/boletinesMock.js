// Boletines simulados del panel (docs/api/admin.md §11, RF-06): estado en memoria, filtros, validaciones,
// permisos (boletines.gestionar) y reglas del contrato: un boletín por sede y mes (409) y el archivo debe
// ser un PDF de la misma sede (400). El archivo se sube antes a multimedia y aquí se referencia por `archivoId`.
import { http, HttpResponse } from 'msw';

import { api } from '../../mocks/api.js';
import {
  ahoraIso,
  autenticar,
  autorDe,
  autorizar,
  camposNoPermitidos,
  conflicto,
  consultaInvalida,
  cuerpoInvalido,
  errorValidacion,
  leerCuerpo,
  leerDeLaSede,
  leerPaginacion,
  paginar,
  respuestaError,
  sedeDeLaLista,
} from './apoyoMock.js';
import { buscarArchivo } from './multimediaMock.js';
import { SEDE_PRINCIPAL } from './usuarios.js';

const SECRETARIA = { id: 3, nombreCompleto: 'Secretaría (desarrollo)' };
const REGEX_PERIODO = /^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/;
const MAX_TITULO = 150;
const CAMPOS_CREAR = ['sedeId', 'titulo', 'periodo', 'archivoId'];
const CAMPOS_EDITAR = ['titulo', 'periodo', 'archivoId'];
const SIN_PERMISO = 'Tu rol no tiene permiso para gestionar los boletines.';
const NO_EXISTE = 'El boletín no existe.';

function crearBoletinesIniciales() {
  return [
    {
      id: 1,
      sede: SEDE_PRINCIPAL,
      titulo: 'Edición de octubre 2026',
      periodo: '2026-10-01',
      fechaPublicacion: '2026-10-30T16:25:00-04:00',
      archivoId: 7, // boletin-octubre-2026.pdf (multimediaDatos.js)
      publicadoPor: SECRETARIA,
    },
  ];
}

let boletines = crearBoletinesIniciales();
let siguienteId = 2;

export function reiniciarBoletines() {
  boletines = crearBoletinesIniciales();
  siguienteId = 2;
}

// Objeto boletín del panel: el del endpoint público, más `sede` y `publicadoPor`.
export function serializarBoletin(b) {
  const { archivoId, ...resto } = b;
  const archivo = buscarArchivo(archivoId);
  return {
    ...resto,
    archivo: archivo && {
      id: archivo.id,
      url: archivo.url,
      nombreOriginal: archivo.nombreOriginal,
      tipoMime: archivo.tipoMime,
      tamanoBytes: archivo.tamanoBytes,
    },
  };
}

// Mismos mensajes que la API (verificarArchivos): no está en la biblioteca de la sede, o no es un PDF.
function validarArchivo(archivoId, sede) {
  const archivo = Number.isInteger(archivoId) ? buscarArchivo(archivoId) : null;
  if (!archivo || archivo.sede.id !== sede.id)
    return [{ campo: 'archivoId', mensaje: 'Debe ser un documento PDF de la biblioteca multimedia de esta sede.' }];
  if (archivo.tipoMime !== 'application/pdf') return [{ campo: 'archivoId', mensaje: 'El archivo no es un documento PDF.' }];
  return [];
}

function validar(cuerpo, { parcial, sede }) {
  const detalles = camposNoPermitidos(cuerpo, parcial ? CAMPOS_EDITAR : CAMPOS_CREAR);
  const mal = (campo, mensaje) => detalles.push({ campo, mensaje });
  const enviado = (campo) => !parcial || campo in cuerpo;

  if (enviado('titulo')) {
    const titulo = typeof cuerpo.titulo === 'string' ? cuerpo.titulo.trim() : '';
    if (!titulo) mal('titulo', 'Es obligatorio.');
    else if (titulo.length > MAX_TITULO) mal('titulo', `Puede tener hasta ${MAX_TITULO} caracteres.`);
  }
  if (enviado('periodo') && !REGEX_PERIODO.test(cuerpo.periodo ?? ''))
    mal('periodo', 'Debe tener formato AAAA-MM (ej. 2026-11).');
  if (enviado('archivoId')) detalles.push(...validarArchivo(cuerpo.archivoId, sede));
  return detalles;
}

const periodoTomado = (sede, periodo, idPropio) =>
  boletines.some((b) => b.sede.id === sede.id && b.periodo === `${periodo}-01` && b.id !== idPropio);

const periodoRepetido = () =>
  conflicto('Ya existe un boletín de ese periodo en esta sede.', [{ campo: 'periodo', mensaje: 'Ya hay un boletín de ese mes.' }]);

export const handlersBoletines = [
  http.get(api('/admin/boletines'), ({ request }) => {
    const { usuario, respuesta } = autenticar();
    if (respuesta) return respuesta;
    const parametros = new URL(request.url).searchParams;
    const sede = sedeDeLaLista(parametros, usuario);
    if (sede.respuesta) return sede.respuesta;

    const detalles = [];
    const paginacion = leerPaginacion(parametros);
    if (paginacion.detalles) detalles.push(...paginacion.detalles);
    const anio = parametros.get('anio');
    if (anio && !/^\d{4}$/.test(anio)) detalles.push({ campo: 'query.anio', mensaje: 'Debe ser un año de 4 dígitos.' });
    if (detalles.length) return consultaInvalida(detalles);

    // Del más reciente al más antiguo, por periodo.
    const lista = boletines
      .filter((b) => (!sede.slugSede || b.sede.slug === sede.slugSede) && (!anio || b.periodo.startsWith(anio)))
      .sort((a, b) => b.periodo.localeCompare(a.periodo));
    const pagina = paginar(lista, paginacion);
    return HttpResponse.json({ ...pagina, datos: pagina.datos.map(serializarBoletin) });
  }),

  http.get(api('/admin/boletines/:id'), ({ params }) => {
    const { usuario, respuesta } = autenticar();
    if (respuesta) return respuesta;
    const leido = leerDeLaSede(boletines, params.id, usuario, NO_EXISTE);
    return leido.respuesta ?? HttpResponse.json({ datos: serializarBoletin(leido.recurso) });
  }),

  http.post(api('/admin/boletines'), async ({ request }) => {
    const { usuario, respuesta } = autorizar('boletines.gestionar', SIN_PERMISO);
    if (respuesta) return respuesta;
    const cuerpo = await leerCuerpo(request);
    if (!cuerpo) return cuerpoInvalido();

    const sede = usuario.sede ?? SEDE_PRINCIPAL;
    const detalles = validar(cuerpo, { parcial: false, sede });
    if (detalles.length) return respuestaError(errorValidacion(detalles).error);
    if (periodoTomado(sede, cuerpo.periodo)) return respuestaError(periodoRepetido().error);

    const nuevo = {
      id: siguienteId,
      sede,
      titulo: cuerpo.titulo.trim(),
      periodo: `${cuerpo.periodo}-01`,
      fechaPublicacion: ahoraIso(),
      archivoId: cuerpo.archivoId,
      publicadoPor: autorDe(usuario),
    };
    siguienteId += 1;
    boletines.push(nuevo);
    return HttpResponse.json(
      { datos: serializarBoletin(nuevo) },
      { status: 201, headers: { Location: `/api/admin/boletines/${nuevo.id}` } },
    );
  }),

  http.patch(api('/admin/boletines/:id'), async ({ request, params }) => {
    const { usuario, respuesta } = autorizar('boletines.gestionar', SIN_PERMISO);
    if (respuesta) return respuesta;
    const leido = leerDeLaSede(boletines, params.id, usuario, NO_EXISTE);
    if (leido.respuesta) return leido.respuesta;
    const cuerpo = await leerCuerpo(request);
    if (!cuerpo) return cuerpoInvalido();

    const b = leido.recurso;
    const detalles = validar(cuerpo, { parcial: true, sede: b.sede });
    if (detalles.length) return respuestaError(errorValidacion(detalles).error);
    if ('periodo' in cuerpo && periodoTomado(b.sede, cuerpo.periodo, b.id))
      return respuestaError(periodoRepetido().error);

    if ('titulo' in cuerpo) b.titulo = cuerpo.titulo.trim();
    if ('periodo' in cuerpo) b.periodo = `${cuerpo.periodo}-01`;
    if ('archivoId' in cuerpo) b.archivoId = cuerpo.archivoId;
    return HttpResponse.json({ datos: serializarBoletin(b) });
  }),

  // El PDF queda en la biblioteca multimedia, sin uso.
  http.delete(api('/admin/boletines/:id'), ({ params }) => {
    const { usuario, respuesta } = autorizar('boletines.gestionar', SIN_PERMISO);
    if (respuesta) return respuesta;
    const leido = leerDeLaSede(boletines, params.id, usuario, NO_EXISTE);
    if (leido.respuesta) return leido.respuesta;
    boletines = boletines.filter((b) => b.id !== leido.recurso.id);
    return new HttpResponse(null, { status: 204 });
  }),
];
