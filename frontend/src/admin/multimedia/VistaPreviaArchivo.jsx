import { ExternalLink } from 'lucide-react';

import Dialogo from '../componentes/Dialogo.jsx';
import { formatearFecha, formatearTamano } from './formato.js';
import MiniaturaArchivo from './MiniaturaArchivo.jsx';
import { claseDeTipo, nombreDeTipo } from './tipos.js';

function Dato({ etiqueta, children }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-2 py-1.5 text-sm">
      <dt className="text-muted">{etiqueta}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

function Contenido({ archivo }) {
  const clase = claseDeTipo(archivo.tipoMime);

  if (clase === 'VIDEO') {
    return (
      <video controls preload="metadata" src={archivo.url} className="max-h-[50vh] w-full rounded-md bg-deep">
        Tu navegador no puede reproducir este video.
      </video>
    );
  }

  if (clase === 'DOCUMENTO') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md bg-stone py-8">
        <div className="size-24">
          <MiniaturaArchivo archivo={archivo} />
        </div>
        <a
          href={archivo.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-ink hover:bg-goldDark hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-goldDark"
        >
          Abrir el PDF <ExternalLink className="size-4" aria-hidden="true" />
        </a>
      </div>
    );
  }

  return (
    <div className="flex max-h-[50vh] justify-center overflow-hidden rounded-md bg-stone">
      <MiniaturaArchivo
        key={archivo.url}
        archivo={archivo}
        alt={archivo.textoAlternativo ?? ''}
        className="max-h-[50vh] max-w-full object-contain"
      />
    </div>
  );
}

// Vista previa de un archivo con todos sus datos, en un diálogo.
export default function VistaPreviaArchivo({ archivo, onCerrar }) {
  const esImagen = claseDeTipo(archivo.tipoMime) === 'IMAGEN';

  return (
    <Dialogo titulo={archivo.nombreOriginal} onCerrar={onCerrar}>
      <Contenido archivo={archivo} />

      <dl className="mt-4 divide-y divide-borderSoft">
        <Dato etiqueta="Tipo">
          {nombreDeTipo(archivo.tipoMime)} ({archivo.tipoMime})
        </Dato>
        <Dato etiqueta="Tamaño">{formatearTamano(archivo.tamanoBytes)}</Dato>
        {archivo.ancho && archivo.alto && (
          <Dato etiqueta="Dimensiones">
            {archivo.ancho} × {archivo.alto} px
          </Dato>
        )}
        <Dato etiqueta="Subido por">{archivo.subidoPor.nombreCompleto}</Dato>
        <Dato etiqueta="Fecha de subida">{formatearFecha(archivo.fechaSubida)}</Dato>
        <Dato etiqueta="Sede">{archivo.sede.nombre}</Dato>
        <Dato etiqueta="Uso">{archivo.enUso ? 'En uso en el portal' : 'Sin usar'}</Dato>
        <Dato etiqueta="Texto alternativo">
          {archivo.textoAlternativo ? (
            archivo.textoAlternativo
          ) : (
            <span className="text-terracotta">
              {esImagen ? 'Sin texto alternativo: es necesario para publicar la imagen en el portal.' : 'Sin texto alternativo.'}
            </span>
          )}
        </Dato>
        <Dato etiqueta="Dirección">
          <span className="break-all text-xs text-muted">{archivo.url}</span>
        </Dato>
      </dl>
    </Dialogo>
  );
}
