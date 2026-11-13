// Editor del cuerpo de una publicación (BlockNote). Se carga con React.lazy desde el formulario:
// ni el resto del panel ni el portal descargan BlockNote.
import { useEffect, useEffectEvent, useState } from 'react';
import { filterSuggestionItems } from '@blocknote/core';
import { es } from '@blocknote/core/locales';
import '@blocknote/core/fonts/inter.css';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import {
  blockTypeSelectItems,
  FilePanel,
  FilePanelController,
  FormattingToolbar,
  FormattingToolbarController,
  getDefaultReactSlashMenuItems,
  getFormattingToolbarItems,
  SuggestionMenuController,
  UploadTab,
  useCreateBlockNote,
} from '@blocknote/react';

import SelectorImagenes from '../../multimedia/SelectorImagenes.jsx';
import { bloquesIniciales } from '../contenido.js';
import { esOpcionPermitidaDelMenu, esquemaPublicacion, esTipoDeBloquePermitido } from './esquema.js';
import { propiedadesDeArchivo, subirArchivoDelEditor } from './subida.js';

// Panel de archivos de un bloque imagen/video. Solo ofrece subir un archivo y, en las imágenes, elegir uno
// de la biblioteca: no se pueden pegar enlaces externos (la API los rechaza con 400).
function PanelArchivo({ blockId, editor, alElegirDeBiblioteca }) {
  const [cargando, setCargando] = useState(false);
  const esImagen = editor.getBlock(blockId)?.type === 'image';
  const { upload } = editor.dictionary.file_panel;

  const pestanas = [
    { name: upload.title, tabPanel: <UploadTab blockId={blockId} setLoading={setCargando} /> },
  ];
  if (esImagen) {
    pestanas.push({
      name: 'Biblioteca',
      tabPanel: (
        <div className="p-3">
          <button
            type="button"
            onClick={() => alElegirDeBiblioteca(blockId)}
            className="rounded-md bg-gold px-3 py-2 text-sm font-semibold text-ink hover:bg-goldDark hover:text-white"
          >
            Elegir de la biblioteca
          </button>
        </div>
      ),
    });
  }

  return <FilePanel blockId={blockId} tabs={pestanas} loading={cargando} />;
}

// `valorInicial`: el `contenido` de la API (o undefined). Solo se lee al montar el editor.
// `alIniciar(bloques)`: el documento tal como quedó cargado (BlockNote lo normaliza), para que quien
//   lo use detecte cambios sin falsos positivos.
// `alCambiar(bloques)`: cada vez que cambia el documento (`editor.document`).
export default function EditorContenido({ valorInicial, alIniciar, alCambiar, etiqueta = 'Contenido de la publicación' }) {
  const editor = useCreateBlockNote({
    schema: esquemaPublicacion,
    dictionary: es,
    initialContent: bloquesIniciales(valorInicial),
    uploadFile: subirArchivoDelEditor,
  });
  // Bloque de imagen para el que se está eligiendo un archivo de la biblioteca.
  const [bloqueEnBiblioteca, setBloqueEnBiblioteca] = useState(null);

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
        filePanel={false}
        onChange={() => alCambiar?.(editor.document)}
      >
        <FormattingToolbarController
          formattingToolbar={() => <FormattingToolbar>{getFormattingToolbarItems(tiposDeBloque)}</FormattingToolbar>}
        />
        <FilePanelController
          filePanel={({ blockId }) => (
            <PanelArchivo
              blockId={blockId}
              editor={editor}
              alElegirDeBiblioteca={(id) => {
                editor.filePanel?.closeMenu();
                setBloqueEnBiblioteca(id);
              }}
            />
          )}
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
      {bloqueEnBiblioteca && (
        <SelectorImagenes
          onCerrar={() => setBloqueEnBiblioteca(null)}
          onSeleccionar={(imagen) => {
            editor.updateBlock(bloqueEnBiblioteca, {
              props: propiedadesDeArchivo({ ...imagen, nombreOriginal: imagen.url.split('/').pop() }),
            });
            setBloqueEnBiblioteca(null);
          }}
        />
      )}
    </div>
  );
}
