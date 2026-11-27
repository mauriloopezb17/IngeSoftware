import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';

import { TablaListado, useFiltrosListado } from './index.js';

function EjemploListado() {
  const {
    valores,
    busqueda,
    pagina,
    hayFiltrosActivos,
    setBusqueda,
    actualizarFiltro,
    setPagina,
    limpiarFiltros,
  } = useFiltrosListado({
    filtros: {
      categoria: { defecto: '' },
    },
    esperaBusquedaMs: 50,
  });

  const { pathname, search } = useLocation();
  const datos = Array.from({ length: 5 }, (_, i) => ({
    id: (pagina - 1) * 5 + i + 1,
    nombre: `Elemento ${(pagina - 1) * 5 + i + 1}`,
  }));

  return (
    <div>
      <p data-testid="url-actual">{`${pathname}${search}`}</p>
      <p data-testid="pagina-actual">{pagina}</p>
      <TablaListado
        caption="Listado de prueba"
        nombrePaginacion="Paginación de prueba"
        columnas={[{ id: 'nombre', encabezado: 'Nombre', render: (fila) => fila.nombre }]}
        datos={datos}
        paginacion={{ pagina, porPagina: 5, total: 15, totalPaginas: 3 }}
        onCambiarPagina={setPagina}
        busqueda={busqueda}
        onCambiarBusqueda={setBusqueda}
        placeholderBusqueda="Buscar elemento"
        categoria={{
          etiqueta: 'Categoría',
          valor: valores.categoria,
          todasEtiqueta: 'Todas',
          opciones: [
            { valor: 'parroquia', etiqueta: 'Parroquia' },
            { valor: 'capilla', etiqueta: 'Capilla' },
          ],
          onCambiar: (v) => actualizarFiltro('categoria', v),
        }}
        hayFiltrosActivos={hayFiltrosActivos}
        onLimpiarFiltros={limpiarFiltros}
      />
    </div>
  );
}

describe('TablaListado + useFiltrosListado: URL compartible, recarga y reinicio de página (PAR-161.1)', () => {
  it('vuelve a la página 1 al cambiar un filtro o la búsqueda', async () => {
    const usuario = userEvent.setup({ delay: null });
    render(
      <MemoryRouter initialEntries={['/admin/prueba?pagina=3']}>
        <EjemploListado />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('pagina-actual')).toHaveTextContent('3');

    await usuario.selectOptions(screen.getByLabelText('Categoría'), 'parroquia');
    await waitFor(() => {
      expect(screen.getByTestId('pagina-actual')).toHaveTextContent('1');
    });
    expect(screen.getByTestId('url-actual')).toHaveTextContent('categoria=parroquia');
    expect(screen.getByTestId('url-actual').textContent).not.toContain('pagina=');

    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByTestId('pagina-actual')).toHaveTextContent('2');

    await usuario.type(screen.getByPlaceholderText('Buscar elemento'), 'misa');
    await waitFor(() => {
      expect(screen.getByTestId('pagina-actual')).toHaveTextContent('1');
      expect(screen.getByTestId('url-actual')).toHaveTextContent('buscar=misa');
    });
  });

  it('recupera los filtros, búsqueda y página al abrir una URL compartida o recargar', async () => {
    const usuario = userEvent.setup({ delay: null });
    const { unmount } = render(
      <MemoryRouter initialEntries={['/admin/prueba']}>
        <EjemploListado />
      </MemoryRouter>,
    );

    await usuario.selectOptions(screen.getByLabelText('Categoría'), 'capilla');
    await usuario.type(screen.getByPlaceholderText('Buscar elemento'), 'bautismo');
    await waitFor(() => {
      expect(screen.getByTestId('url-actual')).toHaveTextContent('buscar=bautismo');
    });
    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }));

    const urlCompartida = screen.getByTestId('url-actual').textContent;
    expect(urlCompartida).toContain('categoria=capilla');
    expect(urlCompartida).toContain('buscar=bautismo');
    expect(urlCompartida).toContain('pagina=2');

    // Simular recarga abriendo exactamente la URL compartida en un montaje nuevo
    unmount();
    render(
      <MemoryRouter initialEntries={[urlCompartida]}>
        <EjemploListado />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('pagina-actual')).toHaveTextContent('2');
    expect(screen.getByLabelText('Categoría')).toHaveValue('capilla');
    expect(screen.getByPlaceholderText('Buscar elemento')).toHaveValue('bautismo');
    expect(screen.getByText('Elemento 6')).toBeInTheDocument();
  });
});
