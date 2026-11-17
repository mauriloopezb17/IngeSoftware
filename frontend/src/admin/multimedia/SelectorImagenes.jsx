import { useId, useState } from 'react';
import { ImageOff, Search } from 'lucide-react';

import Dialogo from '../componentes/Dialogo.jsx';
import Paginacion from '../componentes/Paginacion.jsx';
import { Aviso, Boton, EsqueletoTarjetas, EstadoVacio, Insignia } from '../ui/index.js';
import { contarImagenes } from './formato.js';
import { aImagenEstandar } from './imagen.js';
import MiniaturaArchivo from './MiniaturaArchivo.jsx';
import { useBiblioteca } from './useBiblioteca.js';
import { useBusquedaConEspera } from './useBusquedaConEspera.js';

const POR_PAGINA_SELECTOR = 8;

function OpcionImagen({ archivo, seleccionada, deshabilitada, onElegir }) {
  const sinTexto = !archivo.textoAlternativo;

  return (
    <li>
      <button
        type="button"
        onClick={() => onElegir(archivo)}
        aria-pressed={seleccionada}
        disabled={deshabilitada}
        className={`flex h-full w-full flex-col overflow-hidden rounded-lg border-2 bg-white text-left transition-colors duration-150 ease-salida focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none ${
          seleccionada ? 'border-ink ring-2 ring-gold/60' : 'border-sand hover:border-ink/40'
        }`}
      >
        <span className="block aspect-4/3 w-full overflow-hidden bg-panel">
          <MiniaturaArchivo archivo={archivo} />
        </span>
        <span className="flex flex-col gap-1 p-2.5">
          <span className="break-words text-xs font-semibold leading-snug text-ink">{archivo.nombreOriginal}</span>
          {sinTexto && (
            <span className="w-fit">
              <Insignia variante="rechazado">Sin texto alternativo</Insignia>
            </span>
          )}
        </span>
      </button>
    </li>
  );
}

// Diálogo para elegir una imagen de la biblioteca. Devuelve el objeto imagen estándar
// (convenciones §7: { id, url, textoAlternativo, ancho, alto }) con `onSeleccionar`.
export default function SelectorImagenes({
  onSeleccionar,
  onCerrar,
  titulo = 'Seleccionar imagen',
  exigirTextoAlternativo = false,
}) {
  const idBusqueda = useId();
  const [buscar, setBuscar] = useState('');
  const [pagina, setPagina] = useState(1);
  const [seleccion, setSeleccion] = useState(null);

  const [texto, setTexto] = useBusquedaConEspera(buscar, (nuevo) => {
    setBuscar(nuevo);
    setPagina(1);
  });

  const { data, isPending, isError, error, isPlaceholderData, refetch } = useBiblioteca({
    buscar,
    clase: 'IMAGEN',
    enUso: '',
    orden: '-fechaSubida',
    pagina,
    porPagina: POR_PAGINA_SELECTOR,
  });

  return (
    <Dialogo titulo={titulo} onCerrar={onCerrar} ancho="max-w-4xl">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={idBusqueda} className="text-sm font-semibold text-ink">
          Buscar imagen
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
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

      <div className="mt-4" aria-busy={isPending || isPlaceholderData}>
        {isPending && (
          <EsqueletoTarjetas cantidad={4} columnas="grid-cols-2 sm:grid-cols-4" etiqueta="Cargando imágenes…" />
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
            <p>No se pudieron cargar las imágenes: {error.message}</p>
          </Aviso>
        )}

        {data && (
          <>
            <p className="mb-3 text-sm tabular-nums text-muted" aria-live="polite">
              {contarImagenes(data.paginacion.total)}
              {buscar && ' con esa búsqueda'}
            </p>

            {data.datos.length ? (
              <ul
                aria-label="Imágenes"
                className={`grid grid-cols-2 gap-3 sm:grid-cols-4 ${isPlaceholderData ? 'opacity-60' : ''}`}
              >
                {data.datos.map((archivo) => (
                  <OpcionImagen
                    key={archivo.id}
                    archivo={archivo}
                    seleccionada={seleccion?.id === archivo.id}
                    deshabilitada={exigirTextoAlternativo && !archivo.textoAlternativo}
                    onElegir={setSeleccion}
                  />
                ))}
              </ul>
            ) : (
              <EstadoVacio
                icono={ImageOff}
                titulo={
                  buscar
                    ? 'No hay imágenes que coincidan con la búsqueda.'
                    : 'Todavía no hay imágenes en la biblioteca.'
                }
              />
            )}

            <Paginacion
              paginacion={data.paginacion}
              onCambiar={setPagina}
              nombre="Paginación del selector de imágenes"
            />
          </>
        )}
      </div>

      {exigirTextoAlternativo && (
        <p className="mt-3 text-xs text-muted">
          Solo se pueden elegir imágenes con texto alternativo. Puedes agregarlo desde Multimedia.
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-sand pt-4">
        <p className="min-w-0 text-sm text-muted" aria-live="polite">
          {seleccion ? (
            <>
              Seleccionada: <span className="font-semibold text-ink">{seleccion.nombreOriginal}</span>
            </>
          ) : (
            'Ninguna imagen seleccionada.'
          )}
        </p>
        <div className="flex gap-2">
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton
            variante="primario"
            disabled={!seleccion}
            onClick={() => onSeleccionar(aImagenEstandar(seleccion))}
          >
            Usar esta imagen
          </Boton>
        </div>
      </div>
    </Dialogo>
  );
}
