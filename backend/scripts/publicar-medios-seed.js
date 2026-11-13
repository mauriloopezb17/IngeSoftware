// Sube al bucket de OCI los archivos del seed (frontend/public/media/seed/) y deja la base apuntando
// a ellos, igual que si se hubieran subido desde el panel:
//   npm run publicar-medios-seed
// Las imágenes se convierten a WebP con sus variantes (480/960/1600) y los videos se suben tal cual.
// En la base: archivo_multimedia guarda la clave del objeto, la portada de la sede también y los
// bloques de las páginas guardan la URL pública. Solo procesa los archivos que siguen en
// /media/seed/: se puede ejecutar de nuevo sin duplicar nada. Requiere OCI_S3_* y CDN_PUBLIC_URL.
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { RECURSOS_CACHE } from '../src/constantes/cache.js';
import {
  ANCHOS_VARIANTES,
  CALIDAD_WEBP,
  EXTENSION_POR_TIPO,
  LADO_MAXIMO_IMAGEN_PX,
  claveDeVariante,
} from '../src/constantes/multimedia.js';
import { ErrorEntorno, obtenerEntorno } from '../src/config/entorno.js';
import { cerrarPool, consultar, transaccion } from '../src/db/index.js';
import { cerrarRedis } from '../src/db/redis.js';
import { invalidarRecursos } from '../src/services/cache.service.js';
import {
  almacenamientoConfigurado,
  cerrarClienteS3,
  eliminarObjetos,
  subirObjeto,
  urlPublica,
} from '../src/storage/oci.js';
import { formatearFechaHora } from '../src/utils/formato.js';

const CARPETA_PUBLICA = fileURLToPath(new URL('../../frontend/public', import.meta.url));

async function prepararImagen(contenido) {
  const { data, info } = await sharp(contenido)
    .rotate()
    .resize({
      width: LADO_MAXIMO_IMAGEN_PX,
      height: LADO_MAXIMO_IMAGEN_PX,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: CALIDAD_WEBP })
    .toBuffer({ resolveWithObject: true });

  const variantes = await Promise.all(
    ANCHOS_VARIANTES.filter((ancho) => ancho < info.width).map(async (ancho) => ({
      ancho,
      cuerpo: await sharp(data).resize({ width: ancho }).webp({ quality: CALIDAD_WEBP }).toBuffer(),
    })),
  );
  return { cuerpo: data, tipo: 'image/webp', ancho: info.width, alto: info.height, variantes };
}

// Sube un archivo del seed y devuelve los datos con los que se actualiza su fila.
async function publicar(fila) {
  const contenido = await readFile(`${CARPETA_PUBLICA}${fila.url}`);
  const esImagen = fila.tipo_mime.startsWith('image/');
  const preparado = esImagen
    ? await prepararImagen(contenido)
    : { cuerpo: contenido, tipo: fila.tipo_mime, ancho: fila.ancho_px, alto: fila.alto_px };

  const [anio, mes] = formatearFechaHora(new Date()).split('-');
  const clave = `sedes/${fila.sede_slug}/${anio}/${mes}/${randomUUID()}.${EXTENSION_POR_TIPO[preparado.tipo]}`;

  const subidas = [];
  try {
    for (const objeto of [
      { clave, cuerpo: preparado.cuerpo },
      ...(preparado.variantes ?? []).map((v) => ({
        clave: claveDeVariante(clave, v.ancho),
        cuerpo: v.cuerpo,
      })),
    ]) {
      await subirObjeto({
        clave: objeto.clave,
        cuerpo: objeto.cuerpo,
        tipoContenido: preparado.tipo,
        tamano: objeto.cuerpo.length,
      });
      subidas.push(objeto.clave);
    }
  } catch (error) {
    await eliminarObjetos(subidas).catch(() => {});
    throw error;
  }
  return { clave, subidas, ...preparado, tamano: preparado.cuerpo.length };
}

async function principal() {
  if (!almacenamientoConfigurado() || !obtenerEntorno().cdnUrlPublica) {
    throw new Error('Faltan OCI_S3_* o CDN_PUBLIC_URL en backend/.env.');
  }

  const { rows: pendientes } = await consultar(
    `SELECT m.id, m.url, m.tipo_mime, m.ancho_px, m.alto_px, m.sede_id, s.slug AS sede_slug
       FROM archivo_multimedia m JOIN sede s ON s.id = m.sede_id
      WHERE m.url LIKE '/media/seed/%' ORDER BY m.id`,
  );
  if (pendientes.length === 0) {
    console.log('No quedan archivos del seed por publicar.');
    return;
  }

  const sedes = new Set();
  for (const fila of pendientes) {
    const subido = await publicar(fila);
    try {
      await transaccion(async (db) => {
        await db.consultar(
          `UPDATE archivo_multimedia
              SET url = $2, tipo_mime = $3, tamano_bytes = $4, ancho_px = $5, alto_px = $6
            WHERE id = $1`,
          [fila.id, subido.clave, subido.tipo, subido.tamano, subido.ancho, subido.alto],
        );
        await db.consultar(
          'UPDATE sede SET url_imagen_portada = $2 WHERE url_imagen_portada = $1',
          [fila.url, subido.clave],
        );
        // En el JSON de los bloques la ruta aparece entre comillas: se reemplaza el valor completo.
        await db.consultar(
          `UPDATE bloque SET contenido = replace(contenido::text, $1, $2)::jsonb
            WHERE contenido::text LIKE '%' || $1 || '%'`,
          [JSON.stringify(fila.url), JSON.stringify(urlPublica(subido.clave))],
        );
      });
    } catch (error) {
      await eliminarObjetos(subido.subidas).catch(() => {});
      throw error;
    }
    sedes.add(fila.sede_id);
    console.log(`${fila.url} -> ${subido.clave} (${subido.subidas.length} objeto(s))`);
  }

  // Los cambios no pasaron por los servicios del CMS: se descarta lo que la caché tenga guardado.
  const todos = Object.values(RECURSOS_CACHE);
  for (const sedeId of sedes) await invalidarRecursos(sedeId, todos);
  await invalidarRecursos(null, todos);
  console.log(`Listo: ${pendientes.length} archivo(s) publicados en el bucket.`);
}

try {
  obtenerEntorno();
  await principal();
} catch (error) {
  console.error(error instanceof ErrorEntorno ? error.message : `Error: ${error.message}`);
  process.exitCode = 1;
} finally {
  await cerrarPool();
  await cerrarRedis();
  cerrarClienteS3();
}
