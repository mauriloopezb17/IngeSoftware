import { useId } from 'react';

// Selector accesible con el mismo aspecto que CampoTexto: etiqueta, ayuda y error asociados.
// `opciones`: [[valor, texto], ...].
export default function CampoSelect({ etiqueta, error, ayuda, opciones, ...select }) {
  const id = useId();
  const describedBy = [ayuda && `${id}-ayuda`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;

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
        }`}
        {...select}
      >
        {opciones.map(([valor, texto]) => (
          <option key={valor} value={valor}>
            {texto}
          </option>
        ))}
      </select>
      {ayuda && (
        <p id={`${id}-ayuda`} className="text-xs text-muted">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-redParish">
          {error}
        </p>
      )}
    </div>
  );
}
