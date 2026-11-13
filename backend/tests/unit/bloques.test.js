// Validación con Ajv del contenido de los bloques de página (docs/api/contenido.md).
import { describe, expect, it } from 'vitest';
import { archivosDelBloque, validarContenidoDeBloque } from '../../src/validacion/bloques.js';
import { ejemplosDeBloques, esquemasDelSeed } from '../apoyo/bloques.js';

const ejemplos = ejemplosDeBloques();
const esquemas = esquemasDelSeed();

const errores = (tipo, contenido) => validarContenidoDeBloque(tipo, esquemas[tipo], contenido);
// Solo campo y mensaje de cada error, para comparar de un vistazo.
const como = (lista) => lista.map(({ campo, mensaje }) => `${campo}: ${mensaje}`);

describe('los ejemplos del contrato', () => {
  it('cubren los 6 tipos del seed', () => {
    expect(Object.keys(ejemplos).sort()).toEqual(Object.keys(esquemas).sort());
    expect(Object.keys(esquemas)).toHaveLength(6);
  });

  it.each(Object.keys(esquemas))('todos los ejemplos de «%s» son válidos', (tipo) => {
    expect(ejemplos[tipo].length).toBeGreaterThan(0);
    for (const ejemplo of ejemplos[tipo]) expect(errores(tipo, ejemplo)).toEqual([]);
  });
});

describe('errores comunes', () => {
  it('un campo obligatorio que falta se informa una sola vez, aunque lo exijan los dos pasos', () => {
    expect(como(errores('cita', {}))).toEqual(['contenido.texto: Es obligatorio.']);
    expect(como(errores('hero_video', { titulo: 'x' }))).toEqual([
      'contenido.url_video: Es obligatorio.',
    ]);
  });

  it('una clave que no es del tipo es «Campo no permitido.»', () => {
    expect(como(errores('cita', { texto: 'x', color: 'rojo' }))).toEqual([
      'contenido.color: Campo no permitido.',
    ]);
  });

  it('tipos y longitudes, con la ruta anidada de cada error', () => {
    expect(
      como(
        errores('tarjetas', {
          titulo: 'x'.repeat(121),
          items: [{ titulo: 5 }, { titulo: 'y'.repeat(81), subtitulo: 'z'.repeat(301) }],
        }),
      ),
    ).toEqual([
      'contenido.titulo: Puede tener hasta 120 caracteres.',
      'contenido.items.0.titulo: Debe ser un texto.',
      'contenido.items.1.titulo: Puede tener hasta 80 caracteres.',
      'contenido.items.1.subtitulo: Puede tener hasta 300 caracteres.',
    ]);
  });

  it('el contenido debe ser un objeto', () => {
    expect(como(errores('cita', 'texto'))).toEqual(['contenido: Debe ser un objeto.']);
    expect(como(errores('cita', [1]))).toEqual(['contenido: Debe ser un objeto.']);
  });

  it('el texto es plano: sin HTML', () => {
    expect(como(errores('cita', { texto: 'Hola <script>alert(1)</script>' }))).toEqual([
      'contenido.texto: Debe ser texto plano, sin HTML.',
    ]);
    expect(errores('cita', { texto: 'Dos < tres y 5 > 4\n\nOtro párrafo' })).toEqual([]);
  });

  it('un prefijo distinto cambia la ruta de los campos', () => {
    expect(validarContenidoDeBloque('cita', esquemas.cita, {}, 'bloque')[0].campo).toBe(
      'bloque.texto',
    );
  });
});

