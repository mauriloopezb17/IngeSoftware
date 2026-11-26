import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import ModalVideo from './ModalVideo.jsx';
import VisorGaleria from '../parroquia/VisorGaleria.jsx';

// LayoutPortal anima la entrada de cada página con un transform; una ventana fixed dentro de ese
// contenedor quedaría desplazada y tapada por el encabezado. Por eso se montan en document.body.
function dentroDeContenedorAnimado(hijo) {
  return render(<div style={{ transform: 'translateY(16px)' }}>{hijo}</div>);
}

describe('ventanas superpuestas del portal', () => {
  it('el modal del video se monta en document.body', () => {
    const { container } = dentroDeContenedorAnimado(
      <ModalVideo abierto alCerrar={vi.fn()} urlVideo="/media/video.mp4" titulo="Video de ejemplo" />,
    );

    const dialogo = screen.getByRole('dialog');
    expect(container.contains(dialogo)).toBe(false);
    expect(document.body.contains(dialogo)).toBe(true);
  });

  it('el visor de la galería se monta en document.body', () => {
    const { container } = dentroDeContenedorAnimado(
      <VisorGaleria
        elementos={[
          { id: 1, url: '/media/foto-1.webp', tipoMime: 'image/webp', textoAlternativo: 'Foto de ejemplo' },
        ]}
        indice={0}
        alCambiar={vi.fn()}
        alCerrar={vi.fn()}
      />,
    );

    const dialogo = screen.getByRole('dialog', { name: 'Visor de galería' });
    expect(container.contains(dialogo)).toBe(false);
    expect(document.body.contains(dialogo)).toBe(true);
  });
});
