import { describe, expect, it } from 'vitest';
import {
  BOM_UTF8,
  escaparCeldaCsv,
  fechaActualBolivia,
  formatearCeldaCsv,
  formatearFechaBoliviaCsv,
  formatearFechaHoraBoliviaCsv,
  generarCsv,
  protegerFormulaCsv,
} from '../../src/utils/csv.js';

describe('utils/csv', () => {
  it('incluye BOM UTF-8, separador ; y saltos CRLF', () => {
    const csv = generarCsv(
      [
        { encabezado: 'ID', valor: (f) => f.id },
        { encabezado: 'Título', valor: (f) => f.titulo },
      ],
      [{ id: 1, titulo: 'Misa dominical' }],
    );

    expect(csv.startsWith(BOM_UTF8)).toBe(true);
    expect(csv).toBe(`${BOM_UTF8}ID;Título\r\n1;Misa dominical\r\n`);
  });

  it('escapa comillas dobles, separadores ; y saltos de línea', () => {
    expect(escaparCeldaCsv('Hola; "mundo"')).toBe('"Hola; ""mundo"""');
    expect(escaparCeldaCsv('Línea 1\nLínea 2')).toBe('"Línea 1\nLínea 2"');
    expect(escaparCeldaCsv('Simple')).toBe('Simple');
  });

  it('protege celdas que empiezan con =, +, -, @, tab o CR contra inyección de fórmulas', () => {
    expect(protegerFormulaCsv('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)");
    expect(protegerFormulaCsv('+123')).toBe("'+123");
    expect(protegerFormulaCsv('-123')).toBe("'-123");
    expect(protegerFormulaCsv('@cmd')).toBe("'@cmd");
    expect(protegerFormulaCsv('\tcmd')).toBe("'\tcmd");
    expect(protegerFormulaCsv('\rcmd')).toBe("'\rcmd");
    expect(escaparCeldaCsv('=1+1;2')).toBe('"\'=1+1;2"');
  });

  it('formatea booleanos, nulos, arreglos y fechas en hora de Bolivia (UTC-4)', () => {
    expect(formatearCeldaCsv(null)).toBe('');
    expect(formatearCeldaCsv(undefined)).toBe('');
    expect(formatearCeldaCsv(true)).toBe('Sí');
    expect(formatearCeldaCsv(false)).toBe('No');
    expect(formatearCeldaCsv(['Aviso', 'Feria'])).toBe('Aviso, Feria');

    // 2026-11-14T15:00:00Z -> 2026-11-14 11:00:00 en Bolivia (-04:00)
    expect(formatearFechaHoraBoliviaCsv(new Date('2026-11-14T15:00:00Z'))).toBe(
      '2026-11-14 11:00:00',
    );
    expect(formatearFechaBoliviaCsv('2026-11-14')).toBe('2026-11-14');
    expect(fechaActualBolivia(new Date('2026-11-15T02:00:00Z'))).toBe('2026-11-14');
  });
});
