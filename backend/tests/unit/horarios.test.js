import { describe, it, expect } from 'vitest';
import { agruparHorarios, etiquetaDias } from '../../src/services/horarios.service.js';

describe('etiquetaDias', () => {
  it.each([
    [[1], 'Lunes'],
    [[6], 'Sábado'],
    [[7], 'Domingo'],
    [[1, 2, 3, 4, 5], 'Lunes a viernes'],
    [[1, 2, 3, 4, 5, 6, 7], 'Lunes a domingo'],
    [[3, 4, 5], 'Miércoles a viernes'],
    [[2, 4], 'Martes y jueves'],
    [[1, 3, 5], 'Lunes, miércoles y viernes'],
    [[6, 7], 'Sábado y domingo'],
    [[1, 2, 3, 5], 'Lunes a miércoles y viernes'],
    [[1, 3, 4, 5, 7], 'Lunes, miércoles a viernes y domingo'],
  ])('%j -> %s', (dias, etiqueta) => {
    expect(etiquetaDias(dias)).toBe(etiqueta);
  });
});

// Fila tal como la devuelve models/horarios.model.js.
const fila = (tipoId, tipoNombre, dia, inicio, fin = null, descripcion = null) => ({
  tipo_id: tipoId,
  tipo_nombre: tipoNombre,
  dia_semana: dia,
  hora_inicio: inicio,
  hora_fin: fin,
  descripcion,
});

describe('agruparHorarios', () => {
  it('une los días con exactamente los mismos horarios', () => {
    const filas = [1, 2, 3, 4, 5].flatMap((dia) => [
      fila(1, 'Santa Misa', dia, '07:00:00'),
      fila(1, 'Santa Misa', dia, '19:00:00'),
    ]);
    filas.push(
      fila(1, 'Santa Misa', 6, '07:00:00'),
      fila(1, 'Santa Misa', 6, '18:00:00', null, 'Misa vespertina dominical'),
    );

    expect(agruparHorarios(filas)).toEqual([
      {
        tipo: { id: 1, nombre: 'Santa Misa' },
        filas: [
          {
            dias: [1, 2, 3, 4, 5],
            etiqueta: 'Lunes a viernes',
            horarios: [
              { horaInicio: '07:00', horaFin: null, descripcion: null },
              { horaInicio: '19:00', horaFin: null, descripcion: null },
            ],
          },
          {
            dias: [6],
            etiqueta: 'Sábado',
            horarios: [
              { horaInicio: '07:00', horaFin: null, descripcion: null },
              { horaInicio: '18:00', horaFin: null, descripcion: 'Misa vespertina dominical' },
            ],
          },
        ],
      },
    ]);
  });

  it('separa días cuyo horario difiere solo en la hora de fin o la descripción', () => {
    const resultado = agruparHorarios([
      fila(4, 'Secretaría', 1, '09:00:00', '12:00:00'),
      fila(4, 'Secretaría', 2, '09:00:00', '12:30:00'),
      fila(4, 'Secretaría', 3, '09:00:00', '12:00:00', 'Solo trámites'),
    ]);

    expect(resultado[0].filas.map((f) => f.dias)).toEqual([[1], [2], [3]]);
  });

  it('une días no consecutivos con el mismo horario en una sola fila', () => {
    const resultado = agruparHorarios([
      fila(2, 'Confesiones', 2, '18:00:00', '18:45:00'),
      fila(2, 'Confesiones', 3, '10:00:00', '11:00:00'),
      fila(2, 'Confesiones', 4, '18:00:00', '18:45:00'),
    ]);

    expect(resultado[0].filas).toEqual([
      {
        dias: [2, 4],
        etiqueta: 'Martes y jueves',
        horarios: [{ horaInicio: '18:00', horaFin: '18:45', descripcion: null }],
      },
      {
        dias: [3],
        etiqueta: 'Miércoles',
        horarios: [{ horaInicio: '10:00', horaFin: '11:00', descripcion: null }],
      },
    ]);
  });

  it('ordena los horarios del día por hora de inicio', () => {
    const resultado = agruparHorarios([
      fila(1, 'Santa Misa', 7, '19:00:00'),
      fila(1, 'Santa Misa', 7, '08:00:00'),
      fila(1, 'Santa Misa', 7, '12:00:00'),
    ]);

    expect(resultado[0].filas[0].horarios.map((h) => h.horaInicio)).toEqual([
      '08:00',
      '12:00',
      '19:00',
    ]);
  });

  it('mantiene los tipos en el orden recibido y no inventa grupos vacíos', () => {
    const resultado = agruparHorarios([
      fila(1, 'Santa Misa', 7, '08:00:00'),
      fila(3, 'Adoración', 4, '19:30:00', '20:30:00'),
    ]);

    expect(resultado.map((grupo) => grupo.tipo)).toEqual([
      { id: 1, nombre: 'Santa Misa' },
      { id: 3, nombre: 'Adoración' },
    ]);
  });

  it('devuelve una lista vacía si no hay horarios', () => {
    expect(agruparHorarios([])).toEqual([]);
  });
});
