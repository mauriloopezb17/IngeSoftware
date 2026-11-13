import { useId } from 'react';

// Campo de formulario accesible: la etiqueta, la ayuda y el error quedan asociados al input.
// `lado` permite poner un control junto al input (por ejemplo, el botón de mostrar contraseña).
export default function CampoTexto({ etiqueta, error, ayuda, lado, ref, className = '', ...entrada }) {
  const id = useId();
  const idError = `${id}-error`;
  const idAyuda = `${id}-ayuda`;
  const describedBy = [ayuda && idAyuda, error && idError].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {etiqueta}
      </label>
      <div className="relative">
        <input
          id={id}
          ref={ref}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={`w-full rounded-md border bg-white px-3 py-2.5 text-ink placeholder:text-muted/70 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-goldDark ${
            error ? 'border-redParish' : 'border-borderSoft'
          } ${lado ? 'pr-11' : ''} ${className}`}
          {...entrada}
        />
        {lado}
      </div>
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
