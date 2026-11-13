import { ChevronLeft, ChevronRight } from 'lucide-react';

// Controles de una lista paginada. `paginacion` es el objeto de la API: { pagina, porPagina, total, totalPaginas }.
export default function Paginacion({ paginacion, onCambiar, nombre = 'Paginación' }) {
  const { pagina, total, totalPaginas } = paginacion;
  if (totalPaginas <= 1) return null;

  const boton =
    'flex items-center gap-1 rounded-md border border-borderSoft bg-white px-3 py-2 text-sm font-medium hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white';

  return (
    <nav aria-label={nombre} className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted" aria-live="polite">
        Página {pagina} de {totalPaginas} · {total} en total
      </p>
      <div className="flex gap-2">
        <button type="button" className={boton} disabled={pagina <= 1} onClick={() => onCambiar(pagina - 1)}>
          <ChevronLeft className="size-4" aria-hidden="true" /> Anterior
        </button>
        <button type="button" className={boton} disabled={pagina >= totalPaginas} onClick={() => onCambiar(pagina + 1)}>
          Siguiente <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
