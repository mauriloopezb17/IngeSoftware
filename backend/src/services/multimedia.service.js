// Multimedia: subida de archivos al almacenamiento (OCI) y su registro en la base.
// Contrato: docs/api/admin.md, sección 2.
import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { fileTypeFromFile } from 'file-type';
import sharp from 'sharp';
import {
  ANCHOS_VARIANTES,
  CALIDAD_WEBP,
  CAPACIDAD_ALMACENAMIENTO_BYTES,
  EXTENSION_POR_TIPO,
  LADO_MAXIMO_IMAGEN_PX,
  PIXELES_MAXIMOS_ENTRADA,
  UMBRAL_CAPACIDAD,
  claseDelTipo,
  claveDeVariante,
} from '../constantes/multimedia.js';
import { transaccion } from '../db/index.js';
import { ErrorApp } from '../errores/ErrorApp.js';
import * as modelo from '../models/multimedia.model.js';
import { registrarCambio } from './bitacora.service.js';
import { eliminarObjetos, subirObjeto } from '../storage/oci.js';
import { sedeParaCrear } from '../utils/alcanceSede.js';
import { formatearFechaHora, urlPublica as urlDeLaClave, variantesDe } from '../utils/formato.js';

// Sharp guarda en caché las imágenes que abre por archivo y en Windows eso impide borrar el
// temporal de la subida. Se desactiva la caché de archivos (la de memoria no se usa aquí).
sharp.cache({ files: 0 });

const MENSAJE_TIPO_NO_PERMITIDO =
  'El archivo no es de un tipo permitido. Se aceptan imágenes JPEG, PNG y WebP, videos MP4 y WebM, y documentos PDF.';
const MENSAJE_CASI_LLENO = 'El almacenamiento está casi lleno.';

// Detecta el tipo por la firma binaria del contenido.
async function tipoRealDe(ruta) {
  return (await fileTypeFromFile(ruta))?.mime;
}

// Sede del nuevo archivo: la del usuario (Administrador: la que indique, o la suya) y debe estar activa.
async function resolverSede(usuario, sedeIdDelCuerpo) {
  const sedeId = sedeParaCrear(usuario, sedeIdDelCuerpo ?? usuario.sedeId ?? undefined);
  if (sedeId === undefined || sedeId === null) {
    throw ErrorApp.validacion(undefined, [
      { campo: 'sedeId', mensaje: 'Indica la sede del archivo.' },
    ]);
  }

  const sede = await modelo.buscarSedeActiva(sedeId);
  if (!sede) {
    throw ErrorApp.validacion(undefined, [
      { campo: 'sedeId', mensaje: 'La sede no existe o está inactiva.' },
    ]);
  }
  return sede;
}

// Convierte la imagen a WebP: aplica la orientación del EXIF y descarta todos los metadatos
// (incluida la ubicación GPS), limita el lado largo y nunca la amplía.
async function procesarImagen(ruta) {
  try {
    const { data, info } = await sharp(ruta, {
      limitInputPixels: PIXELES_MAXIMOS_ENTRADA,
      failOn: 'error',
    })
      .rotate()
      .resize({
        width: LADO_MAXIMO_IMAGEN_PX,
        height: LADO_MAXIMO_IMAGEN_PX,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: CALIDAD_WEBP })
      .toBuffer({ resolveWithObject: true });

    return { cuerpo: data, ancho: info.width, alto: info.height };
  } catch (error) {
    if (/pixel limit/i.test(error.message)) {
      throw ErrorApp.validacion(undefined, [
        {
          campo: 'archivo',
          mensaje: 'La imagen tiene demasiados píxeles (máximo 268 megapíxeles).',
        },
      ]);
    }
    throw new ErrorApp('TIPO_NO_PERMITIDO', 'El archivo no es una imagen válida.');
  }
}

// Versiones más chicas de la imagen ya procesada, solo las de ancho menor al guardado.
async function generarVariantes({ cuerpo, ancho }) {
  const anchos = ANCHOS_VARIANTES.filter((anchoVariante) => anchoVariante < ancho);
  return Promise.all(
    anchos.map(async (anchoVariante) => ({
      ancho: anchoVariante,
      cuerpo: await sharp(cuerpo)
        .resize({ width: anchoVariante })
        .webp({ quality: CALIDAD_WEBP })
        .toBuffer(),
    })),
  );
}

