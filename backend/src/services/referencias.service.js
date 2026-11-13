// Comprobaciones que comparten los recursos del panel (admin.md, "Reglas comunes"):
//  * la sede de un recurso nuevo;
//  * las referencias del cuerpo (...Id) y las URL de archivos dentro de un contenido JSON.
// Una referencia que no existe o que es de otra sede es 400 VALIDACION con el detalle en su campo.
import { obtenerEntorno } from '../config/entorno.js';
import { claseDelTipo } from '../constantes/multimedia.js';
import { ErrorApp } from '../errores/ErrorApp.js';
import * as modelo from '../models/comunes.model.js';
import { sedeParaCrear } from '../utils/alcanceSede.js';

// Sede de un recurso nuevo: los roles con sede usan la suya; el Administrador, el sedeId del
// cuerpo o, si no lo envía, su propia sede. Sin ninguna de las dos, 400 en sedeId.
export async function sedeDelRecursoNuevo(usuario, sedeIdDelCuerpo, db) {
  const sedeId = sedeParaCrear(usuario, sedeIdDelCuerpo ?? usuario.sedeId ?? undefined);
  if (sedeId === undefined || sedeId === null) {
    throw ErrorApp.validacion(undefined, [{ campo: 'sedeId', mensaje: 'Indica la sede.' }]);
  }
  if (!(await modelo.sedeExiste(sedeId, db))) {
    throw ErrorApp.validacion(undefined, [{ campo: 'sedeId', mensaje: 'La sede no existe.' }]);
  }
  return sedeId;
}

const DESCRIPCION_CLASE = {
  IMAGEN: 'una imagen',
  VIDEO: 'un video',
  DOCUMENTO: 'un documento PDF',
};

// Clave guardada en archivo_multimedia.url a partir de la URL que ve el cliente:
//  * relativa del portal (/media/seed/...): tal cual;
//  * absoluta del CDN (CDN_PUBLIC_URL/<clave>): la clave; una variante (-480w.webp) apunta a su
//    imagen principal.
// Cualquier otra URL (otro sitio) no es de la biblioteca: null.
export function claveDeLaUrl(url, cdnUrlPublica = obtenerEntorno().cdnUrlPublica) {
  if (typeof url !== 'string' || url === '') return null;

  let clave = null;
  if (url.startsWith('/') && !url.startsWith('//')) clave = url;
  else if (cdnUrlPublica && url.startsWith(`${cdnUrlPublica}/`)) {
    clave = url.slice(cdnUrlPublica.length + 1);
  }
  return clave && clave.replace(/-\d+w\.webp$/, '.webp');
}

// Comprueba archivos de la biblioteca de la sede y devuelve los detalles de error (vacío si todo
// está bien). Cada referencia es { campo, clase, id } (un ...Id del cuerpo) o { campo, clase, url }
// (una URL dentro de un contenido). "clase": IMAGEN, VIDEO o DOCUMENTO.
// Devuelve también los archivos encontrados por id, para quien necesite más datos (ej. el texto
// alternativo de la portada).
export async function verificarArchivos(sedeId, referencias, db) {
  const tieneId = (referencia) => referencia.id !== undefined && referencia.id !== null;
  const conValor = referencias.filter(
    (referencia) => tieneId(referencia) || referencia.url !== undefined,
  );
  if (conValor.length === 0) return { detalles: [], porId: new Map() };

  const claves = conValor
    .filter((referencia) => referencia.url !== undefined)
    .map((referencia) => claveDeLaUrl(referencia.url))
    .filter(Boolean);
  const ids = conValor.filter(tieneId).map(({ id }) => id);

  const archivos = await modelo.archivosDeLaSede({ sedeId, ids, claves }, db);
  const porId = new Map(archivos.map((archivo) => [archivo.id, archivo]));
  const porClave = new Map(archivos.map((archivo) => [archivo.url, archivo]));

  const detalles = [];
  for (const referencia of conValor) {
    const archivo =
      referencia.url !== undefined
        ? porClave.get(claveDeLaUrl(referencia.url))
        : porId.get(referencia.id);
    const descripcion = DESCRIPCION_CLASE[referencia.clase];

    if (!archivo) {
      detalles.push({
        campo: referencia.campo,
        mensaje: `Debe ser ${descripcion} de la biblioteca multimedia de esta sede.`,
      });
    } else if (claseDelTipo(archivo.tipo_mime)?.codigo !== referencia.clase) {
      detalles.push({ campo: referencia.campo, mensaje: `El archivo no es ${descripcion}.` });
    }
  }
  return { detalles, porId };
}
