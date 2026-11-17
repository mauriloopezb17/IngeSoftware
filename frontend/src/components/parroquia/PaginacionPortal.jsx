import { ChevronLeft, ChevronRight } from 'lucide-react';

function PaginacionPortal({
  paginaActual,
  totalPaginas,
  etiqueta = 'Paginación',
  alCambiarPagina,
}) {
  if (totalPaginas <= 1) return null;

  return (
    <nav
      className="mt-12 flex flex-wrap items-center justify-center gap-4 border-t border-sand pt-8"
      aria-label={etiqueta}
    >
      <button
        type="button"
        disabled={paginaActual <= 1}
        onClick={() => alCambiarPagina(paginaActual - 1)}
        className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-sm border border-sand bg-white px-5 py-2.5 font-body text-meta font-semibold text-ink transition-colors duration-150 hover:border-ink hover:bg-ink hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-default disabled:opacity-45 disabled:hover:border-sand disabled:hover:bg-white disabled:hover:text-ink"
      >
        <ChevronLeft size={16} aria-hidden="true" />
        <span>Anterior</span>
      </button>

      <span className="font-body text-meta font-medium tabular-nums text-muted">
        Página {paginaActual} de {totalPaginas}
      </span>

      <button
        type="button"
        disabled={paginaActual >= totalPaginas}
        onClick={() => alCambiarPagina(paginaActual + 1)}
        className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-sm border border-sand bg-white px-5 py-2.5 font-body text-meta font-semibold text-ink transition-colors duration-150 hover:border-ink hover:bg-ink hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-default disabled:opacity-45 disabled:hover:border-sand disabled:hover:bg-white disabled:hover:text-ink"
      >
        <span>Siguiente</span>
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </nav>
  );
}

export default PaginacionPortal;
