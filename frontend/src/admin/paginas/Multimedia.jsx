import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { AlertCircle, ImageOff, Loader2 } from 'lucide-react';

import Paginacion from '../componentes/Paginacion.jsx';
import { usePermisos } from '../permisos/usePermisos.js';
import { ORDENES, POR_PAGINA } from '../multimedia/api.js';
import FiltrosMultimedia from '../multimedia/FiltrosMultimedia.jsx';
import { contarArchivos } from '../multimedia/formato.js';
import SubidaArchivos from '../multimedia/SubidaArchivos.jsx';
import TarjetaArchivo from '../multimedia/TarjetaArchivo.jsx';
import { CLASES } from '../multimedia/tipos.js';
import { useBiblioteca } from '../multimedia/useBiblioteca.js';
import VistaPreviaArchivo from '../multimedia/VistaPreviaArchivo.jsx';

const ORDEN_INICIAL = '-fechaSubida';

// Los filtros viven en la URL (se conservan al recargar). Un valor desconocido se descarta.
function leerFiltros(parametros) {
  const clase = parametros.get('clase');
  const enUso = parametros.get('enUso');
  const orden = parametros.get('orden');
  const pagina = Number.parseInt(parametros.get('pagina'), 10);

  return {
    buscar: parametros.get('buscar')?.trim() ?? '',
    clase: clase in CLASES ? clase : '',
    enUso: enUso === 'true' || enUso === 'false' ? enUso : '',
    orden: orden in ORDENES ? orden : ORDEN_INICIAL,
    pagina: pagina >= 1 ? pagina : 1,
  };
}

export default function Multimedia() {
  const [parametros, setParametros] = useSearchParams();
  const filtros = leerFiltros(parametros);
  const consulta = useBiblioteca(filtros);
  const [abierto, setAbierto] = useState(null);
  const [aviso, setAviso] = useState('');
  const titulo = useRef(null);
  const { puede } = usePermisos();

  const hayFiltros = Boolean(filtros.buscar || filtros.clase || filtros.enUso || filtros.orden !== ORDEN_INICIAL);

  // Cambiar un filtro vuelve a la primera página.
  function cambiar(cambios) {
    const siguiente = { ...filtros, pagina: 1, ...cambios };
    const nuevos = new URLSearchParams();
    if (siguiente.buscar) nuevos.set('buscar', siguiente.buscar);
    if (siguiente.clase) nuevos.set('clase', siguiente.clase);
    if (siguiente.enUso) nuevos.set('enUso', siguiente.enUso);
    if (siguiente.orden !== ORDEN_INICIAL) nuevos.set('orden', siguiente.orden);
    if (siguiente.pagina > 1) nuevos.set('pagina', String(siguiente.pagina));
    setParametros(nuevos, { replace: true });
  }

  const { data, isPending, isError, error, isPlaceholderData, refetch } = consulta;
  const archivos = data?.datos ?? [];

  return (
    <section className="mx-auto max-w-6xl">
      <header>
        <h1 ref={titulo} tabIndex={-1} className="font-display text-4xl font-semibold text-ink outline-none">
          Multimedia
        </h1>
        <p className="mt-2 text-muted">Imágenes, videos y documentos de la sede.</p>
      </header>

      <p role="status" className={aviso ? 'mt-4 rounded-md bg-goldPale px-3 py-2 text-sm text-goldDark' : 'sr-only'}>
        {aviso}
      </p>

      {puede('multimedia.subir') && <SubidaArchivos />}

      <div className="mt-6 rounded-lg border border-borderSoft bg-white p-4">
        <FiltrosMultimedia
          valores={filtros}
          hayFiltros={hayFiltros}
          onCambiar={cambiar}
          onLimpiar={() => setParametros(new URLSearchParams(), { replace: true })}
        />
      </div>

      <div className="mt-6" aria-busy={isPending || isPlaceholderData}>
        {isPending && (
          <p role="status" className="flex items-center gap-2 py-10 text-sm text-muted">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Cargando archivos…
          </p>
        )}

        {isError && !data && (
          <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-redParish/30 bg-redParish/5 p-4 text-sm text-redParish">
            <p className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              No se pudo cargar la biblioteca: {error.message}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-md border border-redParish/40 bg-white px-3 py-1.5 font-medium hover:bg-redParish/5 focus-visible:outline-2 focus-visible:outline-redParish"
            >
              Reintentar
            </button>
          </div>
        )}

        {data && (
          <>
            <p className="mb-3 text-sm text-muted" aria-live="polite">
              {contarArchivos(data.paginacion.total)}
              {hayFiltros && ' con estos filtros'}
            </p>

            {archivos.length ? (
              <ul
                className={`grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 ${isPlaceholderData ? 'opacity-60' : ''}`}
                aria-label="Archivos"
              >
                {archivos.map((archivo) => (
                  <TarjetaArchivo
                    key={archivo.id}
                    archivo={archivo}
                    onAbrir={(a) => {
                      setAviso('');
                      setAbierto(a);
                    }}
                  />
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-borderSoft bg-white py-12 text-center text-muted">
                <ImageOff className="size-10" aria-hidden="true" />
                <p>{hayFiltros ? 'No hay archivos que coincidan con los filtros.' : 'Todavía no hay archivos en la biblioteca.'}</p>
                {hayFiltros && (
                  <button
                    type="button"
                    onClick={() => setParametros(new URLSearchParams(), { replace: true })}
                    className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-ink hover:bg-goldDark hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-goldDark"
                  >
                    Quitar los filtros
                  </button>
                )}
              </div>
            )}

            <Paginacion
              paginacion={{ ...data.paginacion, porPagina: POR_PAGINA }}
              onCambiar={(pagina) => cambiar({ pagina })}
              nombre="Paginación de la biblioteca"
            />
          </>
        )}
      </div>

      {abierto && (
        <VistaPreviaArchivo
          archivo={abierto}
          onCerrar={() => setAbierto(null)}
          onCambio={setAbierto}
          onEliminado={(eliminado) => {
            setAbierto(null);
            setAviso(`Se eliminó «${eliminado.nombreOriginal}».`);
            // La tarjeta desaparece: el foco pasa al título para no perderse.
            setTimeout(() => titulo.current?.focus(), 0);
          }}
        />
      )}
    </section>
  );
}
