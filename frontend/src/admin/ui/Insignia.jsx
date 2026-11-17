const VARIANTES = {
  publicado: 'border-success/25 bg-success-soft text-success',
  exito: 'border-success/25 bg-success-soft text-success',
  borrador: 'border-sand bg-sand/70 text-ink',
  neutro: 'border-sand bg-sand/70 text-ink',
  programado: 'border-gold/45 bg-gold-soft text-ink',
  aviso: 'border-gold/45 bg-gold-soft text-ink',
  revision: 'border-ink bg-ink text-white',
  rechazado: 'border-danger/25 bg-danger-soft text-danger',
  alerta: 'border-danger/25 bg-danger-soft text-danger',
  archivado: 'border-sand bg-panel text-muted',
  apagado: 'border-sand bg-panel text-muted',
};

// Insignia de estado compacta con bordes suavemente rectos y contraste accesible.
export default function Insignia({ variante = 'borrador', className = '', children }) {
  const estilo = VARIANTES[variante] ?? VARIANTES.borrador;
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-sm border px-2.5 py-0.5 text-xs font-semibold leading-tight ${estilo} ${className}`}
    >
      {children}
    </span>
  );
}
