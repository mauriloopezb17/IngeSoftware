import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { IconoDinamico, IconoRedSocial } from './IconoDinamico.jsx';
import { CargandoSeccion, ErrorSeccion, SinResultados } from './EstadoSeccion.jsx';

describe('IconoDinamico e IconoRedSocial', () => {
  it('renderiza los íconos conocidos del seed incluyendo cross y music-2', () => {
    const { container } = render(
      <div>
        <IconoDinamico nombre="cross" data-testid="icono-cross" />
        <IconoDinamico nombre="music-2" data-testid="icono-music" />
        <IconoDinamico nombre="clock-3" data-testid="icono-clock" />
      </div>,
    );

    expect(container.querySelector('[data-testid="icono-cross"]')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="icono-music"]')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="icono-clock"]')).toBeInTheDocument();
  });

  it('usa el ícono genérico de respaldo cuando el nombre es desconocido o null', () => {
    const { container } = render(
      <div>
        <IconoDinamico nombre="icono-inexistente" data-testid="icono-desconocido" />
        <IconoDinamico nombre={null} data-testid="icono-nulo" />
      </div>,
    );

    expect(container.querySelector('[data-testid="icono-desconocido"]')).toHaveClass('lucide-circle-dot');
    expect(container.querySelector('[data-testid="icono-nulo"]')).toHaveClass('lucide-circle-dot');
  });

  it('renderiza íconos de redes sociales y respaldo para red desconocida', () => {
    const { container } = render(
      <div>
        <IconoRedSocial nombre="facebook" data-testid="red-fb" />
        <IconoRedSocial nombre="instagram" data-testid="red-ig" />
        <IconoRedSocial nombre="youtube" data-testid="red-yt" />
        <IconoRedSocial nombre="otra-red" data-testid="red-otra" />
      </div>,
    );

    expect(container.querySelector('[data-testid="red-fb"]')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="red-ig"]')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="red-yt"]')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="red-otra"]')).toBeInTheDocument();
  });
});

describe('EstadoSeccion (carga, error y sin resultados)', () => {
  it('muestra el indicador de carga con su etiqueta accesible', () => {
    render(<CargandoSeccion alturaMinima={240} etiqueta="Cargando horarios" />);

    const estado = screen.getByRole('status', { name: 'Cargando horarios' });
    expect(estado).toBeInTheDocument();
    expect(estado).toHaveStyle({ minHeight: '240px' });
  });

  it('muestra el error y ejecuta onReintentar al hacer clic en Reintentar', async () => {
    const usuario = userEvent.setup();
    const reintentar = vi.fn();

    render(<ErrorSeccion mensaje="Falló la carga" onReintentar={reintentar} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Falló la carga');
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(reintentar).toHaveBeenCalledTimes(1);
  });

  it('muestra el estado sin resultados', () => {
    render(<SinResultados mensaje="No hay eventos próximos." />);

    expect(screen.getByText('No hay eventos próximos.')).toBeInTheDocument();
  });
});
