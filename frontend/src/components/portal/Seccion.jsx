import Contenedor from './Contenedor.jsx';

const FONDOS = {
  blanco: 'bg-white text-ink',
  crema: 'bg-cream text-ink',
  tinta: 'bg-ink text-white',
};

// Sección del portal con ritmo vertical uniforme (py-16 md:py-28) y alternancia de fondo.
function Seccion({
  id,
  fondo = 'blanco',
  sinContenedor = false,
  className = '',
  contenedorClassName = '',
  children,
  ...resto
}) {
  const clasesFondo = FONDOS[fondo] ?? FONDOS.blanco;

  return (
    <section
      id={id}
      className={`scroll-mt-24 py-16 md:py-28 ${clasesFondo} ${className}`.trim()}
      {...resto}
    >
      {sinContenedor ? children : <Contenedor className={contenedorClassName}>{children}</Contenedor>}
    </section>
  );
}

export default Seccion;
