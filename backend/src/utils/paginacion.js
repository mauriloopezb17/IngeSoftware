// Cálculos de paginación (contrato: docs/api/convenciones.md, sección 4).

// Filas que se saltan para llegar a la página pedida (OFFSET de SQL).
export function desplazamiento(pagina, porPagina) {
  return (pagina - 1) * porPagina;
}

// Objeto "paginacion" de una respuesta paginada. totalPaginas es 0 cuando total es 0.
// Una página fuera de rango no es un error: la respuesta lleva "datos": [] y esta paginación real.
export function armarPaginacion({ total, pagina, porPagina }) {
  return {
    pagina,
    porPagina,
    total,
    totalPaginas: Math.ceil(total / porPagina),
  };
}
