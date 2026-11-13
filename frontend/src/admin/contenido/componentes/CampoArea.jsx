import { useId } from 'react';

// Área de texto accesible con etiqueta, ayuda y error asociado por aria-describedby.
export default function CampoArea({
  etiqueta,
  error,
  ayuda,
  rows = 3,
  className = '',
  ...textareaProps
}) {
  const id = useId();
  const idError = `${id}-error`;
  const idAyuda = `${id}-ayuda`;
  const describedBy = [ayuda && idAyuda, error && idError].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {etiqueta}
      </label>
      <textarea
        id={id}
        rows={rows}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        className={`w-full rounded-md border bg-white px-3 py-2.5 text-ink placeholder:text-muted/70 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-goldDark disabled:bg-stone ${
          error ? 'border-redParish' : 'border-borderSoft'
        } ${className}`}
        {...textareaProps}
      />
      {ayuda && (
        <p id={idAyuda} className="text-xs text-muted">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={idError} className="text-sm text-redParish">
          {error}
        </p>
      )}
    </div>
  );
}