// Clave del objeto: sedes/<slug>/<año>/<mes>/<uuid>.<extensión>. Año y mes en hora de Bolivia.
function armarClave(sedeSlug, tipoMime) {
  const [anio, mes] = formatearFechaHora(new Date()).split('-');
  return `sedes/${sedeSlug}/${anio}/${mes}/${randomUUID()}.${EXTENSION_POR_TIPO[tipoMime]}`;
}

// Vista del panel de un archivo multimedia (fila de multimedia.model).
export function aArchivoMultimedia(fila) {
  return {
    id: fila.id,
    url: urlDeLaClave(fila.url),
    nombreOriginal: fila.nombre_original,
    tipoMime: fila.tipo_mime,
    tamanoBytes: fila.tamano_bytes,
    ancho: fila.ancho_px,
    alto: fila.alto_px,
    variantes: variantesDe(fila.url, fila.ancho_px),
    textoAlternativo: fila.texto_alternativo,
    sede: { id: fila.sede_id, nombre: fila.sede_nombre, slug: fila.sede_slug },
    subidoPor: { id: fila.subido_por_id, nombreCompleto: fila.subido_por_nombre },
    fechaSubida: formatearFechaHora(fila.fecha_subida),
    enUso: fila.en_uso,
  };
}

// Sube un archivo recibido (ya guardado en disco por multer). Orden: se valida todo, se sube al
// bucket y recién después se registra en la base; si el registro falla se borra lo subido.
// contexto: quién y desde dónde (bitacora.service.contextoDe(req)), para la bitácora.
export async function subirArchivo({ usuario, archivo, textoAlternativo, sedeId, contexto }) {
  const sede = await resolverSede(usuario, sedeId);

  const tipoReal = await tipoRealDe(archivo.ruta);
  const clase = claseDelTipo(tipoReal);
  if (!clase) throw new ErrorApp('TIPO_NO_PERMITIDO', MENSAJE_TIPO_NO_PERMITIDO);

  if (archivo.tamano > clase.maximoBytes) {
    throw new ErrorApp('ARCHIVO_DEMASIADO_GRANDE', clase.mensajeDemasiadoGrande);
  }

  const ocupado = await modelo.sumarTamanos();
  if (ocupado + archivo.tamano > CAPACIDAD_ALMACENAMIENTO_BYTES * UMBRAL_CAPACIDAD) {
    throw ErrorApp.conflicto(MENSAJE_CASI_LLENO);
  }

  // Las imágenes se convierten a WebP; videos y PDF se guardan tal cual.
  const esImagen = clase.codigo === 'IMAGEN';
  const imagen = esImagen ? await procesarImagen(archivo.ruta) : null;
  const tipoGuardado = esImagen ? 'image/webp' : tipoReal;
  const tamanoGuardado = esImagen ? imagen.cuerpo.length : archivo.tamano;
  const clave = armarClave(sede.slug, tipoGuardado);

  // Principal y variantes. Si algo falla en el medio se borra lo ya subido (no queda nada a medias).
  const subidas = [];
  try {
    await subirObjeto({
      clave,
      cuerpo: esImagen ? imagen.cuerpo : createReadStream(archivo.ruta),
      tipoContenido: tipoGuardado,
      tamano: tamanoGuardado,
    });
    subidas.push(clave);

    for (const variante of esImagen ? await generarVariantes(imagen) : []) {
      const claveVariante = claveDeVariante(clave, variante.ancho);
      await subirObjeto({
        clave: claveVariante,
        cuerpo: variante.cuerpo,
        tipoContenido: tipoGuardado,
        tamano: variante.cuerpo.length,
      });
      subidas.push(claveVariante);
    }

    // El registro y su bitácora, en una sola transacción.
    const creado = await transaccion(async (db) => {
      const { fila, archivo: conDatos } = await modelo.insertar(
        {
          sedeId: sede.id,
          subidoPor: usuario.id,
          nombreOriginal: archivo.nombreOriginal,
          clave,
          tipoMime: tipoGuardado,
          tamanoBytes: tamanoGuardado,
          anchoPx: imagen?.ancho ?? null,
          altoPx: imagen?.alto ?? null,
          textoAlternativo,
        },
        db,
      );
      await registrarCambio(db, contexto, {
        entidad: 'archivo_multimedia',
        entidadId: fila.id,
        accion: 'INSERT',
        nuevo: fila,
      });
      return conDatos;
    });
    return aArchivoMultimedia(creado);
  } catch (error) {
    // Sin registro en la base los objetos quedarían huérfanos ocupando espacio: se borran.
    if (subidas.length > 0) await eliminarObjetos(subidas).catch(() => {});
    throw error;
  }
}
