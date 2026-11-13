// Contenido de los bloques de página (docs/api/contenido.md, «Bloques de página»), con Ajv.
// Se valida en dos pasos y se informan juntos los errores de ambos:
//  1. el esquema_validacion (JSON Schema) del tipo, guardado en la tabla tipo_bloque;
//  2. las reglas adicionales de la API (REGLAS_POR_TIPO): lista cerrada de claves, longitudes,
//     formato de URL, enlaces e íconos.
// Que las imágenes y los videos sean de la biblioteca de la sede lo comprueba el servicio
// (archivosDelBloque da las URL con su campo y su clase).
import Ajv from 'ajv';

const ajv = new Ajv({ allErrors: true, strict: false });

// ---- Piezas de los esquemas ----

const SIN_HTML = '^(?![\\s\\S]*<[A-Za-z/!])[\\s\\S]*$';
const URL_ARCHIVO = '^(https://\\S+|/(?!/)\\S*)$';
const ENLACE = '^(#[A-Za-z0-9_-]+|/(?!/)\\S*|https://\\S+)$';
const ICONO = '^[a-z0-9]+(-[a-z0-9]+)*$';
const ID_YOUTUBE = '^[A-Za-z0-9_-]{11}$';

// Mensaje de cada patrón (un error de "pattern" solo trae el patrón).
const MENSAJE_DE_PATRON = {
  [SIN_HTML]: 'Debe ser texto plano, sin HTML.',
  [URL_ARCHIVO]: 'Debe ser una URL https:// o una ruta del portal (/media/...).',
  [ENLACE]:
    'Debe ser un ancla (#horarios), una ruta del portal (/paginas/historia) o una URL https://.',
  [ICONO]: 'Debe ser el nombre de un ícono de lucide-react en kebab-case (ej. clock-3).',
  [ID_YOUTUBE]: 'Debe ser un id de YouTube de 11 caracteres (letras, números, - y _).',
};

const texto = (maximo, { obligatorio = false } = {}) => ({
  type: 'string',
  minLength: obligatorio ? 1 : 0,
  maxLength: maximo,
  pattern: SIN_HTML,
});
const urlArchivo = { type: 'string', maxLength: 1000, pattern: URL_ARCHIVO };
const enlace = { type: 'string', maxLength: 1000, pattern: ENLACE };
const icono = { type: 'string', maxLength: 40, pattern: ICONO };

const objeto = (required, properties) => ({
  type: 'object',
  required,
  properties,
  additionalProperties: false,
});

const boton = objeto(['texto', 'enlace'], {
  texto: texto(40, { obligatorio: true }),
  enlace,
});

// ---- Reglas adicionales de cada tipo (contenido.md) ----

const REGLAS_POR_TIPO = {
  hero_video: objeto(['titulo', 'url_video'], {
    titulo: texto(80, { obligatorio: true }),
    subtitulo: texto(300),
    etiqueta: texto(80),
    url_video: urlArchivo,
    url_poster: urlArchivo,
    texto_video: texto(60),
    detalle_video: texto(60),
    botones: { type: 'array', maxItems: 3, items: boton },
  }),

  texto_imagen: objeto(['titulo', 'texto'], {
    titulo: texto(120, { obligatorio: true }),
    texto: texto(3000, { obligatorio: true }),
    etiqueta: texto(80),
    url_imagen: urlArchivo,
    texto_alternativo: texto(255),
    posicion_imagen: { enum: ['izquierda', 'derecha'] },
    tarjeta: objeto(['titulo'], {
      etiqueta: texto(60),
      titulo: texto(80, { obligatorio: true }),
      descripcion: texto(200),
    }),
  }),

  tarjetas: objeto(['items'], {
    titulo: texto(120),
    items: {
      type: 'array',
      minItems: 1,
      maxItems: 12,
      items: objeto(['titulo'], {
        titulo: texto(80, { obligatorio: true }),
        subtitulo: texto(300),
        icono,
        url_imagen: urlArchivo,
        texto_alternativo: texto(255),
        enlace,
      }),
    },
  }),

  cita: objeto(['texto'], {
    texto: texto(400, { obligatorio: true }),
    autor: texto(120),
  }),

  galeria: objeto(['imagenes'], {
    titulo: texto(120),
    imagenes: {
      type: 'array',
      minItems: 1,
      maxItems: 30,
      items: objeto(['url', 'texto_alternativo'], {
        url: urlArchivo,
        texto_alternativo: texto(255, { obligatorio: true }),
        leyenda: texto(200),
      }),
    },
  }),

  video_youtube: objeto(['youtube_video_id'], {
    youtube_video_id: { type: 'string', pattern: ID_YOUTUBE },
    titulo: texto(160),
  }),
};

// ---- Compilación (una vez por esquema) ----