describe('reglas de cada tipo', () => {
  it('hero_video: botones hasta 3 con texto y enlace; enlaces y URL válidos', () => {
    const base = { titulo: 'Título', url_video: '/media/seed/portada-final.mp4' };
    const boton = { texto: 'Ver', enlace: '#horarios' };

    expect(errores('hero_video', { ...base, botones: [boton, boton, boton] })).toEqual([]);
    expect(como(errores('hero_video', { ...base, botones: [boton, boton, boton, boton] }))).toEqual(
      ['contenido.botones: Puede tener hasta 3 elementos.'],
    );
    expect(
      como(
        errores('hero_video', {
          ...base,
          url_video: 'http://inseguro.test/v.mp4',
          botones: [{ texto: 'Ver', enlace: 'javascript:alert(1)' }, { texto: 'Solo texto' }],
        }),
      ),
    ).toEqual([
      'contenido.url_video: Debe ser una URL https:// o una ruta del portal (/media/...).',
      expect.stringMatching(/^contenido\.botones\.0\.enlace: Debe ser un ancla/),
      'contenido.botones.1.enlace: Es obligatorio.',
    ]);
  });

  it('las URL relativas del portal no pueden empezar con // (otro sitio)', () => {
    const contenido = { titulo: 'T', texto: 'x', url_imagen: '//otro-sitio.test/a.webp' };
    expect(como(errores('texto_imagen', contenido))).toEqual([
      'contenido.url_imagen: Debe ser una URL https:// o una ruta del portal (/media/...).',
    ]);
  });

  it('texto_imagen: posición, tarjeta con título obligatorio y límites del texto', () => {
    expect(
      como(
        errores('texto_imagen', {
          titulo: 'T',
          texto: 'x'.repeat(3001),
          posicion_imagen: 'centro',
          tarjeta: { descripcion: 'd' },
        }),
      ),
    ).toEqual([
      // El esquema de la base se evalúa primero (paso 1) y después las reglas de la API (paso 2).
      'contenido.posicion_imagen: Debe ser uno de: izquierda, derecha.',
      'contenido.texto: Puede tener hasta 3000 caracteres.',
      'contenido.tarjeta.titulo: Es obligatorio.',
    ]);
  });

  it('tarjetas: de 1 a 12, icono de lucide en kebab-case', () => {
    expect(como(errores('tarjetas', { items: [] }))).toEqual([
      'contenido.items: Agrega al menos un elemento.',
    ]);
    const trece = Array.from({ length: 13 }, (_, i) => ({ titulo: `T${i}` }));
    expect(como(errores('tarjetas', { items: trece }))).toEqual([
      'contenido.items: Puede tener hasta 12 elementos.',
    ]);
    expect(
      como(
        errores('tarjetas', {
          items: [
            { titulo: 'T', icono: 'Clock3' },
            { titulo: 'U', icono: 'clock-3' },
          ],
        }),
      ),
    ).toEqual([
      'contenido.items.0.icono: Debe ser el nombre de un ícono de lucide-react en kebab-case (ej. clock-3).',
    ]);
  });

  it('galería: de 1 a 30 imágenes, cada una con url y texto alternativo', () => {
    expect(como(errores('galeria', { imagenes: [{ url: '/media/seed/a.webp' }] }))).toEqual([
      'contenido.imagenes.0.texto_alternativo: Es obligatorio.',
    ]);
    expect(como(errores('galeria', { imagenes: [] }))).toEqual([
      'contenido.imagenes: Agrega al menos un elemento.',
    ]);
  });

  it('video_youtube: id de 11 caracteres, no una URL', () => {
    expect(errores('video_youtube', { youtube_video_id: 'pX7aQm3kR2c' })).toEqual([]);
    expect(
      como(errores('video_youtube', { youtube_video_id: 'https://youtu.be/pX7aQm3kR2c' })),
    ).toEqual([
      'contenido.youtube_video_id: Debe ser un id de YouTube de 11 caracteres (letras, números, - y _).',
    ]);
  });

  it('un tipo sin reglas adicionales solo se valida con el esquema de la base', () => {
    const esquema = { type: 'object', required: ['a'], properties: { a: { type: 'string' } } };
    expect(como(validarContenidoDeBloque('futuro', esquema, {}))).toEqual([
      'contenido.a: Es obligatorio.',
    ]);
    expect(validarContenidoDeBloque('futuro', esquema, { a: 'x', b: 1 })).toEqual([]);
  });
});

describe('archivosDelBloque', () => {
  it('lista las imágenes y los videos con su campo y su clase', () => {
    expect(archivosDelBloque('hero_video', ejemplos.hero_video[0])).toEqual([
      { campo: 'contenido.url_video', clase: 'VIDEO', url: '/media/seed/portada-final.mp4' },
      {
        campo: 'contenido.url_poster',
        clase: 'IMAGEN',
        url: '/media/seed/exterior-parroquia.webp',
      },
    ]);
    expect(archivosDelBloque('galeria', ejemplos.galeria[0]).map((a) => a.campo)).toEqual([
      'contenido.imagenes.0.url',
      'contenido.imagenes.1.url',
      'contenido.imagenes.2.url',
    ]);
    expect(archivosDelBloque('tarjetas', ejemplos.tarjetas[1])).toEqual([
      {
        campo: 'contenido.items.0.url_imagen',
        clase: 'IMAGEN',
        url: '/media/seed/padre_gregorio.jpg',
      },
    ]);
    expect(archivosDelBloque('cita', ejemplos.cita[0])).toEqual([]);
    expect(archivosDelBloque('video_youtube', ejemplos.video_youtube[0])).toEqual([]);
  });
});
