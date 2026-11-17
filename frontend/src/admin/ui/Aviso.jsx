import { AlertCircle, CheckCircle2, Eye, Info } from 'lucide-react';

const ESTILOS = {
  info: {
    contenedor: 'border-sand bg-panel text-ink',
    icono: Info,
    rol: 'status',
  },
  exito: {
    contenedor: 'border-success/30 bg-success-soft text-success',
    icono: CheckCircle2,
    rol: 'status',
  },
  error: {
    contenedor: 'border-danger/30 bg-danger-soft text-danger',
    icono: AlertCircle,
    rol: 'alert',
  },
  soloLectura: {
    contenedor: 'border-sand bg-panel text-muted',
    icono: Eye,
    rol: 'note',
  },
};

// Aviso contextual dentro de las pantallas del panel (éxito, error, información o solo lectura).
export default function Aviso({
  tipo = 'info',
  titulo,
  accion = null,
  className = '',
  children,
  ref,
  ...props
}) {
  const config = ESTILOS[tipo] ?? ESTILOS.info;
  const Icono = config.icono;

  if (!titulo && !accion) {
    return (
      <div
        ref={ref}
        role={config.rol}
        className={`flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm ${config.contenedor} ${className}`}
        {...props}
      >
        <Icono className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {children}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      role={config.rol}
      className={`flex flex-col gap-3 rounded-lg border px-4 py-3 text-sm ${config.contenedor} ${className}`}
      {...props}
    >
      <div className="flex items-start gap-2.5">
        <Icono className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          {titulo && <p className="font-semibold">{titulo}</p>}
          <div className={titulo ? 'mt-0.5' : ''}>{children}</div>
        </div>
      </div>
      {accion && <div className="flex flex-wrap gap-2 pl-6">{accion}</div>}
    </div>
  );
}
