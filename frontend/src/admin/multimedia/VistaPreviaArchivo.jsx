import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import ConfirmarAccion from '../componentes/ConfirmarAccion.jsx';
import Dialogo from '../componentes/Dialogo.jsx';
import { usePermisos } from '../permisos/usePermisos.js';
import { Boton } from '../ui/index.js';
import { CLAVE_MULTIMEDIA, eliminarArchivo } from './api.js';
import { formatearFecha, formatearTamano } from './formato.js';
import FormularioTextoAlternativo from './FormularioTextoAlternativo.jsx';
import MiniaturaArchivo from './MiniaturaArchivo.jsx';
import { claseDeTipo, nombreDeTipo } from './tipos.js';

function Dato({ etiqueta, children }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-2 py-2 text-sm">
      <dt className="text-muted">{etiqueta}</dt>
      <dd className="min-w-0 break-words text-ink">{children}</dd>
    </div>
  );
}

function Contenido({ archivo }) {
  const clase = claseDeTipo(archivo.tipoMime);

  if (clase === 'VIDEO') {
    return (
      <video controls preload="metadata" src={archivo.url} className="max-h-[50vh] w-full rounded-md bg-ink">
        Tu navegador no puede reproducir este video.
      </video>
    );
  }

  if (clase === 'DOCUMENTO') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md bg-panel py-8">
        <div className="size-24">
          <MiniaturaArchivo archivo={archivo} />
        </div>
        <Boton
          como="a"
          href={archivo.url}
          target="_blank"
          rel="noopener noreferrer"
          variante="primario"
        >
          Abrir el PDF <ExternalLink className="size-4" aria-hidden="true" />
        </Boton>
      </div>
    );
  }

  return (
    <div className="flex max-h-[50vh] justify-center overflow-hidden rounded-md bg-panel">
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
export default function VistaPreviaArchivo({ archivo, onCerrar, onCambio, onEliminado }) {
  const queryClient = useQueryClient();
  const { puede, puedeEliminarArchivo } = usePermisos();
  const [editando, setEditando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const botonEditar = useRef(null);
  const eraEditando = useRef(false);

  const eliminar = useMutation({
    mutationKey: [...CLAVE_MULTIMEDIA, 'eliminar'],
    mutationFn: () => eliminarArchivo(archivo.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLAVE_MULTIMEDIA });
      onEliminado(archivo);
    },
  });

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

        <dl className="mt-4 divide-y divide-sand">
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
                  <p className="text-danger">
                    {esImagen
                      ? 'Sin texto alternativo: es necesario para publicar la imagen en el portal.'
                      : 'Sin texto alternativo.'}
                  </p>
                )}
                {puedeEditar && (
                  <div className="mt-2">
                    <Boton
                      ref={botonEditar}
                      variante="secundario"
                      tamano="sm"
                      icono={Pencil}
                      onClick={() => setEditando(true)}
                    >
                      Editar texto alternativo
                    </Boton>
                  </div>
                )}
              </>
            )}
          </Dato>
          <Dato etiqueta="Dirección">
            <span className="break-all text-xs text-muted">{archivo.url}</span>
          </Dato>
        </dl>

        {puedeEliminar && (
          <div className="mt-5 border-t border-sand pt-4">
            <Boton
              variante="peligro"
              tamano="sm"
              icono={Trash2}
              onClick={() => setConfirmando(true)}
              disabled={Boolean(motivoSinEliminar)}
              aria-describedby={motivoSinEliminar ? 'motivo-sin-eliminar' : undefined}
            >
              Eliminar archivo
            </Boton>
            {motivoSinEliminar && (
              <p id="motivo-sin-eliminar" className="mt-2 text-xs text-muted">
                {motivoSinEliminar}
              </p>
            )}
          </div>
        )}
      </Dialogo>

      {confirmando && (
        <ConfirmarAccion
          titulo={`¿Eliminar «${archivo.nombreOriginal}»?`}
          pendiente={eliminar.isPending}
          error={eliminar.error}
          onConfirmar={() => {
            eliminar.reset();
            eliminar.mutate();
          }}
          onCancelar={() => {
            eliminar.reset();
            setConfirmando(false);
          }}
        >
          Se borrará de la biblioteca y del almacenamiento. Esta acción no se puede deshacer.
        </ConfirmarAccion>
      )}
    </>
  );
}
