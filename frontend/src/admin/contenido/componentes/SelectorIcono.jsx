import { useId } from 'react';
import { AlertCircle } from 'lucide-react';

import { IconoDinamico } from '../../../components/parroquia/IconoDinamico.jsx';

const ICONOS_PORTAL = [
  { valor: 'book-open', etiqueta: 'Libro abierto (book-open)' },
  { valor: 'calendar-days', etiqueta: 'Calendario (calendar-days)' },
  { valor: 'clock-3', etiqueta: 'Reloj (clock-3)' },
  { valor: 'cross', etiqueta: 'Cruz (cross)' },
  { valor: 'droplet', etiqueta: 'Gota / Bautismo (droplet)' },
  { valor: 'flame', etiqueta: 'Llama / Confirmación (flame)' },
  { valor: 'heart-handshake', etiqueta: 'Manos / Pastoral social (heart-handshake)' },
  { valor: 'heart-pulse', etiqueta: 'Cuidado / Unción (heart-pulse)' },
  { valor: 'music-2', etiqueta: 'Música / Coro (music-2)' },
  { valor: 'scroll-text', etiqueta: 'Pergamino (scroll-text)' },
  { valor: 'star', etiqueta: 'Estrella (star)' },
  { valor: 'sun', etiqueta: 'Sol / Comunión (sun)' },
  { valor: 'users', etiqueta: 'Comunidad / Grupo (users)' },
];

// Selector de íconos lucide-react en kebab-case usados por el portal, con vista previa en vivo.
export default function SelectorIcono({
  valor,
  onChange,
  error,
  disabled = false,
  etiqueta = 'Ícono (opcional)',
}) {
  const id = useId();
  const idError = `${id}-error`;
  const idAyuda = `${id}-ayuda`;
  const describedBy = [idAyuda, error && idError].filter(Boolean).join(' ');

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {etiqueta}
      </label>
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-11 shrink-0 items-center justify-center rounded-md border border-sand bg-panel text-ink"
        >
          <IconoDinamico nombre={valor || null} size={20} />
        </span>
        <select
          id={id}
          value={valor ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={`min-h-11 w-full rounded-md border bg-white px-3 py-2 text-sm text-ink transition-colors duration-150 ease-salida focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink disabled:bg-panel ${
            error ? 'border-danger' : 'border-sand'
          }`}
        >
          <option value="">Sin ícono (por defecto)</option>
          {ICONOS_PORTAL.map((icono) => (
            <option key={icono.valor} value={icono.valor}>
              {icono.etiqueta}
            </option>
          ))}
        </select>
      </div>
      <p id={idAyuda} className="text-xs text-muted">
        Nombre de lucide-react en kebab-case usado en el portal.
      </p>
      {error && (
        <p id={idError} className="flex items-start gap-1.5 text-sm text-danger">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
