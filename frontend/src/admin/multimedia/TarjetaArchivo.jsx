import { claseDeTipo, nombreDeTipo } from './tipos.js';
import { formatearTamano } from './formato.js';
import MiniaturaArchivo from './MiniaturaArchivo.jsx';

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
        className="group flex h-full w-full flex-col overflow-hidden rounded-lg border border-borderSoft bg-white text-left hover:border-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-goldDark"
      >
        <span className="block aspect-4/3 w-full overflow-hidden bg-stone">
          <MiniaturaArchivo archivo={archivo} />
        </span>
        <span className="flex flex-1 flex-col gap-1.5 p-3">
          <span className="break-words text-sm font-semibold leading-snug" title={archivo.nombreOriginal}>
            {archivo.nombreOriginal}
          </span>
          <span className="text-xs text-muted">
            {nombreDeTipo(archivo.tipoMime)} · {formatearTamano(archivo.tamanoBytes)}
          </span>
          {(archivo.enUso || sinTextoAlternativo) && (
            <span className="mt-auto flex flex-wrap gap-1.5 pt-1">
              {archivo.enUso && (
                <span className="rounded-full bg-goldPale px-2 py-0.5 text-xs font-medium text-goldDark">En uso</span>
              )}
              {sinTextoAlternativo && (
                <span className="rounded-full bg-terracotta/10 px-2 py-0.5 text-xs font-medium text-terracotta">
                  Sin texto alternativo
                </span>
              )}
            </span>
          )}
        </span>
      </button>
    </li>
  );
}
