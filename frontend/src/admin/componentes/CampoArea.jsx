import { useId } from 'react';

// Área de texto accesible con contador de caracteres (si tiene `maxLength`).
export default function CampoArea({ etiqueta, error, ayuda, value, maxLength, rows = 4, ...area }) {
  const id = useId();
  const describedBy = [`${id}-ayuda`, error && `${id}-error`].filter(Boolean).join(' ');

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {etiqueta}
      </label>
      <textarea
        id={id}
        value={value}
        maxLength={maxLength}
        rows={rows}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        className={`w-full rounded-md border bg-white px-3 py-2.5 text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-goldDark ${
          error ? 'border-redParish' : 'border-borderSoft'
        }`}
        {...area}
      />
      <p id={`${id}-ayuda`} className="text-xs text-muted">
        {ayuda} {maxLength ? `${value.length}/${maxLength}` : ''}
      </p>
      {error && (
        <p id={`${id}-error`} className="text-sm text-redParish">
          {error}
        </p>
      )}
    </div>
  );
}
