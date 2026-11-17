// Rótulo en mayúsculas sobre títulos con filete dorado. Nunca texto dorado sobre fondo claro.
function Eyebrow({
  children,
  oscuro = false,
  centrado = false,
  suave = false,
  className = '',
}) {
  if (!children) return null;

  const colorTexto = oscuro ? 'text-gold' : suave ? 'text-muted' : 'text-ink';

  return (
    <p
      className={`flex items-center gap-3 font-body text-eyebrow font-semibold uppercase tracking-[0.2em] ${colorTexto} ${
        centrado ? 'justify-center' : ''
      } ${className}`.trim()}
    >
      <span aria-hidden="true" className="inline-block h-[2px] w-6 shrink-0 bg-gold" />
      <span>{children}</span>
    </p>
  );
}

export default Eyebrow;
