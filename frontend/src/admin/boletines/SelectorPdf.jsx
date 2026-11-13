import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Loader2, UploadCloud } from 'lucide-react';

import Dialogo from '../componentes/Dialogo.jsx';
import { Cargando, ErrorConsulta } from '../componentes/EstadoConsulta.jsx';
import Paginacion from '../componentes/Paginacion.jsx';
import { CLAVE_MULTIMEDIA, subirArchivo } from '../multimedia/api.js';
import { formatearFecha, formatearTamano } from '../multimedia/formato.js';
import { useBiblioteca } from '../multimedia/useBiblioteca.js';
import { tipoDelArchivo, validarArchivoCliente } from '../multimedia/validacion.js';
import { usePermisos } from '../permisos/usePermisos.js';

const POR_PAGINA_SELECTOR = 6;

// Diálogo para elegir el PDF de un boletín: un documento de la biblioteca multimedia o uno que se sube
// ahora mismo (se guarda en la biblioteca y queda elegido). Devuelve el archivo con `onSeleccionar`.
export default function SelectorPdf({ seleccionadoId, onSeleccionar, onCerrar }) {
  const queryClient = useQueryClient();
  const { puede } = usePermisos();
  const entrada = useRef(null);
  const [pagina, setPagina] = useState(1);
  const [rechazo, setRechazo] = useState('');

  const { data, isPending, isError, error, isPlaceholderData, refetch } = useBiblioteca({
    clase: 'DOCUMENTO',
    orden: '-fechaSubida',
    pagina,
    porPagina: POR_PAGINA_SELECTOR,
  });

  const subir = useMutation({
    mutationFn: (archivo) => subirArchivo({ archivo }),
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
  const errorSubida = rechazo || (subir.error ? subir.error.message : '');

  return (
    <Dialogo titulo="PDF del boletín" onCerrar={subir.isPending ? () => {} : onCerrar} ancho="max-w-2xl">
      {puede('multimedia.subir') && (
        <section aria-label="Subir un PDF nuevo" className="rounded-lg border border-dashed border-borderSoft p-4">
          <p className="text-sm text-charcoal">
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
          <button
            type="button"
            onClick={() => entrada.current?.click()}
            disabled={subir.isPending}
            className="mt-3 flex items-center gap-2 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-ink hover:bg-goldDark hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-goldDark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {subir.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <UploadCloud className="size-4" aria-hidden="true" />
            )}
            {subir.isPending ? 'Subiendo…' : 'Subir un PDF'}
          </button>
          {errorSubida && (
            <p role="alert" className="mt-2 text-sm text-redParish">
              {errorSubida}
            </p>
          )}
        </section>
      )}

      <section aria-label="PDF de la biblioteca" className="mt-5">
        <h3 className="text-sm font-semibold text-ink">O elige uno de la biblioteca</h3>
        <div className="mt-3" aria-busy={isPending || isPlaceholderData}>
          {isPending && <Cargando texto="Cargando documentos…" />}
          {isError && !data && (
            <ErrorConsulta texto="No se pudieron cargar los documentos" error={error} onReintentar={refetch} />
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
                      className={`flex w-full items-start gap-3 rounded-lg border-2 bg-white p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-goldDark ${
                        doc.id === seleccionadoId ? 'border-gold ring-2 ring-gold/40' : 'border-borderSoft hover:border-gold'
                      }`}
                    >
                      <FileText className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block break-words text-sm font-semibold">{doc.nombreOriginal}</span>
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
