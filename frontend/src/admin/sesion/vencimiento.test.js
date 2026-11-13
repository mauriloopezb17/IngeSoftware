import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { estadoDeSesion, formatearHora, formatearRestante, MINUTOS_DE_AVISO, useEstadoDeSesion } from './vencimiento.js';

const MIN = 60 * 1000;
const ahora = new Date('2026-11-12T12:00:00-04:00').getTime();
const en = (ms) => new Date(ahora + ms).toISOString();

describe('estadoDeSesion', () => {
  it('está activa mientras falte más que la ventana de aviso', () => {
    expect(estadoDeSesion(en(6 * MIN), ahora)).toEqual({ estado: 'activa', restanteMs: 6 * MIN });
    expect(estadoDeSesion(en(8 * 60 * MIN), ahora).estado).toBe('activa');
  });

  it('avisa dentro de los últimos minutos (el límite entra en la ventana)', () => {
    expect(estadoDeSesion(en(MINUTOS_DE_AVISO * MIN), ahora).estado).toBe('por-vencer');
    expect(estadoDeSesion(en(30 * 1000), ahora)).toEqual({ estado: 'por-vencer', restanteMs: 30 * 1000 });
  });

  it('está vencida al llegar a la hora (y después)', () => {
    expect(estadoDeSesion(en(0), ahora)).toEqual({ estado: 'vencida', restanteMs: 0 });
    expect(estadoDeSesion(en(-5 * MIN), ahora).estado).toBe('vencida');
  });

  it('sin una fecha válida no avisa (la API responde 401 cuando venza de verdad)', () => {
    for (const expiraEn of [undefined, null, '', 'mañana']) {
      expect(estadoDeSesion(expiraEn, ahora).estado).toBe('activa');
    }
  });

  it('acepta la fecha con el desfase de Bolivia que manda la API', () => {
    expect(estadoDeSesion('2026-11-12T12:03:00-04:00', ahora).estado).toBe('por-vencer');
  });
});

describe('formatos', () => {
  it('formatearHora usa la hora de Bolivia, sin importar la zona del navegador', () => {
    expect(formatearHora('2026-11-12T16:31:05-04:00')).toBe('16:31');
    expect(formatearHora('2026-11-12T20:31:05Z')).toBe('16:31');
  });

  it('formatearRestante', () => {
    expect(formatearRestante(272_000)).toBe('4 min 32 s');
    expect(formatearRestante(300_000)).toBe('5 min 00 s');
    expect(formatearRestante(45_000)).toBe('45 s');
    expect(formatearRestante(1)).toBe('1 s');
    expect(formatearRestante(-10)).toBe('0 s');
  });
});

describe('useEstadoDeSesion', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    vi.setSystemTime(ahora);
  });
  afterEach(() => vi.useRealTimers());

  it('pasa de activa a por-vencer y a vencida sin intervención, sin despertar cada segundo antes del aviso', () => {
    const { result } = renderHook(() => useEstadoDeSesion(en(10 * MIN)));
    expect(result.current.estado).toBe('activa');
    // Antes del aviso solo hay un temporizador pendiente.
    expect(vi.getTimerCount()).toBe(1);

    act(() => vi.advanceTimersByTime(4 * MIN + 59 * 1000));
    expect(result.current.estado).toBe('activa');

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.estado).toBe('por-vencer');
    expect(result.current.restanteMs).toBe(5 * MIN);

    // Dentro de la ventana la cuenta atrás avanza cada segundo.
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.restanteMs).toBe(5 * MIN - 3000);

    act(() => vi.advanceTimersByTime(5 * MIN));
    expect(result.current.estado).toBe('vencida');
    // Vencida: no queda nada programado.
    expect(vi.getTimerCount()).toBe(0);
  });

  it('con la sesión ya por vencer o vencida al montar, lo informa de inmediato', () => {
    expect(renderHook(() => useEstadoDeSesion(en(2 * MIN))).result.current.estado).toBe('por-vencer');
    expect(renderHook(() => useEstadoDeSesion(en(-1))).result.current.estado).toBe('vencida');
  });

  it('al renovar la sesión (nueva fecha) vuelve a estar activa y reprograma el aviso', () => {
    const { result, rerender } = renderHook(({ expiraEn }) => useEstadoDeSesion(expiraEn), {
      initialProps: { expiraEn: en(2 * MIN) },
    });
    expect(result.current.estado).toBe('por-vencer');

    rerender({ expiraEn: en(8 * 60 * MIN) });
    expect(result.current.estado).toBe('activa');
    expect(vi.getTimerCount()).toBe(1);
  });

  it('al desmontar no deja temporizadores', () => {
    const { unmount } = renderHook(() => useEstadoDeSesion(en(10 * MIN)));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
