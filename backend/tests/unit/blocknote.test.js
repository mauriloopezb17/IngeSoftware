// Validación del contenido BlockNote de las publicaciones (docs/api/contenido.md).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { errorDeZod } from '../../src/middlewares/errores.js';
import { claveDeLaUrl } from '../../src/services/referencias.service.js';
import {
  MAXIMO_BLOQUES,
  archivosDelContenido,
  contenidoBlockNote,
  tieneContenido,
} from '../../src/validacion/blocknote.js';

const documento = (...bloques) => ({ formato: 'blocknote', version: 1, bloques });
const parrafo = (texto = 'Texto', id = 'p1', extra = {}) => ({
  id,
  type: 'paragraph',
  props: {},
  content: texto === null ? [] : [{ type: 'text', text: texto, styles: {} }],
  children: [],
  ...extra,
});
const item = (id, children = []) => ({
  id,
  type: 'bulletListItem',
  props: {},
  content: [],
  children,
});

// Detalles del error de validación ({ campo, mensaje }), o null si es válido.
function errores(valor) {
  const resultado = contenidoBlockNote.safeParse(valor);
  return resultado.success ? null : errorDeZod(resultado.error, 'contenido').detalles;
}

// Ejemplo completo del contrato: el documento con los siete tipos de bloque.
const contrato = readFileSync(
  fileURLToPath(new URL('../../../docs/api/contenido.md', import.meta.url)),
  'utf8',
);
const ejemploCompleto = [...contrato.matchAll(/```json\n([\s\S]*?)```/g)]
  .map((bloque) => JSON.parse(bloque[1]))
  .find((valor) => valor.formato === 'blocknote' && valor.bloques.length > 0);

describe('contenidoBlockNote', () => {
  it('acepta el ejemplo completo del contrato y un documento vacío', () => {
    expect(errores(ejemploCompleto)).toBeNull();
    expect(errores(documento())).toBeNull();
  });

  it('exige el envoltorio y no acepta otras claves', () => {
    expect(errores({ formato: 'html', version: 2, bloques: {}, extra: true })).toEqual([
      { campo: 'contenido.formato', mensaje: 'Debe ser "blocknote".' },
      { campo: 'contenido.version', mensaje: 'Debe ser 1.' },
      { campo: 'contenido.bloques', mensaje: 'Debe ser una lista de bloques.' },
      { campo: 'contenido.extra', mensaje: 'Campo no permitido.' },
    ]);
  });

  it('rechaza los tipos fuera del subconjunto, con la ruta exacta', () => {
    expect(errores(documento(parrafo(), { ...parrafo(), id: 't', type: 'table' }))).toEqual([
      {
        campo: 'contenido.bloques.1.type',
        mensaje: expect.stringMatching(/^Tipo de bloque no permitido/),
      },
    ]);
  });

  it('valida las props de cada tipo: desconocidas, nivel del título y valores de la paleta', () => {
    const titulo = { ...parrafo(), type: 'heading', props: { level: 1, isToggleable: true } };
    const coloreado = parrafo('x', 'p2', { props: { textColor: 'fucsia', fontSize: 3 } });
    expect(errores(documento(titulo, coloreado))).toEqual([
      { campo: 'contenido.bloques.0.props.level', mensaje: 'Debe ser 2 o 3.' },
      { campo: 'contenido.bloques.0.props.isToggleable', mensaje: 'Debe ser false.' },
      {
        campo: 'contenido.bloques.1.props.textColor',
        mensaje: expect.stringMatching(/^Debe ser uno de/),
      },
      { campo: 'contenido.bloques.1.props.fontSize', mensaje: 'Campo no permitido.' },
    ]);
  });

  it('image y video: url obligatoria y sin "content"', () => {
    const imagen = { id: 'i', type: 'image', props: { url: '' }, content: [], children: [] };
    expect(errores(documento(imagen))).toEqual([
      { campo: 'contenido.bloques.0.props.url', mensaje: 'Es obligatoria.' },
      { campo: 'contenido.bloques.0.content', mensaje: 'Campo no permitido.' },
    ]);
  });

  it('contenido en línea: estilos permitidos y enlaces sin esquemas peligrosos', () => {
    const conEnlace = parrafo(null, 'p', {
      content: [
        { type: 'text', text: 'x', styles: { code: true } },
        { type: 'link', href: 'javascript:alert(1)', content: [] },
        { type: 'link', href: 'mailto:parroquia@ejemplo.test', content: [] },
      ],
    });
    expect(errores(documento(conEnlace))).toEqual([
      { campo: 'contenido.bloques.0.content.0.styles.code', mensaje: 'Campo no permitido.' },
      {
        campo: 'contenido.bloques.0.content.1.href',
        mensaje: 'Debe empezar con https://, http://, mailto:, tel:, / o #.',
      },
    ]);
  });

  it('solo los elementos de lista anidan, y hasta 3 niveles', () => {
    expect(errores(documento(parrafo('x', 'p', { children: [parrafo('y', 'q')] })))).toEqual([
      {
        campo: 'contenido.bloques.0.children',
        mensaje: 'Solo los elementos de lista pueden tener bloques anidados.',
      },
    ]);
    expect(errores(documento(item('a', [parrafo('y', 'q')])))[0].campo).toBe(
      'contenido.bloques.0.children.0.type',
    );
    expect(errores(documento(item('a', [item('b', [item('c')])])))).toBeNull();
    expect(errores(documento(item('a', [item('b', [item('c', [item('d')])])])))).toEqual([
      {
        campo: 'contenido.bloques.0.children.0.children.0.children.0',
        mensaje: 'Se pueden anidar hasta 3 niveles.',
      },
    ]);
  });

  it('los ids no se repiten y hay un máximo de bloques', () => {
    expect(errores(documento(parrafo('x', 'a'), parrafo('y', 'a')))).toEqual([
      { campo: 'contenido.bloques.1.id', mensaje: 'Se repite el id «a».' },
    ]);

    const muchos = Array.from({ length: MAXIMO_BLOQUES + 1 }, (_, i) => parrafo('x', `b${i}`));
    expect(errores(documento(...muchos))).toEqual([
      { campo: 'contenido.bloques', mensaje: expect.stringMatching(/^Puede tener hasta 500/) },
    ]);
  });

  it('el documento no puede pasar de 512 KB', () => {
    expect(errores(documento(parrafo('x'.repeat(530_000))))).toEqual([
      { campo: 'contenido', mensaje: 'El contenido no puede pasar de 512 KB.' },
    ]);
  });
});

