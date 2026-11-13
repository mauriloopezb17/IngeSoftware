import { describe, it, expect } from 'vitest';
import {
  ESTADOS_PUBLICACION,
  ROLES,
  TIPOS_PUBLICACION,
  TIPOS_SEDE,
} from '../../src/constantes/catalogos.js';

describe('catálogos de códigos', () => {
  it('traduce el código de la API al nombre de la base y al revés', () => {
    expect(ESTADOS_PUBLICACION.nombreDe('EN_REVISION')).toBe('En revisión');
    expect(ESTADOS_PUBLICACION.codigoDe('En revisión')).toBe('EN_REVISION');
    expect(TIPOS_PUBLICACION.codigoDe('Nota de prensa')).toBe('NOTA_DE_PRENSA');
    expect(ROLES.codigoDe('Párroco')).toBe('PARROCO');
  });

  it('arma el objeto { codigo, nombre } de las respuestas', () => {
    expect(TIPOS_SEDE.aEnumeracion('Parroquia')).toEqual({
      codigo: 'PARROQUIA',
      nombre: 'Parroquia',
    });
  });

  it('expone los códigos en el orden del contrato', () => {
    expect(ESTADOS_PUBLICACION.codigos).toEqual([
      'BORRADOR',
      'EN_REVISION',
      'PUBLICADO',
      'ARCHIVADO',
    ]);
    expect(TIPOS_PUBLICACION.codigos).toEqual(['AVISO', 'NOTICIA', 'NOTA_DE_PRENSA']);
  });

  it('falla con un error claro ante un código o un nombre desconocido', () => {
    expect(() => ESTADOS_PUBLICACION.nombreDe('PENDIENTE')).toThrow(
      'Código de estado de publicación desconocido: PENDIENTE',
    );
    expect(() => TIPOS_SEDE.codigoDe('Santuario')).toThrow(
      'Nombre de tipo de sede sin código en la API: Santuario',
    );
  });

  it('no se puede modificar', () => {
    expect(Object.isFrozen(ROLES)).toBe(true);
    expect(Object.isFrozen(ROLES.nombres)).toBe(true);
  });
});
