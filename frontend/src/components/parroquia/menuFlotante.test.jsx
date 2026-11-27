import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderConQuery } from '../../test/utilidadesQuery.jsx';
import MenuFlotante from './MenuFlotante.jsx';

function simularMatchMedia(esEscritorio) {
  window.matchMedia = vi.fn().mockImplementation((consulta) => ({
    matches: esEscritorio && consulta === '(min-width: 1024px)',
    media: consulta,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

describe('MenuFlotante de accesos rápidos', () => {
  let originalMatchMedia;
  let originalIntersectionObserver;
  let originalRaf;
  let observadorCallback;
  let tarjetaDummy;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    originalIntersectionObserver = window.IntersectionObserver;
    originalRaf = window.requestAnimationFrame;

    window.requestAnimationFrame = (cb) => {
      cb(0);
      return 1;
    };
    window.cancelAnimationFrame = vi.fn();

    observadorCallback = null;
    window.IntersectionObserver = class {
      constructor(cb) {
        observadorCallback = cb;
      }
      observe() {}
      disconnect() {}
    };

    tarjetaDummy = document.createElement('div');
    tarjetaDummy.setAttribute('data-portada-tarjetas', '');
    document.body.appendChild(tarjetaDummy);
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true });
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    window.IntersectionObserver = originalIntersectionObserver;
    window.requestAnimationFrame = originalRaf;
    tarjetaDummy?.remove();
  });

  it('no se monta en móvil o tableta (< 1024 px)', async () => {
    simularMatchMedia(false);
    renderConQuery(<MenuFlotante />);

    await act(async () => {});
    expect(screen.queryByRole('navigation', { name: 'Accesos rápidos' })).not.toBeInTheDocument();
  });

  it('aparece al salir las tarjetas de vista, despliega con clic y cierra con Escape o clic fuera', async () => {
    simularMatchMedia(true);
    const usuario = userEvent.setup();
    renderConQuery(<MenuFlotante />);

    await waitFor(() => expect(observadorCallback).toBeTypeOf('function'));
    const navOculto = screen.getByRole('navigation', { hidden: true });
    expect(navOculto).toHaveAttribute('aria-hidden', 'true');

    act(() => {
      observadorCallback([{ isIntersecting: false }]);
    });
    const nav = screen.getByRole('navigation', { name: 'Accesos rápidos' });
    expect(nav).toHaveAttribute('aria-hidden', 'false');
    const boton = screen.getByRole('button', { name: 'Accesos' });
    expect(boton).toHaveAttribute('aria-expanded', 'false');

    await usuario.click(boton);
    expect(boton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'Ir a Noticias' })).toHaveAttribute('href', '/noticias');
    expect(screen.getByRole('link', { name: 'Ir a Calendario' })).toBeInTheDocument();

    // Escape pliega y devuelve el foco al botón
    await usuario.keyboard('{Escape}');
    expect(boton).toHaveAttribute('aria-expanded', 'false');
    expect(boton).toHaveFocus();

    // Clic fuera pliega el menú
    await usuario.click(boton);
    expect(boton).toHaveAttribute('aria-expanded', 'true');
    fireEvent.mouseDown(document.body);
    expect(boton).toHaveAttribute('aria-expanded', 'false');
  });

  it('permite recorrer los accesos con las flechas del teclado', async () => {
    simularMatchMedia(true);
    const usuario = userEvent.setup();
    renderConQuery(<MenuFlotante />);

    await waitFor(() => expect(observadorCallback).toBeTypeOf('function'));
    act(() => {
      observadorCallback([{ isIntersecting: false }]);
    });
    const boton = screen.getByRole('button', { name: 'Accesos' });

    await usuario.click(boton);
    const enlaceNoticias = screen.getByRole('link', { name: 'Ir a Noticias' });
    const enlaceSacramentos = screen.getByRole('link', { name: 'Ir a Sacramentos' });
    const enlaceProclamas = screen.getByRole('link', { name: 'Ir a Proclamas' });

    enlaceNoticias.focus();
    expect(enlaceNoticias).toHaveFocus();

    await usuario.keyboard('{ArrowDown}');
    expect(enlaceSacramentos).toHaveFocus();

    await usuario.keyboard('{End}');
    expect(enlaceProclamas).toHaveFocus();

    await usuario.keyboard('{Home}');
    expect(enlaceNoticias).toHaveFocus();
  });

  it('se oculta al hacer scroll hacia abajo y reaparece al subir', async () => {
    simularMatchMedia(true);
    renderConQuery(<MenuFlotante />);

    await waitFor(() => expect(observadorCallback).toBeTypeOf('function'));

    act(() => {
      window.scrollY = 700;
      observadorCallback([{ isIntersecting: false }]);
    });
    const nav = screen.getByRole('navigation', { name: 'Accesos rápidos' });
    expect(nav).toHaveAttribute('aria-hidden', 'false');

    // Bajar más de 8 px oculta la barra
    act(() => {
      window.scrollY = 850;
      window.dispatchEvent(new Event('scroll'));
    });
    expect(nav).toHaveAttribute('aria-hidden', 'true');

    // Subir más de 8 px la vuelve a mostrar
    act(() => {
      window.scrollY = 780;
      window.dispatchEvent(new Event('scroll'));
    });
    expect(nav).toHaveAttribute('aria-hidden', 'false');
  });
});
