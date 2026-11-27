import { NavLink } from 'react-router';

import { usePermisos } from '../permisos/usePermisos.js';
import { useResumenObservaciones } from './useResumenObservaciones.js';

export default function PestanasProclamas() {
  const { puede } = usePermisos();
  const { data: resumen } = useResumenObservaciones();

  if (!puede('proclamas.observaciones')) return null;

  const noLeidas = resumen?.noLeidas ?? 0;

  const pestanas = [
    { a: '/admin/proclamas', texto: 'Proclamas', fin: true },
    { a: '/admin/proclamas/observaciones', texto: 'Observaciones', fin: false, badge: noLeidas },
  ];

  return (
    <nav aria-label="Secciones de proclamas" className="mt-6 flex flex-wrap gap-1 border-b border-sand">
      {pestanas.map(({ a, texto, fin, badge }) => (
        <NavLink
          key={a}
          to={a}
          end={fin}
          className={({ isActive }) =>
            `-mb-px inline-flex min-h-11 items-center gap-2 border-b-2 px-4 py-2.5 text-sm transition-colors duration-150 ease-salida focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink motion-reduce:transition-none ${
              isActive
                ? 'border-gold bg-white font-semibold text-ink'
                : 'border-transparent font-medium text-muted hover:text-ink'
            }`
          }
        >
          <span>{texto}</span>
          {badge > 0 && (
            <span
              aria-label={`${badge} ${badge === 1 ? 'nueva' : 'nuevas'}`}
              className="inline-flex min-w-5 items-center justify-center rounded-full bg-gold px-1.5 py-0.5 text-xs font-semibold tabular-nums text-ink"
            >
              {badge}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
