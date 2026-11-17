import { ArrowRight } from 'lucide-react';

import EnlacePortal from '../parroquia/EnlacePortal.jsx';

// Enlace textual con flecha animada en hover (4 px a la derecha).
function EnlaceFlecha({ to, children, oscuro = false, className = '', ...resto }) {
  return (
    <EnlacePortal
      to={to}
      className={`group inline-flex min-h-11 items-center gap-2 font-body text-button font-semibold underline-offset-4 transition-colors duration-150 ease-salida hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 ${
        oscuro
          ? 'text-gold hover:text-white focus-visible:outline-gold'
          : 'text-ink hover:text-muted focus-visible:outline-ink'
      } ${className}`.trim()}
      {...resto}
    >
      <span>{children}</span>
      <ArrowRight
        size={16}
        aria-hidden="true"
        className="shrink-0 transition-transform duration-200 ease-salida group-hover:translate-x-1"
      />
    </EnlacePortal>
  );
}

export default EnlaceFlecha;
