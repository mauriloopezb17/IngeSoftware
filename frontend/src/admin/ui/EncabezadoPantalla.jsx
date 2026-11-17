// Encabezado uniforme de las pantallas internas del panel (tipografía de interfaz Montserrat).
export default function EncabezadoPantalla({ titulo, descripcion, acciones = null, headingRef = null, className = '' }) {
  return (
    <header className={`flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between ${className}`}>
      <div className="min-w-0">
        <h1
          ref={headingRef}
          tabIndex={headingRef ? -1 : undefined}
          className="font-body text-2xl font-semibold tracking-tight text-ink outline-none sm:text-[28px]"
        >
          {titulo}
        </h1>
        {descripcion && <p className="mt-1.5 text-sm text-muted">{descripcion}</p>}
      </div>
      {acciones && <div className="flex shrink-0 flex-wrap items-center gap-2.5">{acciones}</div>}
    </header>
  );
}
