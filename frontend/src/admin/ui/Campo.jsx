import { useId } from 'react';
import { AlertCircle } from 'lucide-react';

const CONTROL_BASE =
  'w-full rounded-md border bg-white px-3 py-2 text-sm text-ink placeholder:text-muted/75 transition-colors duration-150 ease-salida focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink disabled:cursor-not-allowed disabled:bg-panel disabled:text-muted';

function MensajeError({ id, error }) {
  if (!error) return null;
  return (
    <p id={id} className="flex items-start gap-1.5 text-sm text-danger">
      <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span>{error}</span>
    </p>
  );
}

// Campo de entrada de texto accesible con etiqueta, ayuda opcional y error.
export function CampoTexto({
  etiqueta,
  error,
  ayuda,
  lado = null,
  id: idProp,
  className = '',
  ref,
  ...inputProps
}) {
  const idGenerado = useId();
  const id = idProp ?? idGenerado;
  const idError = `${id}-error`;
  const idAyuda = `${id}-ayuda`;
  const describedBy = [ayuda && idAyuda, error && idError].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {etiqueta}
      </label>
      <div className={lado ? 'relative' : undefined}>
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={`${CONTROL_BASE} min-h-11 ${lado ? 'pr-11' : ''} ${error ? 'border-danger' : 'border-sand'} ${className}`}
          {...inputProps}
        />
        {lado}
      </div>
      {ayuda && (
        <p id={idAyuda} className="text-xs text-muted">
          {ayuda}
        </p>
      )}
      <MensajeError id={idError} error={error} />
    </div>
  );
}

// Área de texto accesible con contador opcional de caracteres.
export function CampoArea({
  etiqueta,
  error,
  ayuda,
  rows = 3,
  mostrarContador = false,
  id: idProp,
  className = '',
  ref,
  ...textareaProps
}) {
  const idGenerado = useId();
  const id = idProp ?? idGenerado;
  const idError = `${id}-error`;
  const idAyuda = `${id}-ayuda`;
  const describedBy = [ayuda && idAyuda, error && idError].filter(Boolean).join(' ') || undefined;
  const longitud = typeof textareaProps.value === 'string' ? textareaProps.value.length : null;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-semibold text-ink">
          {etiqueta}
        </label>
        {mostrarContador && longitud !== null && (
          <span className="text-xs tabular-nums text-muted">
            {textareaProps.maxLength ? `${longitud}/${textareaProps.maxLength}` : longitud}
          </span>
        )}
      </div>
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        className={`${CONTROL_BASE} ${error ? 'border-danger' : 'border-sand'} ${className}`}
        {...textareaProps}
      />
      {ayuda && (
        <p id={idAyuda} className="text-xs text-muted">
          {ayuda}
        </p>
      )}
      <MensajeError id={idError} error={error} />
    </div>
  );
}

// Selector accesible con etiqueta, ayuda y error.
export function CampoSelect({
  etiqueta,
  error,
  ayuda,
  opciones,
  children,
  id: idProp,
  className = '',
  ref,
  ...selectProps
}) {
  const idGenerado = useId();
  const id = idProp ?? idGenerado;
  const idError = `${id}-error`;
  const idAyuda = `${id}-ayuda`;
  const describedBy = [ayuda && idAyuda, error && idError].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {etiqueta}
      </label>
      <select
        ref={ref}
        id={id}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        className={`${CONTROL_BASE} min-h-11 ${error ? 'border-danger' : 'border-sand'} ${className}`}
        {...selectProps}
      >
        {opciones
          ? opciones.map(([valor, texto]) => (
              <option key={valor} value={valor}>
                {texto}
              </option>
            ))
          : children}
      </select>
      {ayuda && (
        <p id={idAyuda} className="text-xs text-muted">
          {ayuda}
        </p>
      )}
      <MensajeError id={idError} error={error} />
    </div>
  );
}

// Casilla de verificación accesible con etiqueta y descripción opcional.
export function CampoCasilla({
  etiqueta,
  ayuda,
  error,
  id: idProp,
  className = '',
  ref,
  ...inputProps
}) {
  const idGenerado = useId();
  const id = idProp ?? idGenerado;
  const idError = `${id}-error`;
  const idAyuda = `${id}-ayuda`;
  const describedBy = [ayuda && idAyuda, error && idError].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex items-start gap-2.5">
        <input
          ref={ref}
          id={id}
          type="checkbox"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className="mt-0.5 size-4 rounded border-sand accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-60"
          {...inputProps}
        />
        <div className="flex flex-col gap-0.5">
          <label htmlFor={id} className="text-sm font-medium text-ink">
            {etiqueta}
          </label>
          {ayuda && (
            <p id={idAyuda} className="text-xs text-muted">
              {ayuda}
            </p>
          )}
        </div>
      </div>
      <MensajeError id={idError} error={error} />
    </div>
  );
}