describe('tieneContenido', () => {
  it('un documento sin bloques o con solo párrafos vacíos no tiene contenido', () => {
    expect(tieneContenido(documento())).toBe(false);
    expect(tieneContenido(documento(parrafo(null, 'a'), parrafo('   ', 'b')))).toBe(false);
  });

  it('cualquier texto, imagen o elemento de lista cuenta como contenido', () => {
    expect(tieneContenido(documento(parrafo(null, 'a'), parrafo('Hola', 'b')))).toBe(true);
    expect(tieneContenido(documento(item('a')))).toBe(true);
    expect(tieneContenido(ejemploCompleto)).toBe(true);
  });
});

describe('archivosDelContenido y claveDeLaUrl', () => {
  it('lista las imágenes y los videos con la ruta de su campo', () => {
    expect(archivosDelContenido(ejemploCompleto)).toEqual([
      {
        campo: 'contenido.bloques.6.props.url',
        clase: 'IMAGEN',
        url: '/media/seed/crucifijo.webp',
      },
      {
        campo: 'contenido.bloques.7.props.url',
        clase: 'VIDEO',
        url: '/media/seed/portada-final.mp4',
      },
    ]);
  });

  it('convierte la URL pública en la clave guardada', () => {
    const cdn = 'https://cdn.ejemplo.test';
    expect(claveDeLaUrl('/media/seed/altar.webp', cdn)).toBe('/media/seed/altar.webp');
    expect(claveDeLaUrl(`${cdn}/sedes/x/2026/11/abc.webp`, cdn)).toBe('sedes/x/2026/11/abc.webp');
    expect(claveDeLaUrl(`${cdn}/sedes/x/2026/11/abc-480w.webp`, cdn)).toBe(
      'sedes/x/2026/11/abc.webp',
    );
    expect(claveDeLaUrl('https://otro.test/abc.webp', cdn)).toBeNull();
    expect(claveDeLaUrl('//otro.test/abc.webp', cdn)).toBeNull();
    expect(claveDeLaUrl(`${cdn}/sedes/abc.webp`, null)).toBeNull();
  });
});
