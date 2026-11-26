import { useId, useRef } from 'react';
import { Search, X } from 'lucide-react';

import Paginacion from '../componentes/Paginacion.jsx';
import Aviso from './Aviso.jsx';
import Boton from './Boton.jsx';
import { EsqueletoTabla } from './Esqueleto.jsx';
import EstadoVacio from './EstadoVacio.jsx';
import { CeldaTabla, FilaTabla, Tabla } from './Tabla.jsx';

/**
 * Tabla reutilizable del panel con barra de filtros, estados de carga/vacío/error,
 * resumen «Mostrando X–Y de Z» y paginación que devuelve el foco al inicio de la tabla.
 */
export default function TablaListado({
  caption,
  columnas,
  datos = [],
  claveFila = (fila) => fila.id,
  paginacion,
  onCambiarPagina,
  cargando = false,
  tenue = false,
  error = null,
  onReintentar,
  busqueda,
  onCambiarBusqueda,
  etiquetaBusqueda = 'Buscar',
  placeholderBusqueda = 'Buscar…',
  categoria,
  filtrosExtra,
  hayFiltrosActivos = false,
  onLimpiarFiltros,
  vacio,
  vacioConFiltros,
  claseTabla,
  nombrePaginacion = 'Paginación',
}) {
  const idBusqueda = useId();
  const idCategoria = useId();
  const tablaContenedorRef = useRef(null);

  const mostrarBarra =
    onCambiarBusqueda !== undefined || Boolean(categoria) || Boolean(filtrosExtra);

  const manejarCambioPagina = (nuevaPagina) => {
    onCambiarPagina?.(nuevaPagina);
    requestAnimationFrame(() => tablaContenedorRef.current?.focus());
  };

  const encabezados = columnas.map((col) => ({
    texto: col.encabezado,
    clase: col.claseEncabezado ?? '',
  }));

  const pagina = paginacion?.pagina ?? 1;
  const porPagina = paginacion?.porPagina ?? (datos.length || 1);
  const total = paginacion?.total ?? datos.length;
  const inicio = total > 0 ? (pagina - 1) * porPagina + 1 : 0;
  const fin = Math.min(pagina * porPagina, total);

  return (
    <div className="space-y-4">
      {mostrarBarra && (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-sand bg-white p-4">
          {onCambiarBusqueda !== undefined && (
            <div className="min-w-[220px] flex-1">
              <label htmlFor={idBusqueda} className="mb-1 block text-xs font-semibold text-muted">
                {etiquetaBusqueda}
              </label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
                  aria-hidden="true"
                />
                <input
                  id={idBusqueda}
                  type="search"
                  value={busqueda ?? ''}
                  onChange={(e) => onCambiarBusqueda(e.target.value)}
                  placeholder={placeholderBusqueda}
                  className="min-h-10 w-full rounded-md border border-sand bg-white py-2 pl-9 pr-9 text-sm text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                />
                {busqueda && (
                  <button
                    type="button"
                    onClick={() => onCambiarBusqueda('')}
                    aria-label="Limpiar búsqueda"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          )}

          {categoria && (
            <div className="min-w-[180px]">
              <label htmlFor={idCategoria} className="mb-1 block text-xs font-semibold text-muted">
                {categoria.etiqueta ?? 'Categoría'}
              </label>
              <select
                id={idCategoria}
                value={categoria.valor ?? ''}
                onChange={(e) => categoria.onCambiar(e.target.value)}
                className="min-h-10 w-full rounded-md border border-sand bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                <option value="">{categoria.todasEtiqueta ?? 'Todas'}</option>
                {categoria.opciones.map((op) => (
                  <option key={op.valor} value={op.valor}>
                    {op.etiqueta}
                  </option>
                ))}
              </select>
            </div>
          )}

          {filtrosExtra}

          {hayFiltrosActivos && onLimpiarFiltros && (
            <Boton variante="secundario" tamano="sm" onClick={onLimpiarFiltros}>
              Quitar filtros
            </Boton>
          )}
        </div>
      )}

      {cargando ? (
        <EsqueletoTabla filas={5} columnas={columnas.length} />
      ) : error ? (
        <Aviso tipo="error" titulo="No se pudo cargar el listado">
          <p>{typeof error === 'string' ? error : error.message || 'Ocurrió un error al consultar los datos.'}</p>
          {onReintentar && (
            <div className="mt-3">
              <Boton variante="secundario" tamano="sm" onClick={onReintentar}>
                Reintentar
              </Boton>
            </div>
          )}
        </Aviso>
      ) : datos.length === 0 ? (
        hayFiltrosActivos && vacioConFiltros ? (
          <EstadoVacio
            icono={vacioConFiltros.icono ?? vacio?.icono}
            titulo={vacioConFiltros.titulo ?? 'Sin resultados para estos filtros'}
            descripcion={
              vacioConFiltros.descripcion ?? 'Prueba quitando o cambiando alguno de los filtros aplicados.'
            }
            accion={
              onLimpiarFiltros ? (
                <Boton variante="secundario" tamano="sm" onClick={onLimpiarFiltros}>
                  Quitar filtros
                </Boton>
              ) : undefined
            }
          />
        ) : (
          <EstadoVacio
            icono={vacio?.icono}
            titulo={vacio?.titulo ?? 'No hay registros'}
            descripcion={vacio?.descripcion}
            accion={vacio?.accion}
          />
        )
      ) : (
        <>
          <div ref={tablaContenedorRef} tabIndex={-1} className="outline-none">
            {total > 0 && (
              <p className="mb-2 text-xs tabular-nums text-muted" aria-live="polite">
                Mostrando {inicio}–{fin} de {total}
              </p>
            )}
            <Tabla caption={caption} encabezados={encabezados} claseTabla={claseTabla} tenue={tenue}>
              {datos.map((fila) => (
                <FilaTabla key={claveFila(fila)}>
                  {columnas.map((col) => (
                    <CeldaTabla key={col.id} className={col.claseCelda ?? ''}>
                      {col.render(fila)}
                    </CeldaTabla>
                  ))}
                </FilaTabla>
              ))}
            </Tabla>
          </div>

          {paginacion && onCambiarPagina && (
            <Paginacion paginacion={paginacion} onCambiar={manejarCambioPagina} nombre={nombrePaginacion} />
          )}
        </>
      )}
    </div>
  );
}
