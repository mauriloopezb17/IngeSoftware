import { useRef, useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import PaginacionPortal from './PaginacionPortal.jsx';

function ListadoPortalConFoco() {
  const [pagina, setPagina] = useState(1);
  const inicioRef = useRef(null);

  return (
    <div>
      <h2 ref={inicioRef} tabIndex={-1}>
        Listado público
      </h2>
      <p data-testid="pagina">{pagina}</p>
      <PaginacionPortal
        paginaActual={pagina}
        totalPaginas={3}
        alCambiarPagina={setPagina}
        destinoFocoRef={inicioRef}
        etiqueta="Paginación de ejemplo"
      />
    </div>
  );
}

describe('PaginacionPortal: foco accesible al cambiar de página (PAR-161.1)', () => {
  it('mueve el foco al inicio del listado al cambiar de página', async () => {
    const usuario = userEvent.setup();
    render(<ListadoPortalConFoco />);

    const encabezado = screen.getByRole('heading', { name: 'Listado público' });
    expect(encabezado).not.toHaveFocus();

    await usuario.click(screen.getByRole('button', { name: /Siguiente/i }));
    expect(screen.getByTestId('pagina')).toHaveTextContent('2');
    await waitFor(() => expect(encabezado).toHaveFocus());

    await usuario.click(screen.getByRole('button', { name: /Anterior/i }));
    expect(screen.getByTestId('pagina')).toHaveTextContent('1');
    await waitFor(() => expect(encabezado).toHaveFocus());
  });
});
