import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ban, FileText, UploadCloud } from 'lucide-react';

import Dialogo from '../componentes/Dialogo.jsx';
import Paginacion from '../componentes/Paginacion.jsx';
import { CLAVE_MULTIMEDIA, subirArchivo } from '../multimedia/api.js';
import BarraProgreso from '../multimedia/BarraProgreso.jsx';
import { formatearFecha, formatearTamano } from '../multimedia/formato.js';
import { fueCancelada } from '../multimedia/subidaXhr.js';
import { useBiblioteca } from '../multimedia/useBiblioteca.js';
import { tipoDelArchivo, validarArchivoCliente } from '../multimedia/validacion.js';
import { usePermisos } from '../permisos/usePermisos.js';
import { Aviso, Boton, EsqueletoTarjetas } from '../ui/index.js';

const POR_PAGINA_SELECTOR = 6;

// Diálogo para elegir el PDF de un boletín: un documento de la biblioteca multimedia o uno que se sube
// ahora mismo (se guarda en la biblioteca y queda elegido). Devuelve el archivo con `onSeleccionar`.
export default function SelectorPdf({ seleccionadoId, onSeleccionar, onCerrar }) {
  const queryClient = useQueryClient();
  const { puede } = usePermisos();
  const entrada = useRef(null);
  const [pagina, setPagina] = useState(1);
  const [rechazo, setRechazo] = useState('');
  const [progreso, setProgreso] = useState(0);
  const [nombreSubiendo, setNombreSubiendo] = useState('');
  const control = useRef(null); // AbortController de la subida en curso
  const botonSubir = useRef(null);

  // Al cerrar el diálogo no se deja una subida huérfana.
  useEffect(() => () => control.current?.abort(), []);

  const { data, isPending, isError, error, isPlaceholderData, refetch } = useBiblioteca({
    clase: 'DOCUMENTO',
    orden: '-fechaSubida',
    pagina,
    porPagina: POR_PAGINA_SELECTOR,
  });

  const subir = useMutation({
    mutationFn: (archivo) => {
      control.current = new AbortController();
      setProgreso(0);
      setNombreSubiendo(archivo.name);
      return subirArchivo({ archivo, senal: control.current.signal, onProgreso: setProgreso });
    },
    // Tras cancelar o fallar, el botón de cancelar desaparece: el foco vuelve a «Subir un PDF».
    onError: () => requestAnimationFrame(() => botonSubir.current?.focus()),
    onSuccess: (archivo) => {
      queryClient.invalidateQueries({ queryKey: CLAVE_MULTIMEDIA });
      onSeleccionar(archivo);
    },
  });

  function alElegirArchivo(evento) {
    const archivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!archivo) return;
    setRechazo('');
    subir.reset();
    if (tipoDelArchivo(archivo) !== 'application/pdf') {
      setRechazo('El boletín debe ser un archivo PDF.');
      return;
    }
    const invalido = validarArchivoCliente(archivo);
    if (invalido) {
      setRechazo(invalido.mensaje);
      return;
    }
    subir.mutate(archivo);
  }

  const documentos = data?.datos ?? [];
  // Cancelar no es un fallo: no se muestra como error.
  const errorSubida = rechazo || (subir.error && !fueCancelada(subir.error) ? subir.error.message : '');

  return (
    <Dialogo titulo="PDF del boletín" onCerrar={onCerrar} ancho="max-w-2xl">
      {puede('multimedia.subir') && (
        <section aria-label="Subir un PDF nuevo" className="rounded-lg border border-dashed border-sand bg-panel p-4">
          <p className="text-sm text-ink">
            Sube el PDF del boletín. Queda guardado en la biblioteca multimedia (hasta 50 MB).
          </p>
          <input
            ref={entrada}
            type="file"
            accept="application/pdf,.pdf"
            onChange={alElegirArchivo}
            className="sr-only"
            aria-label="Archivo PDF"
            tabIndex={-1}
          />
          {subir.isPending ? (
            <div className="mt-3 flex flex-col gap-2">
              <BarraProgreso nombre={nombreSubiendo} progreso={progreso} />
              <div className="flex">
                <Boton
                  variante="secundario"
                  tamano="sm"
                  icono={Ban}
                  onClick={() => control.current?.abort()}
                  aria-label={`Cancelar la subida de ${nombreSubiendo}`}
                >
                  Cancelar
                </Boton>
              </div>
            </div>
          ) : (
            <div className="mt-3">
              <Boton
                ref={botonSubir}
                variante="primario"
                tamano="sm"
                icono={UploadCloud}
                onClick={() => entrada.current?.click()}
              >
                Subir un PDF
              </Boton>
            </div>
          )}
          {errorSubida && (
            <Aviso tipo="error" className="mt-3">
              <p>{errorSubida}</p>
            </Aviso>
          )}
        </section>
      )}

      <section aria-label="PDF de la biblioteca" className="mt-5">
        <h3 className="text-sm font-semibold text-ink">O elige uno de la biblioteca</h3>
        <div className="mt-3" aria-busy={isPending || isPlaceholderData}>
          {isPending && <EsqueletoTarjetas cantidad={3} columnas="grid-cols-1" etiqueta="Cargando documentos…" />}
          {isError && !data && (
            <Aviso
              tipo="error"
              accion={
                <Boton variante="secundario" tamano="sm" onClick={() => refetch()}>
                  Reintentar
                </Boton>
              }
            >
              <p>No se pudieron cargar los documentos: {error.message}</p>
            </Aviso>
          )}
          {data &&
            (documentos.length ? (
              <ul aria-label="Documentos PDF" className={`flex flex-col gap-2 ${isPlaceholderData ? 'opacity-60' : ''}`}>
                {documentos.map((doc) => (
                  <li key={doc.id}>
                    <button
                      type="button"
                      onClick={() => onSeleccionar(doc)}
                      aria-pressed={doc.id === seleccionadoId}
                      className={`flex w-full items-start gap-3 rounded-lg border-2 bg-white p-3 text-left transition-colors duration-150 ease-salida focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink motion-reduce:transition-none ${
                        doc.id === seleccionadoId
                          ? 'border-ink ring-2 ring-gold/60'
                          : 'border-sand hover:border-ink/40'
                      }`}
                    >
                      <FileText className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block break-words text-sm font-semibold text-ink">{doc.nombreOriginal}</span>
                        <span className="block text-xs text-muted">
                          {formatearTamano(doc.tamanoBytes)} · subido el {formatearFecha(doc.fechaSubida)}
                          {doc.enUso && ' · en uso'}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Todavía no hay documentos PDF en la biblioteca.</p>
            ))}
          {data && <Paginacion paginacion={data.paginacion} nombre="Paginación de documentos" onCambiar={setPagina} />}
        </div>
      </section>
    </Dialogo>
  );
}
