import { useId, useRef, useState } from 'react';
import { AlertCircle, Ban, CheckCircle2, RotateCcw, Trash2, UploadCloud, X } from 'lucide-react';

import BarraProgreso from './BarraProgreso.jsx';
import { formatearTamano } from './formato.js';
import { claseDeTipo, nombreDeTipo } from './tipos.js';
import { ACCEPT_ARCHIVOS, RESUMEN_DE_LIMITES, tipoDelArchivo } from './validacion.js';
import { useColaSubida } from './useColaSubida.js';

const botonSecundario =
  'flex items-center gap-1.5 rounded-md border border-borderSoft bg-white px-3 py-2 text-sm font-medium hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white';

function ElementoDeCola({ elemento, deshabilitado, onTexto, onQuitar, onReintentar, onCancelar }) {
  const idTexto = useId();
  const idAyuda = `${idTexto}-ayuda`;
  const { archivo, estado, mensaje, textoAlternativo, progreso } = elemento;
  const tipo = tipoDelArchivo(archivo);
  const esImagen = claseDeTipo(tipo) === 'IMAGEN';

  return (
    <li className="flex flex-col gap-2 rounded-md border border-borderSoft bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold">{archivo.name}</p>
          <p className="text-xs text-muted">
            {nombreDeTipo(tipo)} · {formatearTamano(archivo.size)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 text-sm">
          {estado === 'subiendo' && (
            <button
              type="button"
              onClick={onCancelar}
              aria-label={`Cancelar la subida de ${archivo.name}`}
              className={botonSecundario}
            >
              <Ban className="size-4" aria-hidden="true" /> Cancelar
            </button>
          )}
          {estado === 'cancelado' && (
            <span role="status" className="flex items-center gap-1.5 text-muted">
              <Ban className="size-4" aria-hidden="true" /> Subida cancelada
            </span>
          )}
          {estado === 'subido' && (
            <span className="flex items-center gap-1.5 font-medium text-green-700">
              <CheckCircle2 className="size-4" aria-hidden="true" /> Subido
            </span>
          )}
          {(estado === 'error' || estado === 'cancelado') && (
            <button type="button" onClick={onReintentar} disabled={deshabilitado} className={botonSecundario}>
              <RotateCcw className="size-4" aria-hidden="true" /> Reintentar
            </button>
          )}
          {(estado === 'pendiente' || estado === 'error' || estado === 'cancelado') && (
            <button
              type="button"
              onClick={onQuitar}
              disabled={deshabilitado}
              aria-label={`Quitar ${archivo.name}`}
              className="rounded-md p-2 text-muted hover:bg-stone hover:text-ink focus-visible:outline-2 focus-visible:outline-goldDark disabled:opacity-50"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {estado === 'subiendo' && <BarraProgreso nombre={archivo.name} progreso={progreso} />}

      {estado === 'error' && (
        <p role="alert" className="flex items-start gap-2 text-sm text-redParish">
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
            className="rounded-md border border-borderSoft px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-goldDark disabled:bg-stone"
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
        className={`flex flex-col items-center gap-3 rounded-lg border-2 border-dashed px-4 py-8 text-center ${
          arrastrando ? 'border-gold bg-goldPale' : 'border-borderSoft bg-white'
        }`}
      >
        <UploadCloud className="size-10 text-goldDark" aria-hidden="true" />
        <p className="font-medium">Arrastra aquí imágenes, videos o PDF</p>
        <button
          type="button"
          onClick={() => entrada.current.click()}
          disabled={cola.subiendo}
          className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-ink hover:bg-goldDark hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-goldDark disabled:cursor-not-allowed disabled:opacity-60"
        >
          Seleccionar archivos
        </button>
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
        <div role="alert" className="mt-4 rounded-lg border border-redParish/30 bg-redParish/5 p-4 text-sm text-redParish">
          <div className="flex items-start justify-between gap-3">
            <p className="font-semibold">
              {cola.rechazados.length === 1 ? 'No se agregó 1 archivo:' : `No se agregaron ${cola.rechazados.length} archivos:`}
            </p>
            <button
              type="button"
              onClick={cola.descartarRechazados}
              aria-label="Descartar los avisos de archivos rechazados"
              className="rounded-md p-1 hover:bg-redParish/10 focus-visible:outline-2 focus-visible:outline-redParish"
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
            <button
              type="button"
              onClick={cola.subirPendientes}
              disabled={cola.subiendo || pendientes === 0}
              className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-ink hover:bg-goldDark hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-goldDark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cola.subiendo
                ? 'Subiendo archivos…'
                : pendientes === 0
                  ? 'Subir archivos'
                  : pendientes === 1
                    ? 'Subir 1 archivo'
                    : `Subir ${pendientes} archivos`}
            </button>
            {subidos > 0 && (
              <button type="button" onClick={cola.quitarSubidos} disabled={cola.subiendo} className={botonSecundario}>
                Quitar los ya subidos
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
