import { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Componente de ejemplo: solo comprueba que la herramienta de pruebas funciona.
function Contador() {
  const [cuenta, setCuenta] = useState(0);

  return (
    <button type="button" onClick={() => setCuenta((actual) => actual + 1)}>
      Clics: {cuenta}
    </button>
  );
}

describe('configuración de pruebas del frontend', () => {
  it('renderiza un componente en jsdom', () => {
    render(<Contador />);

    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveTextContent('Clics: 0');
  });

  it('responde a la interacción del usuario', async () => {
    const usuario = userEvent.setup();
    render(<Contador />);

    await usuario.click(screen.getByRole('button'));
    await usuario.click(screen.getByRole('button'));

    expect(screen.getByRole('button')).toHaveTextContent('Clics: 2');
  });

  it('limpia el DOM entre pruebas', () => {
    render(<Contador />);

    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
