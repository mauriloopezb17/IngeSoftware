import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Pencil, Trash2 } from 'lucide-react';

import Dialogo from '../componentes/Dialogo.jsx';
import { usePermisos } from '../permisos/usePermisos.js';
import ConfirmarEliminacion from './ConfirmarEliminacion.jsx';
import FormularioTextoAlternativo from './FormularioTextoAlternativo.jsx';
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

// Vista previa de un archivo con todos sus datos, en un diálogo. Desde aquí se edita su texto
// alternativo y se elimina, según los permisos del rol.
//   onCambio(archivo): el archivo se actualizó (la página muestra la versión nueva).
//   onEliminado(archivo): el archivo se eliminó (la página cierra la vista previa).
export default function VistaPreviaArchivo({ archivo, onCerrar, onCambio, onEliminado }) {
  const { puede, puedeEliminarArchivo } = usePermisos();
  const [editando, setEditando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const botonEditar = useRef(null);
  const eraEditando = useRef(false);

  // Al terminar de editar, el foco vuelve al botón «Editar».
  useEffect(() => {
    if (eraEditando.current && !editando) botonEditar.current?.focus();
    eraEditando.current = editando;
  }, [editando]);

  const esImagen = claseDeTipo(archivo.tipoMime) === 'IMAGEN';
  const puedeEditar = puede('multimedia.subir');
  const puedeEliminar = puede('multimedia.eliminar');

  // Por qué no se puede eliminar (null si se puede). La API lo vuelve a comprobar.
  const motivoSinEliminar = archivo.enUso
    ? 'Este archivo está en uso y no se puede eliminar.'
    : !puedeEliminarArchivo(archivo)
      ? 'Solo puedes eliminar los archivos que subiste.'
      : null;

  return (
    <>
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
            {editando ? (
              <FormularioTextoAlternativo
                archivo={archivo}
                onGuardado={(actualizado) => {
                  onCambio(actualizado);
                  setEditando(false);
                }}
                onCancelar={() => setEditando(false)}
              />
            ) : (
              <>
                {archivo.textoAlternativo ? (
                  <p>{archivo.textoAlternativo}</p>
                ) : (
                  <p className="text-terracotta">
                    {esImagen
                      ? 'Sin texto alternativo: es necesario para publicar la imagen en el portal.'
                      : 'Sin texto alternativo.'}
                  </p>
                )}
                {puedeEditar && (
                  <button
                    ref={botonEditar}
                    type="button"
                    onClick={() => setEditando(true)}
                    className="mt-2 flex items-center gap-1.5 rounded-md border border-borderSoft bg-white px-3 py-1.5 text-xs font-medium hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark"
                  >
                    <Pencil className="size-3.5" aria-hidden="true" /> Editar texto alternativo
                  </button>
                )}
              </>
            )}
          </Dato>
          <Dato etiqueta="Dirección">
            <span className="break-all text-xs text-muted">{archivo.url}</span>
          </Dato>
        </dl>

        {puedeEliminar && (
          <div className="mt-5 border-t border-borderSoft pt-4">
            <button
              type="button"
              onClick={() => setConfirmando(true)}
              disabled={Boolean(motivoSinEliminar)}
              aria-describedby={motivoSinEliminar ? 'motivo-sin-eliminar' : undefined}
              className="flex items-center gap-2 rounded-md border border-redParish/40 px-4 py-2 text-sm font-medium text-redParish hover:bg-redParish/5 focus-visible:outline-2 focus-visible:outline-redParish disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
            >
              <Trash2 className="size-4" aria-hidden="true" /> Eliminar archivo
            </button>
            {motivoSinEliminar && (
              <p id="motivo-sin-eliminar" className="mt-2 text-xs text-muted">
                {motivoSinEliminar}
              </p>
            )}
          </div>
        )}
      </Dialogo>

      {confirmando && (
        <ConfirmarEliminacion archivo={archivo} onCancelar={() => setConfirmando(false)} onEliminado={onEliminado} />
      )}
    </>
  );
}
