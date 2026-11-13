// Editor del cuerpo de una publicación (BlockNote). Se carga con React.lazy desde el formulario:
// ni el resto del panel ni el portal descargan BlockNote.
import { useEffect, useEffectEvent } from 'react';
import { filterSuggestionItems } from '@blocknote/core';
import { es } from '@blocknote/core/locales';
import '@blocknote/core/fonts/inter.css';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import {
  blockTypeSelectItems,
  FormattingToolbar,
  FormattingToolbarController,
  getDefaultReactSlashMenuItems,
  getFormattingToolbarItems,
  SuggestionMenuController,
  useCreateBlockNote,
} from '@blocknote/react';

import { bloquesIniciales } from '../contenido.js';
import { esOpcionPermitidaDelMenu, esquemaPublicacion, esTipoDeBloquePermitido } from './esquema.js';

// `valorInicial`: el `contenido` de la API (o undefined). Solo se lee al montar el editor.
// `alIniciar(bloques)`: el documento tal como quedó cargado (BlockNote lo normaliza), para que quien
//   lo use detecte cambios sin falsos positivos.
// `alCambiar(bloques)`: cada vez que cambia el documento (`editor.document`).
export default function EditorContenido({ valorInicial, alIniciar, alCambiar, etiqueta = 'Contenido de la publicación' }) {
  const editor = useCreateBlockNote({
    schema: esquemaPublicacion,
    dictionary: es,
    initialContent: bloquesIniciales(valorInicial),
  });

  const informarInicio = useEffectEvent(() => alIniciar?.(editor.document));
  useEffect(() => {
    informarInicio();
  }, []);

  const tiposDeBloque = blockTypeSelectItems(editor).filter(esTipoDeBloquePermitido);

  return (
    <div role="group" aria-label={etiqueta} className="rounded-md border border-borderSoft bg-white py-2">
      <BlockNoteView
        editor={editor}
        theme="light"
        slashMenu={false}
        formattingToolbar={false}
        emojiPicker={false}
        onChange={() => alCambiar?.(editor.document)}
      >
        <FormattingToolbarController
          formattingToolbar={() => <FormattingToolbar>{getFormattingToolbarItems(tiposDeBloque)}</FormattingToolbar>}
        />
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async (consulta) =>
            filterSuggestionItems(
              (await getDefaultReactSlashMenuItems(editor)).filter(esOpcionPermitidaDelMenu),
              consulta,
            )
          }
        />
      </BlockNoteView>
    </div>
  );
}
