import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';

import {
  Parallax,
  Reveal,
  RevealImagen,
  RevealTitulo,
} from './index.js';

function simularMatchMedia(coincidencias) {
  const original = window.matchMedia;
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: Boolean(coincidencias[query]),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  return () => {
    window.matchMedia = original;
  };
}

describe('Primitivas de animación del portal', () => {
  const restauradores = [];

  afterEach(() => {
    while (restauradores.length > 0) {
      restauradores.pop()();
    }
    vi.restoreAllMocks();
  });

  it('Reveal se revela al entrar en pantalla y una sola vez con IntersectionObserver', () => {
    const observados = new Set();
    let callbackObserver = null;

    const originalIO = window.IntersectionObserver;
    window.IntersectionObserver = class MockIntersectionObserver {
      constructor(cb) {
        callbackObserver = cb;
      }
      observe(el) {
        observados.add(el);
      }
      unobserve(el) {
        observados.delete(el);
      }
      disconnect() {
        observados.clear();
      }
    };
    restauradores.push(() => {
      window.IntersectionObserver = originalIO;
    });

    const { container } = render(
      <Reveal variante="tarjeta" retraso={120}>
        <p>Tarjeta animada</p>
      </Reveal>,
    );

    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveClass('opacity-0');
    expect(observados.has(wrapper)).toBe(true);

    act(() => {
      callbackObserver([
        {
          target: wrapper,
          isIntersecting: true,
          boundingClientRect: { top: 100 },
        },
      ]);
    });

    expect(wrapper).toHaveClass('opacity-100');
    expect(observados.has(wrapper)).toBe(false);
  });

  it('Reveal y RevealImagen son visibles de inmediato cuando prefers-reduced-motion está activo', () => {
    restauradores.push(simularMatchMedia({ '(prefers-reduced-motion: reduce)': true }));

    const { container } = render(
      <>
        <Reveal variante="arriba">
          <p>Contenido visible</p>
        </Reveal>
        <RevealImagen lado="izquierda">
          <img src="/media/seed/altar.webp" alt="Altar" />
        </RevealImagen>
      </>,
    );

    const revealEl = container.children[0];
    const imagenEl = container.children[1];
    expect(revealEl).toHaveClass('opacity-100');
    expect(imagenEl.style.clipPath).toBe('inset(0 0 0 0)');
  });

  it('Reveal y RevealTitulo son visibles de inmediato si no existe IntersectionObserver', () => {
    const originalIO = window.IntersectionObserver;
    delete window.IntersectionObserver;
    restauradores.push(() => {
      window.IntersectionObserver = originalIO;
    });

    const { container } = render(
      <>
        <Reveal variante="izquierda">
          <p>Sin observador</p>
        </Reveal>
        <RevealTitulo as="h2">Título sin observador</RevealTitulo>
      </>,
    );

    expect(container.firstElementChild).toHaveClass('opacity-100');
    expect(screen.getByRole('heading', { level: 2, name: 'Título sin observador' })).toBeVisible();
  });

  it('RevealTitulo deja el texto accesible una sola vez en el árbol accesible', () => {
    const originalIO = window.IntersectionObserver;
    window.IntersectionObserver = class MockIntersectionObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    restauradores.push(() => {
      window.IntersectionObserver = originalIO;
    });

    render(<RevealTitulo as="h1">Parroquia Señor de la Exaltación</RevealTitulo>);

    const heading = screen.getByRole('heading', {
      level: 1,
      name: 'Parroquia Señor de la Exaltación',
    });
    expect(heading).toHaveAccessibleName('Parroquia Señor de la Exaltación');
    expect(heading.querySelectorAll('.sr-only')).toHaveLength(1);
    const bloquesOcultos = heading.querySelectorAll('[aria-hidden="true"]');
    expect(bloquesOcultos.length).toBeGreaterThanOrEqual(1);
  });

  it('Parallax no aplica transform en móvil ni con prefers-reduced-motion, y sí en escritorio', () => {
    // 1. Móvil (< 1024px)
    restauradores.push(
      simularMatchMedia({ '(min-width: 1024px)': false, '(prefers-reduced-motion: reduce)': false }),
    );
    const { container, unmount } = render(
      <Parallax>
        <img src="/media/seed/altar.webp" alt="" />
      </Parallax>,
    );
    expect(container.firstElementChild.firstElementChild.style.transform).toBe('');
    unmount();

    // 2. Escritorio con movimiento reducido
    restauradores.push(
      simularMatchMedia({ '(min-width: 1024px)': true, '(prefers-reduced-motion: reduce)': true }),
    );
    const resReducido = render(
      <Parallax>
        <img src="/media/seed/altar.webp" alt="" />
      </Parallax>,
    );
    expect(resReducido.container.firstElementChild.firstElementChild.style.transform).toBe('');
    resReducido.unmount();

    // 3. Escritorio normal (lg+)
    restauradores.push(
      simularMatchMedia({ '(min-width: 1024px)': true, '(prefers-reduced-motion: reduce)': false }),
    );
    const resDesktop = render(
      <Parallax>
        <img src="/media/seed/altar.webp" alt="" />
      </Parallax>,
    );
    expect(resDesktop.container.firstElementChild.firstElementChild.style.transform).toContain(
      'translate3d',
    );
  });
});
