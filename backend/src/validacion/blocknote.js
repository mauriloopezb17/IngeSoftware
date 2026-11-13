// Contenido de las publicaciones en formato BlockNote (docs/api/contenido.md). Se guarda tal
// como llega: aquí solo se comprueba que sea el subconjunto permitido, con las propiedades y los
// valores válidos. Las URL de imágenes y videos se comprueban contra la biblioteca en el servicio.
import { z } from 'zod';
import '../config/zod.js';

export const MAXIMO_BLOQUES = 500;
export const MAXIMO_BYTES = 512 * 1024;
const PROFUNDIDAD_MAXIMA = 3;

const COLORES = [
  'default',
  'gray',
  'brown',
  'red',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
  'pink',
];
const TIPOS = [
  'paragraph',
  'heading',
  'bulletListItem',
  'numberedListItem',
  'quote',
  'image',
  'video',
];

const color = z.enum(COLORES, { error: `Debe ser uno de: ${COLORES.join(', ')}.` });
const alineacion = z.enum(['left', 'center', 'right', 'justify'], {
  error: 'Debe ser left, center, right o justify.',
});
const verdadero = z.literal(true, { error: 'Debe ser true.' }).optional();

// ---- Contenido en línea ----

const estilos = z.strictObject({
  bold: verdadero,
  italic: verdadero,
  underline: verdadero,
  strike: verdadero,
  textColor: color.optional(),
  backgroundColor: color.optional(),
});

const texto = z.strictObject({
  type: z.literal('text'),
  text: z.string(),
  styles: estilos,
});

