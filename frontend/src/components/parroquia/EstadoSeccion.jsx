import { AlertCircle, Inbox, RotateCw } from 'lucide-react';

export function CargandoSeccion({
  alturaMinima = 180,
  etiqueta = 'Cargando contenido',
  oscuro = false,
  lineas = 3,
}) {
  return (
    <div
      className={`flex w-full flex-col justify-center rounded-md border px-6 py-8 ${
        oscuro ? 'border-white/10 bg-ink-soft' : 'border-sand bg-cream/60'
      }`}
      style={{ minHeight: alturaMinima }}
      role="status"
      aria-label={etiqueta}
    >
      <div className="flex w-full flex-col gap-3" aria-hidden="true">
        {Array.from({ length: lineas }, (_, indice) => (
          <span
            key={indice}
            className={`block h-3.5 animate-pulse rounded-sm motion-reduce:animate-none ${
              oscuro ? 'bg-white/15' : 'bg-sand'
            }`}
            style={{ width: indice === lineas - 1 ? '62%' : '100%' }}
          />
        ))}
      </div>
      <span className="sr-only">{etiqueta}</span>
    </div>
  );
}

export function ErrorSeccion({
  mensaje = 'No pudimos cargar esta información.',
  onReintentar,
  oscuro = false,
  compacta = false,
}) {
  return (
    <div
      className={`flex flex-col items-start gap-3 rounded-md border ${
        compacta ? 'p-4' : 'p-6'
      } ${
        oscuro
          ? 'border-white/15 bg-ink-soft text-white'
          : 'border-danger/30 bg-danger-soft text-ink'
      }`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <AlertCircle
          className={`mt-0.5 shrink-0 ${oscuro ? 'text-gold' : 'text-danger'}`}
          size={20}
          aria-hidden="true"
        />
        <p className="font-body text-body">{mensaje}</p>
      </div>

      {onReintentar && (
        <button
          type="button"
          onClick={onReintentar}
          className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-sm border px-4 py-2 font-body text-meta font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 ${
            oscuro
              ? 'border-white/30 text-white hover:border-gold hover:text-gold focus-visible:outline-gold'
              : 'border-ink/25 bg-white text-ink hover:border-ink hover:bg-cream focus-visible:outline-ink'
          }`}
        >
          <RotateCw size={14} aria-hidden="true" />
          Reintentar
        </button>
      )}
    </div>
  );
}

export function SinResultados({
  mensaje = 'No hay elementos disponibles por el momento.',
  oscuro = false,
  compacta = false,
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-md border ${
        compacta ? 'p-4' : 'p-6'
      } ${
        oscuro
          ? 'border-white/15 bg-ink-soft text-muted-on-dark'
          : 'border-sand bg-cream text-muted'
      }`}
    >
      <Inbox className="shrink-0" size={20} aria-hidden="true" />
      <p className="font-body text-body">{mensaje}</p>
    </div>
  );
}
