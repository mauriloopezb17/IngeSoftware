import { ChevronLeft, ChevronRight } from 'lucide-react';

function PaginacionPortal({
  paginaActual,
  totalPaginas,
  etiqueta = 'Paginación',
  alCambiarPagina,
}) {
  if (totalPaginas <= 1) return null;

  return (
    <nav className="noticias-paginacion" aria-label={etiqueta}>
      <button
        type="button"
        className="noticias-paginacion-boton"
        disabled={paginaActual <= 1}
        onClick={() => alCambiarPagina(paginaActual - 1)}
      >
        <ChevronLeft size={16} aria-hidden="true" />
        Anterior
      </button>

      <span className="noticias-paginacion-estado">
        Página {paginaActual} de {totalPaginas}
      </span>

      <button
        type="button"
        className="noticias-paginacion-boton"
        disabled={paginaActual >= totalPaginas}
        onClick={() => alCambiarPagina(paginaActual + 1)}
      >
        Siguiente
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </nav>
  );
}

export default PaginacionPortal;

