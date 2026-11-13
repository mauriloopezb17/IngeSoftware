// Editor del cuerpo de una publicación (BlockNote). Se carga con React.lazy desde el formulario:
// ni el resto del panel ni el portal descargan BlockNote.
import { useEffect, useEffectEvent, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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

import BarraProgreso from '../../multimedia/BarraProgreso.jsx';
import SelectorImagenes from '../../multimedia/SelectorImagenes.jsx';
import { esErrorNoAutenticado, marcarSesionVencida } from '../../sesion/api.js';
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

// Archivos que el editor está subiendo ahora (los inicia BlockNote al soltar, pegar o elegir un archivo): cada
// uno con su avance y su AbortController, para mostrarlos y poder cancelarlos. BlockNote no informa el avance
// por sí mismo, así que el seguimiento va por fuera. Todo lo que usa `subir` es estable (el editor se crea una vez).
function useSubidasDelEditor() {
  const queryClient = useQueryClient();
  const [subidas, setSubidas] = useState([]);
  // Estado estable (no cambia entre renders): los controles de las subidas en curso y la función que pasa
  // el editor como `uploadFile`. Se crean una vez, igual que el editor.
  const [controles] = useState(() => new Map());
  const [subir] = useState(() => {
    let contador = 0;
    return async (archivo) => {
      const id = ++contador;
      const control = new AbortController();
      controles.set(id, control);
      setSubidas((actuales) => [...actuales, { id, nombre: archivo.name, progreso: 0 }]);
      try {
        return await subirArchivoDelEditor(archivo, {
          senal: control.signal,
          onProgreso: (progreso) =>
            setSubidas((actuales) => actuales.map((s) => (s.id === id ? { ...s, progreso } : s))),
        });
      } catch (error) {
        // Esta subida no pasa por las mutaciones: un 401 también marca la sesión como vencida.
        if (esErrorNoAutenticado(error)) marcarSesionVencida(queryClient);
        throw error;
      } finally {
        controles.delete(id);
        setSubidas((actuales) => actuales.filter((s) => s.id !== id));
      }
    };
  });

  // Al cerrar el editor no se deja una subida huérfana.
  useEffect(() => () => controles.forEach((control) => control.abort()), [controles]);

  return { subidas, subir, cancelar: (id) => controles.get(id)?.abort() };
}

// `valorInicial`: el `contenido` de la API (o undefined). Solo se lee al montar el editor.
// `alIniciar(bloques)`: el documento tal como quedó cargado (BlockNote lo normaliza), para que quien
//   lo use detecte cambios sin falsos positivos.
// `alCambiar(bloques)`: cada vez que cambia el documento (`editor.document`).
export default function EditorContenido({ valorInicial, alIniciar, alCambiar, etiqueta = 'Contenido de la publicación' }) {
  const { subidas, subir, cancelar } = useSubidasDelEditor();
  const editor = useCreateBlockNote({
    schema: esquemaPublicacion,
    dictionary: es,
    initialContent: bloquesIniciales(valorInicial),
    uploadFile: subir,
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
      {subidas.length > 0 && (
        <ul aria-label="Archivos que se están subiendo" aria-live="polite" className="mx-3 mt-2 flex flex-col gap-2 border-t border-borderSoft pt-3">
          {subidas.map(({ id, nombre, progreso }) => (
            <li key={id} className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <p className="min-w-0 break-words text-sm font-medium sm:w-1/3">{nombre}</p>
              <div className="min-w-0 flex-1">
                <BarraProgreso nombre={nombre} progreso={progreso} />
              </div>
              <button
                type="button"
                onClick={() => cancelar(id)}
                aria-label={`Cancelar la subida de ${nombre}`}
                className="w-fit rounded-md border border-borderSoft bg-white px-3 py-1.5 text-sm font-medium hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark"
              >
                Cancelar
              </button>
            </li>
          ))}
        </ul>
      )}
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
