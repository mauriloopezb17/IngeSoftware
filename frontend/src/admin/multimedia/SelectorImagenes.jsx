import { useId, useState } from 'react';
import { AlertCircle, ImageOff, Loader2, Search } from 'lucide-react';

import Dialogo from '../componentes/Dialogo.jsx';
import Paginacion from '../componentes/Paginacion.jsx';
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
        className={`flex h-full w-full flex-col overflow-hidden rounded-lg border-2 bg-white text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-goldDark disabled:cursor-not-allowed disabled:opacity-60 ${
          seleccionada ? 'border-gold ring-2 ring-gold/40' : 'border-borderSoft hover:border-gold'
        }`}
      >
        <span className="block aspect-4/3 w-full overflow-hidden bg-stone">
          <MiniaturaArchivo archivo={archivo} />
        </span>
        <span className="flex flex-col gap-1 p-2">
          <span className="break-words text-xs font-semibold leading-snug">{archivo.nombreOriginal}</span>
          {sinTexto && (
            <span className="w-fit rounded-full bg-terracotta/10 px-2 py-0.5 text-xs font-medium text-terracotta">
              Sin texto alternativo
            </span>
          )}
        </span>
      </button>
    </li>
  );
}

// Diálogo para elegir una imagen de la biblioteca. Devuelve el objeto imagen estándar
// (convenciones §7: { id, url, textoAlternativo, ancho, alto }) con `onSeleccionar`.
// Quien lo usa decide cuándo cerrarlo: se monta solo mientras está abierto.
//
//   {abierto && (
//     <SelectorImagenes
//       onSeleccionar={(imagen) => { guardarPortada(imagen); setAbierto(false); }}
//       onCerrar={() => setAbierto(false)}
//     />
//   )}
//
// `exigirTextoAlternativo`: no deja elegir las imágenes que no lo tienen (el portal lo necesita para publicarlas).
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
      <div className="flex flex-col gap-1">
        <label htmlFor={idBusqueda} className="text-xs font-semibold text-muted">
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
            className="w-full rounded-md border border-borderSoft bg-white py-2 pl-9 pr-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-goldDark"
          />
        </div>
      </div>

      <div className="mt-4" aria-busy={isPending || isPlaceholderData}>
        {isPending && (
          <p role="status" className="flex items-center gap-2 py-8 text-sm text-muted">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Cargando imágenes…
          </p>
        )}

        {isError && !data && (
          <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-redParish/30 bg-redParish/5 p-4 text-sm text-redParish">
            <p className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              No se pudieron cargar las imágenes: {error.message}
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
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-borderSoft py-10 text-center text-muted">
                <ImageOff className="size-8" aria-hidden="true" />
                <p>{buscar ? 'No hay imágenes que coincidan con la búsqueda.' : 'Todavía no hay imágenes en la biblioteca.'}</p>
              </div>
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

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-borderSoft pt-4">
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
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-md border border-borderSoft bg-white px-4 py-2 text-sm font-medium hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!seleccion}
            onClick={() => onSeleccionar(aImagenEstandar(seleccion))}
            className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-ink hover:bg-goldDark hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-goldDark disabled:cursor-not-allowed disabled:opacity-60"
          >
            Usar esta imagen
          </button>
        </div>
      </div>
    </Dialogo>
  );
}
