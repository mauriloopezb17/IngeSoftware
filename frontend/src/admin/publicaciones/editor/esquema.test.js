import { describe, expect, it } from 'vitest';
import { BlockNoteEditor } from '@blocknote/core';
import { blockTypeSelectItems, getDefaultReactSlashMenuItems } from '@blocknote/react';

import {
  BLOQUES_PERMITIDOS,
  ESTILOS_PERMITIDOS,
  esOpcionPermitidaDelMenu,
  esquemaPublicacion,
  esTipoDeBloquePermitido,
} from './esquema.js';

// Los tipos que BlockNote trae y contenido.md prohíbe (la API responde 400 VALIDACION).
const BLOQUES_PROHIBIDOS = ['table', 'codeBlock', 'file', 'audio', 'checkListItem', 'toggleListItem', 'divider', 'pageBreak'];

const crearEditor = () => BlockNoteEditor.create({ schema: esquemaPublicacion });

describe('configuración del editor de publicaciones (contenido.md)', () => {
  it('ofrece exactamente los siete tipos de bloque permitidos', () => {
    const tipos = Object.keys(crearEditor().schema.blockSchema);

    expect(tipos.sort()).toEqual([...BLOQUES_PERMITIDOS].sort());
  });

  it('no incluye ninguno de los tipos de bloque prohibidos', () => {
    const tipos = Object.keys(crearEditor().schema.blockSchema);

    for (const prohibido of BLOQUES_PROHIBIDOS) expect(tipos).not.toContain(prohibido);
  });

  it('ofrece solo los estilos permitidos (sin «code») y los dos contenidos en línea: texto y enlace', () => {
    const { styleSchema, inlineContentSchema } = crearEditor().schema;

    expect(Object.keys(styleSchema).sort()).toEqual([...ESTILOS_PERMITIDOS].sort());
    expect(Object.keys(styleSchema)).not.toContain('code');
    expect(Object.keys(inlineContentSchema).sort()).toEqual(['link', 'text']);
  });

  it('los títulos solo admiten los niveles 2 y 3: el título (h1) lo pone el portal', () => {
    const { level } = crearEditor().schema.blockSchema.heading.propSchema;

    expect(level.values).toEqual([2, 3]);
  });

  it('el menú «/» no ofrece títulos desplegables ni emojis; sí los bloques permitidos', async () => {
    const editor = crearEditor();
    const todas = await getDefaultReactSlashMenuItems(editor);
    const ofrecidas = todas.filter(esOpcionPermitidaDelMenu).map((item) => item.key);

    expect(ofrecidas.sort()).toEqual(
      ['bullet_list', 'heading_2', 'heading_3', 'image', 'numbered_list', 'paragraph', 'quote', 'video'].sort(),
    );
    // Lo que BlockNote traía y se quitó.
    expect(todas.map((item) => item.key)).toEqual(expect.arrayContaining(['toggle_heading_2', 'emoji']));
    expect(ofrecidas.some((clave) => clave.startsWith('toggle') || clave === 'emoji')).toBe(false);
    // Tampoco aparecen tablas, código, archivos, audio, casillas ni separadores.
    for (const prohibido of ['table', 'code_block', 'file', 'audio', 'check_list', 'divider', 'page_break'])
      expect(todas.map((item) => item.key)).not.toContain(prohibido);
  });

  it('el selector de tipo de bloque de la barra no ofrece los títulos desplegables', () => {
    const editor = crearEditor();
    const ofrecidos = blockTypeSelectItems(editor).filter(esTipoDeBloquePermitido);

    expect(ofrecidos.map((item) => item.type)).toEqual([
      'paragraph',
      'heading',
      'heading',
      'quote',
      'bulletListItem',
      'numberedListItem',
    ]);
    expect(ofrecidos.some((item) => item.props?.isToggleable)).toBe(false);
  });

  it('un documento con un bloque de otro tipo no se carga: el editor no lo conoce', () => {
    expect(() =>
      BlockNoteEditor.create({
        schema: esquemaPublicacion,
        initialContent: [{ id: 't', type: 'table', content: { type: 'tableContent', rows: [] } }],
      }),
    ).toThrow();
  });
});
