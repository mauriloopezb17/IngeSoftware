import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import SelectorRelacionados from './SelectorRelacionados.jsx';

const SERVICIOS = [
  { id: 1, slug: 'bautismo', nombre: 'Bautismo' },
  { id: 2, slug: 'confirmacion', nombre: 'Confirmación' },
];

const GRUPOS = [
  { id: 10, slug: 'coro-parroquial', nombre: 'Coro parroquial' },
  { id: 11, slug: 'pastoral-juvenil', nombre: 'Pastoral Juvenil' },
];

describe('SelectorRelacionados', () => {
  it('permite buscar, seleccionar sacramentos y grupos y quitar mediante chips', async () => {
    const usuario = userEvent.setup();
    const alCambiarServicios = vi.fn();
    const alCambiarGrupos = vi.fn();

    const { rerender } = render(
      <SelectorRelacionados
        servicios={SERVICIOS}
        grupos={GRUPOS}
        serviciosSeleccionados={[]}
        gruposSeleccionados={[]}
        alCambiarServicios={alCambiarServicios}
        alCambiarGrupos={alCambiarGrupos}
      />,
    );

    const buscador = screen.getByLabelText('Buscar sacramento o grupo');
    await usuario.type(buscador, 'coro');
    expect(screen.getByRole('checkbox', { name: 'Coro parroquial' })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Bautismo' })).not.toBeInTheDocument();

    await usuario.click(screen.getByRole('checkbox', { name: 'Coro parroquial' }));
    expect(alCambiarGrupos).toHaveBeenCalledWith([GRUPOS[0]]);

    await usuario.clear(buscador);
    await usuario.click(screen.getByRole('checkbox', { name: 'Bautismo' }));
    expect(alCambiarServicios).toHaveBeenCalledWith([SERVICIOS[0]]);

    rerender(
      <SelectorRelacionados
        servicios={SERVICIOS}
        grupos={GRUPOS}
        serviciosSeleccionados={[SERVICIOS[0]]}
        gruposSeleccionados={[GRUPOS[0]]}
        alCambiarServicios={alCambiarServicios}
        alCambiarGrupos={alCambiarGrupos}
      />,
    );

    const listaChips = screen.getByRole('list', { name: 'Elementos relacionados seleccionados' });
    expect(within(listaChips).getByRole('button', { name: 'Quitar Bautismo' })).toBeInTheDocument();
    await usuario.click(within(listaChips).getByRole('button', { name: 'Quitar Coro parroquial' }));
    expect(alCambiarGrupos).toHaveBeenLastCalledWith([]);
  });
});
