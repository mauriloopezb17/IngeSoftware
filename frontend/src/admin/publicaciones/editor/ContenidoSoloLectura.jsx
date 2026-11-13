// El cuerpo de una publicación como lo ve quien lo lee: BlockNote en solo lectura. Se carga con React.lazy
// desde la vista previa, igual que el editor.
import { es } from '@blocknote/core/locales';
import '@blocknote/core/fonts/inter.css';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import { useCreateBlockNote } from '@blocknote/react';

import { bloquesIniciales } from '../contenido.js';
import { esquemaPublicacion } from './esquema.js';

// `bloques`: lista de bloques de BlockNote (editor.document). Solo se lee al montar.
export default function ContenidoSoloLectura({ bloques }) {
  const editor = useCreateBlockNote({
    schema: esquemaPublicacion,
    dictionary: es,
    initialContent: bloquesIniciales({ formato: 'blocknote', version: 1, bloques }),
  });

  return (
    <div data-testid="contenido-solo-lectura">
      <BlockNoteView editor={editor} theme="light" editable={false} sideMenu={false} slashMenu={false} />
    </div>
  );
}
