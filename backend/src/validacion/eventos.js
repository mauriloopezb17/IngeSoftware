// Validación de /api/admin/eventos (contrato: docs/api/admin.md, sección 4).
import { z } from 'zod';
import '../config/zod.js';
import { contenidoBlockNote } from './blocknote.js';
import {
  booleanoQuery,
  fecha,
  fechaHoraConZona,
  id,
  listaCodigos,
  listaIds,
  paginacion,
  slug,
} from './comunes.js';
import {
  estadoSinRevision,
  idDelCuerpo,
  textoObligatorio,
  textoOpcional,
  urlHttps,
} from './panel.js';

export const paramsEvento = z.object({ id });

export const consultaEventos = paginacion
  .extend({
    sede: slug.optional(),
    desde: fecha.optional(),
    hasta: fecha.optional(),
    categoria: listaIds.optional(),
    estado: listaCodigos(['BORRADOR', 'PUBLICADO', 'ARCHIVADO']).optional(),
    finalizados: booleanoQuery.optional(),
    orden: z
      .enum(['fechaInicio', '-fechaInicio'], { error: 'Debe ser fechaInicio o -fechaInicio.' })
      .default('fechaInicio'),
  })
  .refine(({ desde, hasta }) => !desde || !hasta || hasta >= desde, {
    path: ['hasta'],
    message: 'Debe ser igual o posterior a desde.',
  });

const titulo = z
  .string({ error: 'Debe ser un texto.' })
  .trim()
  .min(3, 'Debe tener de 3 a 200 caracteres.')
  .max(200, 'Debe tener de 3 a 200 caracteres.');

const vacioANulo = (valor) => (typeof valor === 'string' && valor.trim() === '' ? null : valor);

function esEnlaceGoogleMaps(valor) {
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

const enlaceGoogleMaps = z.preprocess(
  vacioANulo,
  z
    .string({ error: 'Debe ser un texto.' })
    .trim()
    .max(1000, 'Puede tener hasta 1000 caracteres.')
    .refine(esEnlaceGoogleMaps, 'Debe ser una URL https:// de Google Maps.')
    .nullable()
    .optional(),
);

const horaPrograma = z
  .string({ error: 'Debe ser un texto.' })
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Debe tener formato HH:MM (24 horas).');

const itemPrograma = z.strictObject({
  hora: horaPrograma,
  actividad: textoObligatorio(120),
});

const programaLista = z
  .array(itemPrograma, { error: 'Debe ser una lista.' })
  .max(20, 'Puede tener hasta 20 actividades.')
  .transform((lista) => [...lista].sort((a, b) => a.hora.localeCompare(b.hora)));

const telefonoOpcional = z.preprocess(
  vacioANulo,
  z
    .string({ error: 'Debe ser un texto.' })
    .trim()
    .max(30, 'Puede tener hasta 30 caracteres.')
    .regex(/^[+\d()\s.-]{5,30}$/, 'Debe ser un número de teléfono válido.')
    .nullable()
    .optional(),
);

const correoOpcional = z.preprocess(
  vacioANulo,
  z
    .string({ error: 'Debe ser un texto.' })
    .trim()
    .email('Debe ser un correo electrónico válido.')
    .max(120, 'Puede tener hasta 120 caracteres.')
    .nullable()
    .optional(),
);

const responsableObjeto = z
  .strictObject({
    nombre: textoObligatorio(120),
    rol: textoOpcional(80),
    telefono: telefonoOpcional,
    correo: correoOpcional,
  })
  .transform((valor) => ({
    nombre: valor.nombre,
    rol: valor.rol ?? null,
    telefono: valor.telefono ?? null,
    correo: valor.correo ?? null,
  }))
  .nullable()
  .optional();

const itemEnlace = z.strictObject({
  texto: textoObligatorio(80),
  url: urlHttps(500),
});

const enlacesLista = z
  .array(itemEnlace, { error: 'Debe ser una lista.' })
  .max(10, 'Puede tener hasta 10 enlaces.');

export const esquemaDetalleEvento = z
  .strictObject({
    contenido: contenidoBlockNote.nullable().optional(),
    direccion: textoOpcional(200),
    enlaceMapa: enlaceGoogleMaps,
    programa: programaLista.optional(),
    responsable: responsableObjeto,
    enlaces: enlacesLista.optional(),
  })
  .transform((valor) => ({
    contenido: valor.contenido ?? null,
    direccion: valor.direccion ?? null,
    enlaceMapa: valor.enlaceMapa ?? null,
    programa: valor.programa ?? [],
    responsable: valor.responsable ?? null,
    enlaces: valor.enlaces ?? [],
  }));

const fechasEnOrden = ({ fechaInicio, fechaFin }) =>
  !fechaInicio || !fechaFin || new Date(fechaFin) >= new Date(fechaInicio);
const MENSAJE_FIN = 'Debe ser igual o posterior a la fecha de inicio.';

export const cuerpoCrearEvento = z
  .strictObject({
    sedeId: idDelCuerpo.optional(),
    titulo,
    descripcion: textoOpcional(2000),
    lugar: textoOpcional(150),
    fechaInicio: fechaHoraConZona,
    fechaFin: fechaHoraConZona.nullable().optional(),
    todoElDia: z.boolean({ error: 'Debe ser true o false.' }).default(false),
    categoriaEventoId: idDelCuerpo,
    imagenId: idDelCuerpo.nullable().optional(),
    estado: estadoSinRevision.default('PUBLICADO'),
    detalle: esquemaDetalleEvento.nullable().optional(),
  })
  .refine(fechasEnOrden, { path: ['fechaFin'], message: MENSAJE_FIN });

export const cuerpoEditarEvento = z
  .strictObject({
    titulo: titulo.optional(),
    descripcion: textoOpcional(2000),
    lugar: textoOpcional(150),
    fechaInicio: fechaHoraConZona.optional(),
    fechaFin: fechaHoraConZona.nullable().optional(),
    todoElDia: z.boolean({ error: 'Debe ser true o false.' }).optional(),
    categoriaEventoId: idDelCuerpo.optional(),
    imagenId: idDelCuerpo.nullable().optional(),
    estado: estadoSinRevision.optional(),
    detalle: esquemaDetalleEvento.nullable().optional(),
  })
  .refine(fechasEnOrden, { path: ['fechaFin'], message: MENSAJE_FIN });

export const cuerpoDetalleEvento = z.strictObject({
  detalle: esquemaDetalleEvento.nullable(),
});
