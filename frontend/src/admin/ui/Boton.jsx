import { Loader2 } from 'lucide-react';

const VARIANTES = {
  primario: 'bg-gold text-ink hover:bg-gold-dark border border-transparent',
  secundario: 'bg-white text-ink border border-sand hover:bg-panel',
  fantasma: 'bg-transparent text-ink border border-transparent hover:bg-sand/60',
  peligro: 'bg-danger text-white border border-transparent hover:bg-danger/90',
};

const TAMANOS = {
  md: 'min-h-11 px-4 py-2 text-sm',
  sm: 'min-h-11 px-3 py-2 text-xs lg:min-h-9 lg:py-1.5',
};

// Botón reutilizable del panel de gestión con variantes, tamaños, estado de carga y soporte polimórfico.
export default function Boton({
  variante = 'secundario',
  tamano = 'md',
  cargando = false,
  disabled = false,
  icono: Icono = null,
  como: Componente = 'button',
  className = '',
  children,
  ref,
  ...props
}) {
  const esBoton = Componente === 'button';
  const deshabilitado = Boolean(disabled || cargando);

  const clases = [
    'inline-flex items-center justify-center gap-2 rounded-md font-semibold',
    'transition-[background-color,border-color,color,transform] duration-150 ease-salida',
    'active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
    'disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100',
    VARIANTES[variante] ?? VARIANTES.secundario,
    TAMANOS[tamano] ?? TAMANOS.md,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const propsFinales = esBoton
    ? { type: props.type ?? 'button', disabled: deshabilitado, ...props }
    : { ...props };

  return (
    <Componente
      ref={ref}
      aria-busy={cargando ? 'true' : undefined}
      aria-disabled={!esBoton && deshabilitado ? 'true' : undefined}
      className={clases}
      {...propsFinales}
    >
      {cargando ? (
        <Loader2 className="size-4 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />
      ) : Icono ? (
        <Icono className="size-4 shrink-0" aria-hidden="true" />
      ) : null}
      {children}
    </Componente>
  );
}
