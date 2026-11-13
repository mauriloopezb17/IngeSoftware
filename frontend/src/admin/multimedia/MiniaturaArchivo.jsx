import { useState } from 'react';
import { FileText, ImageOff, Video } from 'lucide-react';

import { claseDeTipo } from './tipos.js';

const ICONOS = { VIDEO: Video, DOCUMENTO: FileText };

// Imagen del archivo, o un ícono si no es una imagen o si no se pudo cargar
// (por ejemplo, las URL de ejemplo de los mocks no existen).
export default function MiniaturaArchivo({ archivo, alt = '', className = 'size-full object-cover' }) {
  const [fallo, setFallo] = useState(false);
  const clase = claseDeTipo(archivo.tipoMime);

  if (clase === 'IMAGEN' && !fallo) {
    return (
      <img
        src={archivo.url}
        alt={alt}
        loading="lazy"
        onError={() => setFallo(true)}
        className={className}
      />
    );
  }

  const Icono = ICONOS[clase] ?? ImageOff;
  return (
    <span
      data-testid="miniatura-sustituta"
      className="flex size-full min-h-32 items-center justify-center bg-stone text-muted"
    >
      <Icono className="size-10" aria-hidden="true" />
    </span>
  );
}
