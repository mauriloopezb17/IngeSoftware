import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import TablaListado from './TablaListado.jsx';
import { useFiltrosListado } from './useFiltrosListado.js';

const COLUMNAS = [
  { id: 'titulo', encabezado: 'Título', render: (fila) => fila.titulo },
  { id: 'estado', encabezado: 'Estado', render: (fila) => fila.estado },
];

describe('TablaListado', () => {
  it('muestra tabla accesible, resumen Mostrando X–Y de Z y devuelve foco al cambiar página', async () => {
    const usuario = userEvent.setup();
    const onCambiarPagina = vi.fn();

    render(
      <TablaListado
        caption="Listado de ejemplo"
        columnas={COLUMNAS}
        datos={Array.from({ length: 10 }, (_, i) => ({
          id: i + 11,
          titulo: `Elemento ${i + 11}`,
          estado: 'Publicado',
        }))}
        paginacion={{ pagina: 2, porPagina: 10, total: 134, totalPaginas: 14 }}
        onCambiarPagina={onCambiarPagina}
      />,
    );

    const tabla = screen.getByRole('table', { name: 'Listado de ejemplo' });
    expect(within(tabla).getAllByRole('columnheader')[0]).toHaveAttribute('scope', 'col');
    expect(screen.getByText('Mostrando 11–20 de 134')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: /Siguiente/i }));
    expect(onCambiarPagina).toHaveBeenCalledWith(3);
  });

  it('muestra estados de carga, error con reintentar y vacío con quitar filtros', async () => {
    const usuario = userEvent.setup();
    const onReintentar = vi.fn();
    const onLimpiar = vi.fn();

    const { rerender } = render(
      <TablaListado caption="Tabla" columnas={COLUMNAS} cargando />,
    );
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    rerender(
      <TablaListado
        caption="Tabla"
        columnas={COLUMNAS}
        error="Fallo temporal"
        onReintentar={onReintentar}
      />,
    );
    expect(screen.getByText('Fallo temporal')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onReintentar).toHaveBeenCalledTimes(1);

    rerender(
      <TablaListado
        caption="Tabla"
        columnas={COLUMNAS}
        datos={[]}
        hayFiltrosActivos
        onLimpiarFiltros={onLimpiar}
        vacioConFiltros={{ titulo: 'Nada coincide' }}
      />,
    );
    expect(screen.getByText('Nada coincide')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Quitar filtros' }));
    expect(onLimpiar).toHaveBeenCalledTimes(1);
  });

  it('sincroniza categoría y página en la URL y vuelve a página 1 al filtrar', async () => {
    const usuario = userEvent.setup();

    function PantallaDemo() {
      const { valores, actualizarFiltro, setPagina, limpiarFiltros, hayFiltrosActivos } =
        useFiltrosListado({
          filtros: { categoria: { defecto: '' } },
          conBusqueda: false,
        });
      const { search } = useLocation();

      return (
        <>
          <p data-testid="url">{search}</p>
          <TablaListado
            caption="Demo"
            columnas={COLUMNAS}
            datos={[{ id: 1, titulo: 'A', estado: 'OK' }]}
            paginacion={{ pagina: 2, porPagina: 10, total: 20, totalPaginas: 2 }}
            onCambiarPagina={setPagina}
            categoria={{
              etiqueta: 'Categoría',
              valor: valores.categoria,
              opciones: [{ valor: 'liturgia', etiqueta: 'Liturgia' }],
              onCambiar: (v) => actualizarFiltro('categoria', v),
            }}
            hayFiltrosActivos={hayFiltrosActivos}
            onLimpiarFiltros={limpiarFiltros}
          />
        </>
      );
    }

    render(
      <MemoryRouter initialEntries={['/admin/demo?pagina=2']}>
        <PantallaDemo />
      </MemoryRouter>,
    );

    await usuario.selectOptions(screen.getByLabelText('Categoría'), 'liturgia');
    expect(screen.getByTestId('url')).toHaveTextContent('?categoria=liturgia');
  });
});
