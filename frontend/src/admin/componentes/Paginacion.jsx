import { ChevronLeft, ChevronRight } from 'lucide-react';

import Boton from '../ui/Boton.jsx';

// Controles de una lista paginada. `paginacion` es el objeto de la API: { pagina, porPagina, total, totalPaginas }.
export default function Paginacion({ paginacion, onCambiar, nombre = 'Paginación' }) {
  const { pagina, total, totalPaginas } = paginacion;
  if (totalPaginas <= 1) return null;

  return (
    <nav aria-label={nombre} className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm tabular-nums text-muted" aria-live="polite">
        Página {pagina} de {totalPaginas} · {total} en total
      </p>
      <div className="flex gap-2">
        <Boton
          variante="secundario"
          tamano="sm"
          disabled={pagina <= 1}
          onClick={() => onCambiar(pagina - 1)}
        >
          <ChevronLeft className="size-4" aria-hidden="true" /> Anterior
        </Boton>
        <Boton
          variante="secundario"
          tamano="sm"
          disabled={pagina >= totalPaginas}
          onClick={() => onCambiar(pagina + 1)}
        >
          Siguiente <ChevronRight className="size-4" aria-hidden="true" />
        </Boton>
      </div>
    </nav>
  );
}
