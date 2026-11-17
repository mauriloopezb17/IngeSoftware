import { Insignia } from '../ui/index.js';
import { formatearTamano } from './formato.js';
import MiniaturaArchivo from './MiniaturaArchivo.jsx';
import { claseDeTipo, nombreDeTipo } from './tipos.js';

// Un archivo de la biblioteca. Es un botón: al activarlo se abre su vista previa.
export default function TarjetaArchivo({ archivo, onAbrir }) {
  const esImagen = claseDeTipo(archivo.tipoMime) === 'IMAGEN';
  const sinTextoAlternativo = esImagen && !archivo.textoAlternativo;

  return (
    <li>
      <button
        type="button"
        onClick={() => onAbrir(archivo)}
        aria-haspopup="dialog"
        className="group flex h-full w-full flex-col overflow-hidden rounded-lg border border-sand bg-white text-left transition-colors duration-150 ease-salida hover:border-ink/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink motion-reduce:transition-none"
      >
        <span className="block aspect-4/3 w-full overflow-hidden bg-panel">
          <MiniaturaArchivo archivo={archivo} />
        </span>
        <span className="flex flex-1 flex-col gap-1.5 p-3">
          <span className="break-words text-sm font-semibold leading-snug text-ink" title={archivo.nombreOriginal}>
            {archivo.nombreOriginal}
          </span>
          <span className="text-xs text-muted">
            {nombreDeTipo(archivo.tipoMime)} · {formatearTamano(archivo.tamanoBytes)}
          </span>
          {(archivo.enUso || sinTextoAlternativo) && (
            <span className="mt-auto flex flex-wrap gap-1.5 pt-1">
              {archivo.enUso && <Insignia variante="programado">En uso</Insignia>}
              {sinTextoAlternativo && <Insignia variante="rechazado">Sin texto alternativo</Insignia>}
            </span>
          )}
        </span>
      </button>
    </li>
  );
}
