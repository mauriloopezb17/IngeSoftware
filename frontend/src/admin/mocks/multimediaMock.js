// Lógica de la biblioteca multimedia simulada: estado en memoria, filtros, paginación y
// validación de subidas (docs/api/admin.md §2). Los handlers de handlers.js solo la usan.
import { crearArchivosIniciales } from './multimediaDatos.js';
import { fechaBolivia, SEDE_PRINCIPAL } from './usuarios.js';

const MB = 1024 * 1024;

// Tipos y límites (RNF-05). La API real detecta el tipo por la firma binaria del archivo;
// el mock solo puede fiarse del tipo MIME que declara el navegador.
export const CLASES = {
  IMAGEN: {
    tipos: { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' },
    maximo: 30 * MB,
    mensajeLimite: 'Las imágenes pueden pesar hasta 30 MB.',
  },
  VIDEO: {
    tipos: { 'video/mp4': 'mp4', 'video/webm': 'webm' },
    maximo: 2048 * MB,
    mensajeLimite: 'Los videos pueden pesar hasta 2 GB.',
  },
  DOCUMENTO: {
    tipos: { 'application/pdf': 'pdf' },
    maximo: 50 * MB,
    mensajeLimite: 'Los documentos PDF pueden pesar hasta 50 MB.',
  },
};

export const MENSAJE_TIPO_NO_PERMITIDO =
  'Tipo de archivo no permitido. Solo se aceptan imágenes JPG, PNG o WebP, videos MP4 o WebM y documentos PDF.';

export function claseDeTipo(tipoMime) {
  return Object.keys(CLASES).find((clase) => tipoMime in CLASES[clase].tipos) ?? null;
}

const ORDENES = {
  fechaSubida: (a, b) => a.fechaSubida.localeCompare(b.fechaSubida),
  tamanoBytes: (a, b) => a.tamanoBytes - b.tamanoBytes,
};

let archivos = crearArchivosIniciales();
let siguienteId = 15;

export function reiniciarMultimedia() {
  archivos = crearArchivosIniciales();
  siguienteId = 15;
}

export const buscarArchivo = (id) => archivos.find((a) => a.id === id) ?? null;
export const buscarArchivoPorUrl = (url) => archivos.find((a) => a.url === url) ?? null;

const normalizar = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

// Devuelve { datos, paginacion } o { error: { campo, mensaje } } si un parámetro conocido es inválido.
export function listarArchivos(parametros, { slugSede } = {}) {
  const detalles = [];

  const clase = parametros.get('clase');
  if (clase && !(clase in CLASES)) detalles.push({ campo: 'query.clase', mensaje: 'Debe ser IMAGEN, VIDEO o DOCUMENTO.' });

  const enUso = parametros.get('enUso');
  if (enUso && enUso !== 'true' && enUso !== 'false')
    detalles.push({ campo: 'query.enUso', mensaje: 'Debe ser true o false.' });

  const pagina = parametros.has('pagina') ? Number(parametros.get('pagina')) : 1;
  if (!Number.isInteger(pagina) || pagina < 1) detalles.push({ campo: 'query.pagina', mensaje: 'Debe ser un entero mayor o igual a 1.' });

  const porPagina = parametros.has('porPagina') ? Number(parametros.get('porPagina')) : 10;
  if (!Number.isInteger(porPagina) || porPagina < 1 || porPagina > 50)
    detalles.push({ campo: 'query.porPagina', mensaje: 'Debe ser un entero entre 1 y 50.' });

  const orden = parametros.get('orden') ?? '-fechaSubida';
  const campoOrden = orden.replace(/^-/, '');
  if (!(campoOrden in ORDENES)) detalles.push({ campo: 'query.orden', mensaje: 'Orden no válido.' });

  if (detalles.length) return { detalles };

  const buscar = normalizar(parametros.get('buscar')?.trim());
  let resultado = archivos.filter(
    (a) =>
      (!slugSede || a.sede.slug === slugSede) &&
      (!clase || claseDeTipo(a.tipoMime) === clase) &&
      (!enUso || a.enUso === (enUso === 'true')) &&
      (!buscar || normalizar(a.nombreOriginal).includes(buscar) || normalizar(a.textoAlternativo).includes(buscar)),
  );

  resultado = [...resultado].sort(ORDENES[campoOrden]);
  if (orden.startsWith('-')) resultado.reverse();

  const total = resultado.length;
  const inicio = (pagina - 1) * porPagina;
  return {
    datos: resultado.slice(inicio, inicio + porPagina),
    paginacion: { pagina, porPagina, total, totalPaginas: Math.ceil(total / porPagina) },
  };
}

// Valida el archivo recibido. Devuelve null si es válido o { estado, codigo, mensaje }.
export function validarArchivo(archivo) {
  const clase = claseDeTipo(archivo.type);
  if (!clase) return { estado: 415, codigo: 'TIPO_NO_PERMITIDO', mensaje: MENSAJE_TIPO_NO_PERMITIDO };
  if (archivo.size > CLASES[clase].maximo)
    return { estado: 413, codigo: 'ARCHIVO_DEMASIADO_GRANDE', mensaje: CLASES[clase].mensajeLimite };
  return null;
}

export function crearArchivo({ archivo, textoAlternativo, usuario }) {
  const clase = claseDeTipo(archivo.type);
  const ahora = new Date();
  const fecha = fechaBolivia(ahora);
  const extension = CLASES[clase].tipos[archivo.type];
  const sede = usuario.sede ?? SEDE_PRINCIPAL; // un Administrador sin sede sube a la sede principal
  // La API real devuelve la URL pública del bucket. En el navegador, el mock usa una URL local
  // del archivo recién subido para que la vista previa se pueda ver.
  const url =
    typeof URL.createObjectURL === 'function'
      ? URL.createObjectURL(archivo)
      : `https://cdn.pasionistas.org.bo/sedes/${sede.slug}/${fecha.slice(0, 4)}/${fecha.slice(5, 7)}/${crypto.randomUUID()}.${extension}`;

  const nuevo = {
    id: siguienteId++,
    url,
    nombreOriginal: archivo.name,
    tipoMime: archivo.type,
    tamanoBytes: archivo.size,
    // La API lee las dimensiones del archivo; el mock usa valores fijos.
    ancho: clase === 'IMAGEN' ? 1600 : clase === 'VIDEO' ? 1920 : null,
    alto: clase === 'IMAGEN' ? 1067 : clase === 'VIDEO' ? 1080 : null,
    textoAlternativo: textoAlternativo || null,
    // La API genera las variantes menores que la imagen; el mock usa la misma URL (no hay archivos reales).
    variantes: clase === 'IMAGEN' ? [480, 960].map((ancho) => ({ ancho, url })) : [],
    sede,
    subidoPor: { id: usuario.id, nombreCompleto: usuario.nombreCompleto },
    fechaSubida: fecha,
    enUso: false,
  };
  archivos.push(nuevo);
  return nuevo;
}

export function cambiarTextoAlternativo(id, textoAlternativo) {
  const archivo = buscarArchivo(id);
  archivo.textoAlternativo = textoAlternativo;
  return archivo;
}

export function eliminarArchivo(id) {
  archivos = archivos.filter((a) => a.id !== id);
}
