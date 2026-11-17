// Contenedor horizontal estándar del sitio público (max-w-7xl, padding lateral responsivo).
function Contenedor({ as = 'div', className = '', children, ...resto }) {
  const Etiqueta = as;
  return (
    <Etiqueta className={`mx-auto w-full max-w-7xl px-5 md:px-8 ${className}`.trim()} {...resto}>
      {children}
    </Etiqueta>
  );
}

export default Contenedor;
