import { useId, useState } from 'react';
import { ImageOff, Search } from 'lucide-react';

import Dialogo from '../componentes/Dialogo.jsx';
import Paginacion from '../componentes/Paginacion.jsx';
import { contarArchivos } from '../multimedia/formato.js';
import MiniaturaArchivo from '../multimedia/MiniaturaArchivo.jsx';
import { useBiblioteca } from '../multimedia/useBiblioteca.js';
import { useBusquedaConEspera } from '../multimedia/useBusquedaConEspera.js';
import { Aviso, Boton, EsqueletoTarjetas, EstadoVacio, Insignia } from '../ui/index.js';

const POR_PAGINA_SELECTOR = 8;

const FILTROS_CLASE = [
  { clave: 'IMAGEN', etiqueta: 'Imágenes' },
  { clave: 'VIDEO', etiqueta: 'Videos' },
];

// Diálogo para elegir una imagen o un video de la biblioteca para la galería de una proclama.
export default function SelectorGaleria({ yaElegidos = [], onSeleccionar, onCerrar }) {
  const idBusqueda = useId();
  const [clase, setClase] = useState('IMAGEN');
  const [buscar, setBuscar] = useState('');
  const [pagina, setPagina] = useState(1);
  const [seleccion, setSeleccion] = useState(null);

  const [texto, setTexto] = useBusquedaConEspera(buscar, (nuevo) => {
    setBuscar(nuevo);
    setPagina(1);
  });

  const { data, isPending, isError, error, isPlaceholderData, refetch } = useBiblioteca({
    buscar,
    clase,
    enUso: '',
    orden: '-fechaSubida',
    pagina,
    porPagina: POR_PAGINA_SELECTOR,
  });

  const elegidosSet = new Set(yaElegidos);

  return (
    <Dialogo titulo="Agregar foto o video a la galería" onCerrar={onCerrar} ancho="max-w-4xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div role="group" aria-label="Tipo de archivo" className="flex rounded-md border border-sand bg-panel p-0.5">
          {FILTROS_CLASE.map(({ clave, etiqueta }) => (
            <button
              key={clave}
              type="button"
              aria-pressed={clase === clave}
              onClick={() => {
                setClase(clave);
                setPagina(1);
                setSeleccion(null);
              }}
              className={`rounded px-3 py-2 text-sm font-medium transition-colors duration-150 ease-salida focus-visible:outline-2 focus-visible:outline-ink motion-reduce:transition-none ${
                clase === clave ? 'bg-gold font-semibold text-ink' : 'text-ink hover:bg-white'
              }`}
            >
              {etiqueta}
            </button>
          ))}
        </div>

        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor={idBusqueda} className="text-sm font-semibold text-ink">
            Buscar archivo
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <input
              id={idBusqueda}
              type="search"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Nombre o texto alternativo"
              className="min-h-11 w-full rounded-md border border-sand bg-white py-2 pl-9 pr-3 text-sm text-ink placeholder:text-muted/75 transition-colors duration-150 ease-salida focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink"
            />
          </div>
        </div>
      </div>

      <div className="mt-4" aria-busy={isPending || isPlaceholderData}>
        {isPending && (
          <EsqueletoTarjetas cantidad={4} columnas="grid-cols-2 sm:grid-cols-4" etiqueta="Cargando biblioteca…" />
        )}

        {isError && !data && (
          <Aviso
            tipo="error"
            accion={
              <Boton variante="secundario" tamano="sm" onClick={() => refetch()}>
                Reintentar
              </Boton>
            }
          >
            <p>No se pudieron cargar los archivos: {error.message}</p>
          </Aviso>
        )}

        {data && (
          <>
            <p className="mb-3 text-sm tabular-nums text-muted" aria-live="polite">
              {contarArchivos(data.paginacion.total)}
              {buscar && ' con esa búsqueda'}
            </p>

            {data.datos.length ? (
              <ul
                aria-label="Archivos disponibles"
                className={`grid grid-cols-2 gap-3 sm:grid-cols-4 ${isPlaceholderData ? 'opacity-60' : ''}`}
              >
                {data.datos.map((archivo) => {
                  const yaEsta = elegidosSet.has(archivo.id);
                  const seleccionada = seleccion?.id === archivo.id;
                  return (
                    <li key={archivo.id}>
                      <button
                        type="button"
                        onClick={() => setSeleccion(archivo)}
                        aria-pressed={seleccionada}
                        disabled={yaEsta}
                        className={`flex h-full w-full flex-col overflow-hidden rounded-lg border-2 bg-white text-left transition-colors duration-150 ease-salida focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none ${
                          seleccionada ? 'border-ink ring-2 ring-gold/60' : 'border-sand hover:border-ink/40'
                        }`}
                      >
                        <span className="block aspect-4/3 w-full overflow-hidden bg-panel">
                          <MiniaturaArchivo archivo={archivo} />
                        </span>
                        <span className="flex flex-col gap-1 p-2.5">
                          <span className="break-words text-xs font-semibold leading-snug text-ink">
                            {archivo.nombreOriginal}
                          </span>
                          {yaEsta && (
                            <span className="w-fit">
                              <Insignia variante="archivado">Ya en la galería</Insignia>
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EstadoVacio
                icono={ImageOff}
                titulo={
                  buscar
                    ? 'No hay archivos que coincidan con la búsqueda.'
                    : 'Todavía no hay archivos de este tipo en la biblioteca.'
                }
              />
            )}

            <Paginacion paginacion={data.paginacion} onCambiar={setPagina} nombre="Paginación de galería" />
          </>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-sand pt-4">
        <p className="min-w-0 text-sm text-muted" aria-live="polite">
          {seleccion ? (
            <>
              Seleccionado: <span className="font-semibold text-ink">{seleccion.nombreOriginal}</span>
            </>
          ) : (
            'Ningún archivo seleccionado.'
          )}
        </p>
        <div className="flex gap-2">
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton variante="primario" disabled={!seleccion} onClick={() => onSeleccionar(seleccion)}>
            Agregar a la galería
          </Boton>
        </div>
      </div>
    </Dialogo>
  );
}
