import { useId } from 'react';

// Selector accesible con etiqueta, ayuda y error asociado por aria-describedby.
export default function CampoSelect({
  etiqueta,
  error,
  ayuda,
  children,
  className = '',
  ...selectProps
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
      <select
        id={id}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        className={`w-full rounded-md border bg-white px-3 py-2.5 text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-goldDark disabled:bg-stone ${
          error ? 'border-redParish' : 'border-borderSoft'
        } ${className}`}
        {...selectProps}
      >
        {children}
      </select>
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

