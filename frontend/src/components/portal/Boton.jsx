import EnlacePortal from '../parroquia/EnlacePortal.jsx';

const BASE =
  'inline-flex min-h-11 items-center justify-center gap-2.5 rounded-sm px-6 py-3 font-body text-button font-semibold touch-manipulation transition-[background-color,border-color,color,transform] duration-200 ease-salida active:scale-[0.97] active:duration-120 disabled:pointer-events-none disabled:opacity-50';

const VARIANTES = {
  primario:
    'bg-gold text-ink hover:bg-gold-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
  primarioOscuro:
    'bg-gold text-ink hover:bg-gold-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
  secundario:
    'border border-ink/25 bg-transparent text-ink hover:border-ink hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
  secundarioOscuro:
    'border border-white/40 bg-transparent text-white hover:border-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
};

export function Boton({
  type = 'button',
  variante = 'primario',
  className = '',
  children,
  ...resto
}) {
  const clasesVariante = VARIANTES[variante] ?? VARIANTES.primario;
  return (
    <button
      type={type}
      className={`${BASE} cursor-pointer ${clasesVariante} ${className}`.trim()}
      {...resto}
    >
      {children}
    </button>
  );
}

export function BotonEnlace({
  to,
  variante = 'primario',
  className = '',
  children,
  ...resto
}) {
  const clasesVariante = VARIANTES[variante] ?? VARIANTES.primario;
  return (
    <EnlacePortal
      to={to}
      className={`${BASE} no-underline ${clasesVariante} ${className}`.trim()}
      {...resto}
    >
      {children}
    </EnlacePortal>
  );
}
