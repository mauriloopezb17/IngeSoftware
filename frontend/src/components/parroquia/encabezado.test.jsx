import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderConQuery } from '../../test/utilidadesQuery.jsx';
import Encabezado from './Encabezado.jsx';

describe('Encabezado del portal', () => {
  it('elimina el botón de horarios en la barra y resalta el menú hamburguesa', async () => {
    const usuario = userEvent.setup();
    renderConQuery(<Encabezado transparente />);

    const botonMenu = await screen.findByRole('button', { name: 'Abrir menú' });
    expect(botonMenu).toHaveAttribute('aria-expanded', 'false');
    expect(botonMenu.className).toContain('bg-gold');
    expect(botonMenu.className).toContain('text-ink');
    expect(botonMenu.className).toContain('size-11');

    expect(screen.queryByRole('link', { name: 'Horarios de misa' })).not.toBeInTheDocument();

    await usuario.click(botonMenu);
    expect(botonMenu).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog', { name: 'Menú de navegación' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Horarios de misa' })).not.toBeInTheDocument();
  });
});
