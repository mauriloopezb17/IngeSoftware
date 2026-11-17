function Bloque({ className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded bg-sand/70 motion-reduce:animate-none ${className}`}
    />
  );
}

// Marcador de carga para listados tabulares.
export function EsqueletoTabla({ filas = 5, columnas = 4, etiqueta = 'Cargando registros…' }) {
  return (
    <div role="status" className="overflow-hidden rounded-lg border border-sand bg-white">
      <span className="sr-only">{etiqueta}</span>
      <div className="grid gap-4 border-b border-sand bg-panel px-4 py-3" style={{ gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))` }}>
        {Array.from({ length: columnas }).map((_, i) => (
          <Bloque key={i} className="h-3.5 w-2/3" />
        ))}
      </div>
      <div className="divide-y divide-sand">
        {Array.from({ length: filas }).map((_, fila) => (
          <div
            key={fila}
            className="grid items-center gap-4 px-4 py-3.5"
            style={{ gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columnas }).map((__, col) => (
              <Bloque key={col} className={col === 0 ? 'h-4 w-4/5' : 'h-4 w-3/5'} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Marcador de carga para cuadrículas de tarjetas.
export function EsqueletoTarjetas({ cantidad = 3, columnas = 'sm:grid-cols-2 lg:grid-cols-3', etiqueta = 'Cargando contenido…' }) {
  return (
    <div role="status" className={`grid gap-4 ${columnas}`}>
      <span className="sr-only">{etiqueta}</span>
      {Array.from({ length: cantidad }).map((_, indice) => (
        <div key={indice} className="flex flex-col gap-3 rounded-lg border border-sand bg-white p-5">
          <Bloque className="h-3.5 w-1/3" />
          <Bloque className="h-7 w-1/2" />
          <Bloque className="h-3.5 w-full" />
          <Bloque className="h-3.5 w-4/5" />
        </div>
      ))}
    </div>
  );
}

// Marcador de carga para formularios de edición.
export function EsqueletoFormulario({ campos = 4, etiqueta = 'Cargando formulario…' }) {
  return (
    <div role="status" className="mt-6 flex max-w-3xl flex-col gap-5 rounded-lg border border-sand bg-white p-6">
      <span className="sr-only">{etiqueta}</span>
      {Array.from({ length: campos }).map((_, indice) => (
        <div key={indice} className="flex flex-col gap-2">
          <Bloque className="h-3.5 w-32" />
          <Bloque className={indice === campos - 1 ? 'h-24 w-full' : 'h-11 w-full'} />
        </div>
      ))}
    </div>
  );
}
