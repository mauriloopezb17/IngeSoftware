import { describe, expect, it } from 'vitest';

import { erroresDe, resumenDeErrores } from './erroresFormulario.js';

const MAPA_PUBLICACION = {
  titulo: 'titulo',
  resumen: 'resumen',
  contenido: 'contenido',
  'contenido.bloques': 'contenido',
};

describe('erroresFormulario', () => {
  it('agrupa múltiples errores de contenido.bloques.* en un solo mensaje claro con el número de párrafos', () => {
    const detalles = Array.from({ length: 9 }, (_, i) => ({
      campo: `contenido.bloques.${i}.props.textColor`,
      mensaje: 'Debe ser uno de: default, gray, brown, red, orange, yellow, green, blue, purple, pink.',
    }));
    // Un segundo error en el mismo bloque 0 no infla la cuenta de párrafos.
    detalles.push({
      campo: 'contenido.bloques.0.content.0.styles.textColor',
      mensaje: 'Debe ser uno de: default, gray, brown, red, orange, yellow, green, blue, purple, pink.',
    });

    const { errores, generales } = erroresDe({ detalles }, MAPA_PUBLICACION);

    expect(errores.contenido).toBe(
      'El contenido tiene formato que no se puede guardar en 9 párrafos (por ejemplo, colores copiados de otra página). Quita el formato y vuelve a intentarlo.',
    );
    expect(generales).toEqual([]);
    expect(resumenDeErrores(errores, generales)).toEqual([errores.contenido]);
  });

  it('usa singular cuando hay un solo párrafo con formato inválido', () => {
    const { errores } = erroresDe(
      {
        detalles: [{ campo: 'contenido.bloques.2.props.backgroundColor', mensaje: 'Debe ser uno de: ...' }],
      },
      MAPA_PUBLICACION,
    );

    expect(errores.contenido).toContain('en 1 párrafo ');
  });

  it('elimina mensajes duplicados en generales y en el resumen', () => {
    const { errores, generales } = erroresDe(
      {
        detalles: [
          { campo: 'titulo', mensaje: 'El título es obligatorio.' },
          { campo: 'titulo', mensaje: 'El título es obligatorio.' },
          { campo: 'resumen', mensaje: 'Texto inválido.' },
          { campo: 'otro', mensaje: 'Texto inválido.' },
          { campo: 'desconocido', mensaje: 'Error repetido.' },
          { campo: 'desconocido2', mensaje: 'Error repetido.' },
        ],
      },
      MAPA_PUBLICACION,
    );

    expect(errores).toEqual({ titulo: 'El título es obligatorio.', resumen: 'Texto inválido.' });
    expect(generales).toEqual(['Error repetido.']);
    expect(resumenDeErrores(errores, generales)).toEqual([
      'El título es obligatorio.',
      'Texto inválido.',
      'Error repetido.',
    ]);
  });

  it('deduplica el resumen cuando dos campos distintos comparten el mismo mensaje', () => {
    const { errores, generales } = erroresDe(
      {
        detalles: [
          { campo: 'contrayente1', mensaje: 'El nombre es obligatorio.' },
          { campo: 'contrayente2', mensaje: 'El nombre es obligatorio.' },
        ],
      },
      { contrayente1: 'contrayente1', contrayente2: 'contrayente2' },
    );

    expect(errores).toEqual({
      contrayente1: 'El nombre es obligatorio.',
      contrayente2: 'El nombre es obligatorio.',
    });
    expect(resumenDeErrores(errores, generales)).toEqual(['El nombre es obligatorio.']);
  });

  it('agrupa errores de bloques dentro de detalle.contenido y resuelve prefijos de programa y enlaces', () => {
    const { errores, generales } = erroresDe(
      {
        detalles: [
          { campo: 'detalle.contenido.bloques.0.content.0.styles.textColor', mensaje: 'Estilo no permitido.' },
          { campo: 'detalle.contenido.bloques.2.props.textColor', mensaje: 'Estilo no permitido.' },
          { campo: 'detalle.programa.1.hora', mensaje: 'Formato HH:MM inválido.' },
          { campo: 'detalle.enlaces.0.url', mensaje: 'URL https:// inválida.' },
        ],
      },
      {
        'detalle.contenido': 'contenido',
        'detalle.programa': 'programa',
        'detalle.enlaces': 'enlaces',
      },
    );

    expect(errores.contenido).toContain('2 párrafos');
    expect(errores.programa).toBe('Formato HH:MM inválido.');
    expect(errores.enlaces).toBe('URL https:// inválida.');
    expect(generales).toEqual([]);
  });
});
