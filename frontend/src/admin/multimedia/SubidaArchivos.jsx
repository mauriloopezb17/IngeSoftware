import { useId, useRef, useState } from 'react';
import { AlertCircle, Ban, CheckCircle2, RotateCcw, Trash2, UploadCloud, X } from 'lucide-react';

import { Boton } from '../ui/index.js';
import BarraProgreso from './BarraProgreso.jsx';
import { formatearTamano } from './formato.js';
import { claseDeTipo, nombreDeTipo } from './tipos.js';
import { useColaSubida } from './useColaSubida.js';
import { ACCEPT_ARCHIVOS, RESUMEN_DE_LIMITES, tipoDelArchivo } from './validacion.js';

function ElementoDeCola({ elemento, deshabilitado, onTexto, onQuitar, onReintentar, onCancelar }) {
  const idTexto = useId();
  const idAyuda = `${idTexto}-ayuda`;
  const { archivo, estado, mensaje, textoAlternativo, progreso } = elemento;
  const tipo = tipoDelArchivo(archivo);
  const esImagen = claseDeTipo(tipo) === 'IMAGEN';

  return (
    <li className="flex flex-col gap-2 rounded-md border border-sand bg-white p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold text-ink">{archivo.name}</p>
          <p className="text-xs text-muted">
            {nombreDeTipo(tipo)} · {formatearTamano(archivo.size)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 text-sm">
          {estado === 'subiendo' && (
            <Boton
              variante="secundario"
              tamano="sm"
              icono={Ban}
              onClick={onCancelar}
              aria-label={`Cancelar la subida de ${archivo.name}`}
            >
              Cancelar
            </Boton>
          )}
          {estado === 'cancelado' && (
            <span role="status" className="flex items-center gap-1.5 text-muted">
              <Ban className="size-4" aria-hidden="true" /> Subida cancelada
            </span>
          )}
          {estado === 'subido' && (
            <span className="flex items-center gap-1.5 font-medium text-success">
              <CheckCircle2 className="size-4" aria-hidden="true" /> Subido
            </span>
          )}
          {(estado === 'error' || estado === 'cancelado') && (
            <Boton variante="secundario" tamano="sm" icono={RotateCcw} onClick={onReintentar} disabled={deshabilitado}>
              Reintentar
            </Boton>
          )}
          {(estado === 'pendiente' || estado === 'error' || estado === 'cancelado') && (
            <button
              type="button"
              onClick={onQuitar}
              disabled={deshabilitado}
              aria-label={`Quitar ${archivo.name}`}
              className="rounded-md p-2 text-muted transition-colors duration-150 ease-salida hover:bg-panel hover:text-ink focus-visible:outline-2 focus-visible:outline-ink disabled:opacity-50 motion-reduce:transition-none"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {estado === 'subiendo' && <BarraProgreso nombre={archivo.name} progreso={progreso} />}

      {estado === 'error' && (
        <p role="alert" className="flex items-start gap-2 text-sm text-danger">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {mensaje}
        </p>
      )}

      {esImagen && estado !== 'subido' && (
        <div className="flex flex-col gap-1">
          <label htmlFor={idTexto} className="text-xs font-semibold text-muted">
            Texto alternativo de {archivo.name}
          </label>
          <input
            id={idTexto}
            type="text"
            value={textoAlternativo}
            maxLength={255}
            disabled={estado !== 'pendiente' && estado !== 'error' && estado !== 'cancelado'}
            aria-describedby={idAyuda}
            onChange={(e) => onTexto(e.target.value)}
            className="min-h-10 rounded-md border border-sand bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink disabled:bg-panel"
          />
          <p id={idAyuda} className="text-xs text-muted">
            Recomendado: describe lo que se ve. Es necesario para publicar la imagen en el portal.
          </p>
        </div>
      )}
    </li>
  );
}

// Zona de subida: se puede arrastrar archivos o elegirlos con el botón. Los archivos válidos
// quedan en una lista donde se escribe el texto alternativo antes de enviarlos.
export default function SubidaArchivos() {
  const cola = useColaSubida();
  const entrada = useRef(null);
  const [arrastrando, setArrastrando] = useState(false);

  const pendientes = cola.elementos.filter((e) => e.estado === 'pendiente').length;
  const subidos = cola.elementos.filter((e) => e.estado === 'subido').length;

  function alSoltar(evento) {
    evento.preventDefault();
    setArrastrando(false);
    if (cola.subiendo) return;
    const archivos = [...evento.dataTransfer.files];
    if (archivos.length) cola.agregar(archivos);
  }

  function alElegir(evento) {
    cola.agregar([...evento.target.files]);
    evento.target.value = ''; // permite elegir de nuevo el mismo archivo
  }

  return (
    <section aria-labelledby="titulo-subida" className="mt-6">
      <h2 id="titulo-subida" className="sr-only">
        Subir archivos
      </h2>

      <div
        data-testid="zona-de-subida"
        onDragEnter={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setArrastrando(false);
        }}
        onDrop={alSoltar}
        className={`flex flex-col items-center gap-3 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors duration-150 ease-salida motion-reduce:transition-none ${
          arrastrando ? 'border-gold bg-gold-soft' : 'border-sand bg-white'
        }`}
      >
        <UploadCloud className="size-10 text-ink" aria-hidden="true" />
        <p className="font-medium text-ink">Arrastra aquí imágenes, videos o PDF</p>
        <Boton variante="primario" tamano="sm" onClick={() => entrada.current.click()} disabled={cola.subiendo}>
          Seleccionar archivos
        </Boton>
        <input
          ref={entrada}
          type="file"
          multiple
          accept={ACCEPT_ARCHIVOS}
          onChange={alElegir}
          aria-label="Archivos a subir"
          className="sr-only"
          tabIndex={-1}
        />
        <p className="text-xs text-muted">{RESUMEN_DE_LIMITES}</p>
      </div>

      {cola.rechazados.length > 0 && (
        <div role="alert" className="mt-4 rounded-lg border border-danger/30 bg-danger-soft p-4 text-sm text-danger">
          <div className="flex items-start justify-between gap-3">
            <p className="font-semibold">
              {cola.rechazados.length === 1 ? 'No se agregó 1 archivo:' : `No se agregaron ${cola.rechazados.length} archivos:`}
            </p>
            <button
              type="button"
              onClick={cola.descartarRechazados}
              aria-label="Descartar los avisos de archivos rechazados"
              className="rounded-md p-1 hover:bg-danger/10 focus-visible:outline-2 focus-visible:outline-ink"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {cola.rechazados.map(({ id, nombre, mensaje }) => (
              <li key={id}>
                <span className="font-medium">«{nombre}»</span>: {mensaje}
              </li>
            ))}
          </ul>
        </div>
      )}

      {cola.elementos.length > 0 && (
        <div className="mt-4">
          <ul className="flex flex-col gap-3" aria-label="Archivos por subir">
            {cola.elementos.map((elemento) => (
              <ElementoDeCola
                key={elemento.id}
                elemento={elemento}
                deshabilitado={cola.subiendo}
                onTexto={(texto) => cola.cambiarTexto(elemento.id, texto)}
                onQuitar={() => cola.quitar(elemento.id)}
                onReintentar={() => cola.reintentar(elemento.id)}
                onCancelar={() => cola.cancelar(elemento.id)}
              />
            ))}
          </ul>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Boton
              variante="primario"
              onClick={cola.subirPendientes}
              cargando={cola.subiendo}
              disabled={pendientes === 0}
            >
              {cola.subiendo
                ? 'Subiendo archivos…'
                : pendientes === 0
                  ? 'Subir archivos'
                  : pendientes === 1
                    ? 'Subir 1 archivo'
                    : `Subir ${pendientes} archivos`}
            </Boton>
            {subidos > 0 && (
              <Boton variante="secundario" onClick={cola.quitarSubidos} disabled={cola.subiendo}>
                Quitar los ya subidos
              </Boton>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
