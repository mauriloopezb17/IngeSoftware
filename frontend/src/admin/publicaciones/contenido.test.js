import { describe, expect, it } from 'vitest';
import { BlockNoteEditor } from '@blocknote/core';

import { aContenido, COLORES_PERMITIDOS, normalizarColores } from './contenido.js';
import { esquemaPublicacion } from './editor/esquema.js';

const coloresSet = new Set(COLORES_PERMITIDOS);

function recogerColoresFueraDeLista(bloques, ruta = 'bloques') {
  const invalidos = [];
  bloques.forEach((bloque, i) => {
    const base = `${ruta}.${i}`;
    for (const clave of ['textColor', 'backgroundColor']) {
      const valor = bloque.props?.[clave];
      if (valor !== undefined && !coloresSet.has(valor)) invalidos.push(`${base}.props.${clave}=${valor}`);
    }
    const revisarContenido = (partes = [], subruta = `${base}.content`) => {
      partes.forEach((parte, j) => {
        if (parte.type === 'link') {
          revisarContenido(parte.content, `${subruta}.${j}.content`);
          return;
        }
        for (const clave of ['textColor', 'backgroundColor']) {
          const valor = parte.styles?.[clave];
          if (valor !== undefined && !coloresSet.has(valor)) invalidos.push(`${subruta}.${j}.styles.${clave}=${valor}`);
        }
      });
    };
    revisarContenido(bloque.content);
    if (bloque.children?.length) invalidos.push(...recogerColoresFueraDeLista(bloque.children, `${base}.children`));
  });
  return invalidos;
}

describe('normalizarColores y aContenido', () => {
  it('pasa a "default" los colores rgb() y #hex en props, y elimina los no permitidos en styles sin mutar la entrada', () => {
    const entrada = [
      {
        id: 'b1',
        type: 'paragraph',
        props: { textColor: 'rgb(34, 34, 34)', backgroundColor: '#ffffff', textAlignment: 'left' },
        content: [
          {
            type: 'text',
            text: 'Noticia ',
            styles: { textColor: 'rgb(51, 51, 51)', backgroundColor: '#f5f5f5', bold: true },
          },
          {
            type: 'text',
            text: 'resaltada',
            styles: { textColor: '#111111' },
          },
        ],
        children: [],
      },
    ];
    const copiaOriginal = structuredClone(entrada);

    const salida = aContenido(entrada);

    expect(entrada).toEqual(copiaOriginal);
    expect(salida.formato).toBe('blocknote');
    expect(salida.version).toBe(1);
    expect(salida.bloques[0].props).toEqual({
      textColor: 'default',
      backgroundColor: 'default',
      textAlignment: 'left',
    });
    expect(salida.bloques[0].content[0].styles).toEqual({ bold: true });
    expect(salida.bloques[0].content[1].styles).toEqual({});
  });

  it('conserva los colores válidos de la paleta tanto en props como en styles', () => {
    const entrada = [
      {
        id: 'b1',
        type: 'paragraph',
        props: { textColor: 'blue', backgroundColor: 'yellow', textAlignment: 'left' },
        content: [
          { type: 'text', text: 'Texto', styles: { textColor: 'red', backgroundColor: 'gray', italic: true } },
        ],
        children: [],
      },
    ];

    const salida = normalizarColores(entrada);

    expect(salida).toEqual(entrada);
  });

  it('no agrega textColor a bloques de imagen o video que no lo tienen', () => {
    const entrada = [
      {
        id: 'img1',
        type: 'image',
        props: { backgroundColor: 'rgb(0, 0, 0)', url: '/media/seed/altar.webp', caption: 'Altar' },
        children: [],
      },
    ];

    const salida = normalizarColores(entrada);

    expect(salida[0].props).toEqual({
      backgroundColor: 'default',
      url: '/media/seed/altar.webp',
      caption: 'Altar',
    });
    expect('textColor' in salida[0].props).toBe(false);
  });

  it('recorre listas anidadas (children) y enlaces con texto coloreado (type: "link")', () => {
    const entrada = [
      {
        id: 'l1',
        type: 'bulletListItem',
        props: { textColor: 'rgb(10, 20, 30)', backgroundColor: 'default' },
        content: [
          {
            type: 'link',
            href: 'https://ejemplo.test',
            content: [
              { type: 'text', text: 'Enlace ', styles: { textColor: '#123456', underline: true } },
              { type: 'text', text: 'azul', styles: { textColor: 'blue' } },
            ],
          },
        ],
        children: [
          {
            id: 'l2',
            type: 'bulletListItem',
            props: { textColor: '#333', backgroundColor: 'rgba(0,0,0,0.1)' },
            content: [{ type: 'text', text: 'Subitem', styles: { backgroundColor: '#ff0' } }],
            children: [],
          },
        ],
      },
    ];

    const salida = normalizarColores(entrada);

    expect(salida[0].props).toEqual({ textColor: 'default', backgroundColor: 'default' });
    expect(salida[0].content[0].content[0].styles).toEqual({ underline: true });
    expect(salida[0].content[0].content[1].styles).toEqual({ textColor: 'blue' });
    expect(salida[0].children[0].props).toEqual({ textColor: 'default', backgroundColor: 'default' });
    expect(salida[0].children[0].content[0].styles).toEqual({});
  });

  it('regresión: limpia los colores CSS al pegar HTML en el editor real de BlockNote', () => {
    const editor = BlockNoteEditor.create({ schema: esquemaPublicacion });
    const htmlPegado = `
      <p style="color: rgb(34, 34, 34); background-color: rgb(255, 255, 255)">
        El cardenal <strong style="color: #111; background-color: rgb(250, 250, 250)">boliviano</strong>
        visitó la <a href="https://parroquia.test" style="color: #0055aa"><span style="color: #0055aa">parroquia</span></a>.
      </p>
      <ul>
        <li style="color: rgb(68, 68, 68)">
          Primer punto <span style="background-color: #eeeeee">con fondo</span>
          <ul>
            <li style="color: #222222">Subpunto anidado</li>
          </ul>
        </li>
      </ul>
    `;

    const bloquesPegados = editor.tryParseHTMLToBlocks(htmlPegado);
    const contenido = aContenido(bloquesPegados);

    expect(contenido.bloques.length).toBeGreaterThanOrEqual(2);
    expect(recogerColoresFueraDeLista(contenido.bloques)).toEqual([]);
  });
});