const validadoresDeReglas = new Map(
  Object.entries(REGLAS_POR_TIPO).map(([codigo, esquema]) => [codigo, ajv.compile(esquema)]),
);

// Los esquemas de la base se compilan una vez por contenido (pocos y casi nunca cambian).
const validadoresDeLaBase = new Map();
function validadorDeLaBase(esquema) {
  const clave = JSON.stringify(esquema);
  if (!validadoresDeLaBase.has(clave)) validadoresDeLaBase.set(clave, ajv.compile(esquema));
  return validadoresDeLaBase.get(clave);
}

// ---- Errores de Ajv -> detalles { campo, mensaje } ----

const TIPOS = {
  string: 'Debe ser un texto.',
  array: 'Debe ser una lista.',
  object: 'Debe ser un objeto.',
  number: 'Debe ser un número.',
  integer: 'Debe ser un número entero.',
  boolean: 'Debe ser true o false.',
};

// "/items/0/titulo" -> ["items", "0", "titulo"] (con las escapes de JSON Pointer deshechas).
const segmentos = (ruta) =>
  ruta
    .split('/')
    .slice(1)
    .map((parte) => parte.replaceAll('~1', '/').replaceAll('~0', '~'));

function detalleDe(error, prefijo) {
  const ruta = segmentos(error.instancePath);
  const { keyword, params } = error;

  let mensaje;
  switch (keyword) {
    case 'required':
      ruta.push(params.missingProperty);
      mensaje = 'Es obligatorio.';
      break;
    case 'additionalProperties':
      ruta.push(params.additionalProperty);
      mensaje = 'Campo no permitido.';
      break;
    case 'type':
      mensaje =
        [params.type]
          .flat()
          .map((tipo) => TIPOS[tipo])
          .find(Boolean) ?? 'Tipo no válido.';
      break;
    case 'minLength':
      mensaje = 'Es obligatorio.';
      break;
    case 'maxLength':
      mensaje = `Puede tener hasta ${params.limit} caracteres.`;
      break;
    case 'minItems':
      mensaje = 'Agrega al menos un elemento.';
      break;
    case 'maxItems':
      mensaje = `Puede tener hasta ${params.limit} elementos.`;
      break;
    case 'enum':
      mensaje = `Debe ser uno de: ${params.allowedValues.join(', ')}.`;
      break;
    case 'pattern':
      mensaje = MENSAJE_DE_PATRON[params.pattern] ?? 'El formato no es válido.';
      break;
    default:
      mensaje = 'No es válido.';
  }
  return { campo: [prefijo, ...ruta].join('.'), mensaje };
}

// ---- API ----

// Valida el contenido de un bloque. esquemaDeLaBase: tipo_bloque.esquema_validacion.
// Devuelve la lista de detalles { campo, mensaje } (vacía si es válido), sin repetidos.
export function validarContenidoDeBloque(
  codigo,
  esquemaDeLaBase,
  contenido,
  prefijo = 'contenido',
) {
  const errores = [];

  const base = validadorDeLaBase(esquemaDeLaBase);
  if (!base(contenido)) errores.push(...base.errors);

  const reglas = validadoresDeReglas.get(codigo);
  if (reglas && !reglas(contenido)) errores.push(...reglas.errors);

  const detalles = errores.map((error) => detalleDe(error, prefijo));
  const vistos = new Set();
  return detalles.filter((detalle) => {
    const clave = `${detalle.campo}|${detalle.mensaje}`;
    if (vistos.has(clave)) return false;
    vistos.add(clave);
    return true;
  });
}

// Imágenes y videos del contenido (ya validado) con la ruta de su campo y su clase, para
// comprobarlos contra la biblioteca: [{ campo: 'contenido.url_video', clase: 'VIDEO', url }].
export function archivosDelBloque(codigo, contenido, prefijo = 'contenido') {
  const archivos = [];
  const agregar = (ruta, clase, url) => {
    if (typeof url === 'string') archivos.push({ campo: `${prefijo}.${ruta}`, clase, url });
  };

  switch (codigo) {
    case 'hero_video':
      agregar('url_video', 'VIDEO', contenido.url_video);
      agregar('url_poster', 'IMAGEN', contenido.url_poster);
      break;
    case 'texto_imagen':
      agregar('url_imagen', 'IMAGEN', contenido.url_imagen);
      break;
    case 'tarjetas':
      contenido.items?.forEach((item, i) =>
        agregar(`items.${i}.url_imagen`, 'IMAGEN', item.url_imagen),
      );
      break;
    case 'galeria':
      contenido.imagenes?.forEach((imagen, i) =>
        agregar(`imagenes.${i}.url`, 'IMAGEN', imagen.url),
      );
      break;
    default:
  }
  return archivos;
}
