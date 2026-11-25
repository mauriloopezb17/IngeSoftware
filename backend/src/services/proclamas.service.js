// Proclamas matrimoniales vigentes e historial (contrato: docs/api/publico.md, RF-02).
import { ErrorApp } from '../errores/ErrorApp.js';
import * as modelo from '../models/proclamas.model.js';
import {
  formatearFecha,
  formatearFechaHora,
  imagen,
  urlPublica,
  variantesDe,
} from '../utils/formato.js';
import { armarPaginacion, desplazamiento } from '../utils/paginacion.js';
import { tieneContenido } from '../validacion/blocknote.js';

function tieneDetalle(fila) {
  if (fila.imagen_id) return true;
  const detalle = fila.detalle;
  if (!detalle) return false;
  return (
    tieneContenido(detalle.contenido) ||
    (detalle.galeria?.length ?? 0) > 0 ||
    Boolean(detalle.lugar)
  );
}

function aProclama(fila) {
  return {
    id: fila.id,
    contrayente1: fila.nombre_contrayente_1,
    contrayente2: fila.nombre_contrayente_2,
    fechaMatrimonio: formatearFechaHora(fila.fecha_matrimonio),
    numeroProclama: fila.numero_proclama,
    publicaciones: fila.publicaciones.map(({ numero, fecha }) => ({
      numero,
      fecha: formatearFecha(fecha),
    })),
    tieneDetalle: tieneDetalle(fila),
    imagen: imagen({
      id: fila.imagen_id,
      url: fila.imagen_url,
      textoAlternativo: fila.imagen_texto_alternativo,
      ancho: fila.imagen_ancho,
      alto: fila.imagen_alto,
    }),
  };
}

function aElementoGaleria(archivo) {
  return {
    id: archivo.id,
    url: urlPublica(archivo.url),
    textoAlternativo: archivo.texto_alternativo ?? null,
    ancho: archivo.ancho_px ?? null,
    alto: archivo.alto_px ?? null,
    variantes: variantesDe(archivo.url, archivo.ancho_px),
    tipoMime: archivo.tipo_mime,
  };
}

// GET /api/sedes/:sede/proclamas
export async function listarProclamasVigentes(sedeId) {
  return (await modelo.listarVigentes(sedeId)).map(aProclama);
}

// GET /api/sedes/:sede/proclamas/historial. consulta: { anio?, pagina, porPagina }
export async function listarHistorialProclamas(sedeId, { anio, pagina, porPagina }) {
  const { filas, total } = await modelo.listarHistorial(sedeId, {
    anio,
    limite: porPagina,
    desplazamiento: desplazamiento(pagina, porPagina),
  });

  return {
    datos: filas.map(aProclama),
    paginacion: armarPaginacion({ total, pagina, porPagina }),
  };
}

// GET /api/sedes/:sede/proclamas/:id
export async function obtenerDetalleProclama(sedeId, id) {
  const fila = await modelo.buscarDetallePorId(sedeId, id);
  if (!fila) throw ErrorApp.noEncontrado('La proclama no existe.');

  const idsGaleria = fila.detalle?.galeria ?? [];
  const archivos = await modelo.archivosPorIds(sedeId, idsGaleria);
  const porId = new Map(archivos.map((archivo) => [archivo.id, archivo]));
  const galeria = idsGaleria
    .map((archivoId) => porId.get(archivoId))
    .filter(Boolean)
    .map(aElementoGaleria);

  return {
    ...aProclama(fila),
    aceptaObservaciones: new Date(fila.fecha_matrimonio).getTime() > Date.now(),
    galeria,
    detalle: fila.detalle ?? null,
  };
}
