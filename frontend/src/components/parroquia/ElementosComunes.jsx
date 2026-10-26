export const anchoContenido = 'mx-auto max-w-[1200px] px-5 lg:px-0';

function EtiquetaSeccion({ children, light = false, center = false }) {
  return (
    <div
      className={`eyebrow ${light ? '!text-gold' : ''} ${
        center ? 'justify-center' : ''
      }`}
    >
      {children}
    </div>
  );
}

function TituloSeccion({
  overline,
  title,
  description,
  center = false,
  light = false,
}) {
  return (
    <div className={center ? 'text-center' : ''}>
      <EtiquetaSeccion light={light} center={center}>
        {overline}
      </EtiquetaSeccion>

      <h2
        className={`serif-title mt-5 text-4xl leading-[1.04] md:text-[60px] ${
          light ? 'text-white' : 'text-ink'
        }`}
      >
        {title}
      </h2>

      {description && (
        <p
          className={`mt-5 leading-[1.9] ${
            light ? 'text-white/70' : 'text-muted'
          }`}
        >
          {description}
        </p>
      )}
    </div>
  );
}

function MarcadorVisual({
  label = 'FOTO · REEMPLAZAR',
  className = '',
  children,
}) {
  return (
    <div className={`placeholder relative overflow-hidden ${className}`}>
      <span className="absolute left-5 top-5 text-[10px] font-bold tracking-[.18em] text-white/55">
        {label}
      </span>
      {children}
    </div>
  );
}

export { EtiquetaSeccion, TituloSeccion, MarcadorVisual };