const enlace = z.strictObject({
  type: z.literal('link'),
  href: z
    .string()
    .max(2000, 'El enlace es demasiado largo.')
    .regex(
      /^(https:\/\/|http:\/\/|mailto:|tel:|\/|#)/i,
      'Debe empezar con https://, http://, mailto:, tel:, / o #.',
    ),
  content: z.array(texto),
});

const enLinea = z.discriminatedUnion('type', [texto, enlace], {
  error: 'Debe ser un texto (text) o un enlace (link).',
});

// ---- Bloques ----

const propsTexto = {
  textColor: color.optional(),
  backgroundColor: color.optional(),
  textAlignment: alineacion.optional(),
};

const propsArchivo = z.strictObject({
  textAlignment: alineacion.optional(),
  backgroundColor: color.optional(),
  name: z.string().max(255, 'Puede tener hasta 255 caracteres.').optional(),
  url: z.string().min(1, 'Es obligatoria.').max(1000, 'La URL es demasiado larga.'),
  caption: z.string().max(500, 'Puede tener hasta 500 caracteres.').optional(),
  showPreview: z.boolean().optional(),
  previewWidth: z.number().positive('Debe ser un número positivo.').optional(),
});

const idBloque = z.string().min(1, 'Es obligatorio.').max(100, 'Es demasiado largo.');
const sinHijos = z
  .array(z.unknown())
  .max(0, 'Solo los elementos de lista pueden tener bloques anidados.');

const bloqueDeTexto = (tipo, props, hijos = sinHijos) =>
  z.strictObject({
    id: idBloque,
    type: z.literal(tipo),
    props: z.strictObject(props),
    content: z.array(enLinea),
    children: hijos,
  });

const bloqueDeArchivo = (tipo) =>
  z.strictObject({ id: idBloque, type: z.literal(tipo), props: propsArchivo, children: sinHijos });

// Los elementos de lista solo anidan otros elementos de lista.
const hijosDeLista = z.lazy(() => z.array(elementoDeLista));

const elementoDeLista = z.discriminatedUnion(
  'type',
  [
    bloqueDeTexto('bulletListItem', propsTexto, hijosDeLista),
    bloqueDeTexto(
      'numberedListItem',
      { ...propsTexto, start: z.number().int('Debe ser un número entero.').optional() },
      hijosDeLista,
    ),
  ],
  { error: 'Solo se pueden anidar elementos de lista (bulletListItem o numberedListItem).' },
);

const bloque = z.discriminatedUnion(
  'type',
  [
    bloqueDeTexto('paragraph', propsTexto),
    bloqueDeTexto('heading', {
      ...propsTexto,
      level: z.union([z.literal(2), z.literal(3)], { error: 'Debe ser 2 o 3.' }),
      isToggleable: z.literal(false, { error: 'Debe ser false.' }).optional(),
    }),
    ...elementoDeLista.options,
    bloqueDeTexto('quote', { textColor: color.optional(), backgroundColor: color.optional() }),
    bloqueDeArchivo('image'),
    bloqueDeArchivo('video'),
  ],
  { error: `Tipo de bloque no permitido. Se aceptan: ${TIPOS.join(', ')}.` },
);

// Recorre los bloques (también los anidados): visitar(bloque, ruta, profundidad).
function recorrer(bloques, visitar, ruta = ['bloques'], profundidad = 1) {
  bloques.forEach((actual, indice) => {
    const rutaBloque = [...ruta, indice];
    visitar(actual, rutaBloque, profundidad);
    recorrer(actual.children ?? [], visitar, [...rutaBloque, 'children'], profundidad + 1);
  });
}

// Límites del documento completo: cantidad de bloques, profundidad, ids únicos y tamaño.
function comprobarLimites(documento, ctx) {
  let cantidad = 0;
  const ids = new Set();

  recorrer(documento.bloques, (actual, ruta, profundidad) => {
    cantidad++;
    if (profundidad > PROFUNDIDAD_MAXIMA) {
      ctx.addIssue({
        code: 'custom',
        path: ruta,
        message: `Se pueden anidar hasta ${PROFUNDIDAD_MAXIMA} niveles.`,
      });
    }
    if (ids.has(actual.id)) {
      ctx.addIssue({
        code: 'custom',
        path: [...ruta, 'id'],
        message: `Se repite el id «${actual.id}».`,
      });
    }
    ids.add(actual.id);
  });

  if (cantidad > MAXIMO_BLOQUES) {
    ctx.addIssue({
      code: 'custom',
      path: ['bloques'],
      message: `Puede tener hasta ${MAXIMO_BLOQUES} bloques (contando los anidados).`,
    });
  }
  if (Buffer.byteLength(JSON.stringify(documento)) > MAXIMO_BYTES) {
    ctx.addIssue({ code: 'custom', path: [], message: 'El contenido no puede pasar de 512 KB.' });
  }
}

export const contenidoBlockNote = z
  .strictObject({
    formato: z.literal('blocknote', { error: 'Debe ser "blocknote".' }),
    version: z.literal(1, { error: 'Debe ser 1.' }),
    bloques: z.array(bloque, { error: 'Debe ser una lista de bloques.' }),
  })
  .superRefine(comprobarLimites);

// ---- Lectura de un documento ya validado ----

const textoDe = (contenido = []) =>
  contenido.map((parte) => (parte.type === 'link' ? textoDe(parte.content) : parte.text)).join('');

const esParrafoVacio = (actual) =>
  actual.type === 'paragraph' &&
  textoDe(actual.content).trim() === '' &&
  (actual.children ?? []).length === 0;

// ¿Tiene contenido? Un documento cuyos bloques son todos párrafos vacíos cuenta como vacío.
export function tieneContenido(documento) {
  return (documento?.bloques ?? []).some((actual) => !esParrafoVacio(actual));
}

// URL de las imágenes y los videos del documento, con la ruta de su campo para los errores:
// [{ campo: 'contenido.bloques.3.props.url', clase: 'IMAGEN', url }].
export function archivosDelContenido(documento, prefijo = 'contenido') {
  const archivos = [];
  recorrer(documento?.bloques ?? [], (actual, ruta) => {
    if (actual.type === 'image' || actual.type === 'video') {
      archivos.push({
        campo: [prefijo, ...ruta, 'props', 'url'].join('.'),
        clase: actual.type === 'image' ? 'IMAGEN' : 'VIDEO',
        url: actual.props.url,
      });
    }
  });
  return archivos;
}
