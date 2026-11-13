import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import BarraProgreso from './BarraProgreso.jsx';

describe('barra de progreso de una subida', () => {
  it('muestra el porcentaje enviado como progressbar con nombre y valor', () => {
    render(<BarraProgreso nombre="boletin.pdf" progreso={42} />);

    const barra = screen.getByRole('progressbar', { name: 'Progreso de subida de boletin.pdf' });
    expect(barra).toHaveValue(42);
    expect(barra).toHaveAttribute('aria-valuetext', '42 %');
    expect(screen.getByText('42 %')).toBeInTheDocument();
    expect(screen.queryByText('Procesando…')).not.toBeInTheDocument();
  });

  it('al llegar a 100 avisa que el servidor procesa el archivo, no que terminó', () => {
    render(<BarraProgreso nombre="foto.png" progreso={100} />);

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext', 'Enviado, procesando en el servidor');
    expect(screen.getByText('Procesando…')).toBeInTheDocument();
  });

  it('acota valores fuera de rango o ausentes', () => {
    const { rerender } = render(<BarraProgreso nombre="a.png" progreso={250} />);
    expect(screen.getByRole('progressbar')).toHaveValue(100);
    rerender(<BarraProgreso nombre="a.png" progreso={-5} />);
    expect(screen.getByRole('progressbar')).toHaveValue(0);
    rerender(<BarraProgreso nombre="a.png" />);
    expect(screen.getByRole('progressbar')).toHaveValue(0);
  });
});
