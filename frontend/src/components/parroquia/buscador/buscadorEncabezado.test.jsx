import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

import { renderConQuery } from '../../../test/utilidadesQuery.jsx';
import Encabezado from '../Encabezado.jsx';

function RutaActual() {
  const { pathname, search } = useLocation();
  return <p data-testid="ruta-actual">{pathname + search}</p>;
}

function renderEncabezadoConRutas(entrada = '/') {
  return renderConQuery(
    <MemoryRouter initialEntries={[entrada]}>
      <Encabezado />
      <Routes>
        <Route path="*" element={<RutaActual />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Buscador en el encabezado y menú móvil', () => {
  it('abre y cierra con botón y Escape, devuelve foco, navega con Enter y soporta atajo /', async () => {
    const usuario = userEvent.setup();
    renderEncabezadoConRutas('/');

    const botonBuscar = await screen.findByRole('button', { name: 'Buscar' });
    expect(botonBuscar).toHaveAttribute('aria-expanded', 'false');

    // Abrir al hacer clic
    await usuario.click(botonBuscar);
    expect(botonBuscar).toHaveAttribute('aria-expanded', 'true');
    const campo = screen.getByRole('searchbox', { name: 'Buscar en el portal' });
    expect(campo).toHaveFocus();

    // Con menos de 2 letras muestra aviso y no navega
    await usuario.type(campo, 'a{Enter}');
    expect(screen.getByText('Escribe al menos 2 letras para buscar.')).toBeInTheDocument();
    expect(screen.getByTestId('ruta-actual')).toHaveTextContent('/');

    // Escape cierra y devuelve foco al botón
    await usuario.keyboard('{Escape}');
    expect(botonBuscar).toHaveAttribute('aria-expanded', 'false');
    expect(botonBuscar).toHaveFocus();

    // Atajo '/' abre el buscador cuando no se escribe en otro campo
    await usuario.keyboard('/');
    expect(botonBuscar).toHaveAttribute('aria-expanded', 'true');
    const campoReabierto = screen.getByRole('searchbox', { name: 'Buscar en el portal' });
    expect(campoReabierto).toHaveFocus();

    // Enter con 2+ caracteres navega a /buscar?q=...
    await usuario.clear(campoReabierto);
    await usuario.type(campoReabierto, 'bautismo{Enter}');
    expect(screen.getByTestId('ruta-actual')).toHaveTextContent('/buscar?q=bautismo');
    expect(botonBuscar).toHaveAttribute('aria-expanded', 'false');
  });

  it('no activa el atajo / mientras se escribe dentro de un input', async () => {
    const usuario = userEvent.setup();
    renderConQuery(
      <MemoryRouter initialEntries={['/']}>
        <input aria-label="Otro campo" />
        <Encabezado />
      </MemoryRouter>,
    );

    const botonBuscar = await screen.findByRole('button', { name: 'Buscar' });
    const otroCampo = screen.getByLabelText('Otro campo');
    await usuario.click(otroCampo);
    await usuario.type(otroCampo, 'hola/mundo');

    expect(otroCampo).toHaveValue('hola/mundo');
    expect(botonBuscar).toHaveAttribute('aria-expanded', 'false');
  });

  it('incluye el campo de búsqueda al inicio del menú móvil y navega al enviar', async () => {
    const usuario = userEvent.setup();
    renderEncabezadoConRutas('/');

    const botonMenu = await screen.findByRole('button', { name: 'Abrir menú' });
    await usuario.click(botonMenu);

    const dialogo = screen.getByRole('dialog', { name: 'Menú de navegación' });
    expect(dialogo).toBeInTheDocument();

    const campoMovil = screen.getByPlaceholderText('Buscar en el portal…');
    await usuario.type(campoMovil, 'semana santa{Enter}');

    expect(screen.getByTestId('ruta-actual')).toHaveTextContent('/buscar?q=semana%20santa');
    expect(screen.queryByRole('dialog', { name: 'Menú de navegación' })).not.toBeInTheDocument();
  });
});
