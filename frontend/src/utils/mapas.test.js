import { describe, expect, it } from 'vitest';

import { enlaceComoLlegar, enlaceVerEnMapa, urlMapaIncrustado } from './mapas.js';

describe('utilidades de mapas', () => {
  const sedeConCoordenadas = {
    nombre: 'Parroquia Señor de la Exaltación',
    direccion: 'Av. Héctor Ormachea N.º 167, Obrajes, La Paz',
    ubicacion: {
      latitud: -16.526795,
      longitud: -68.108216,
    },
    configuracion: {},
  };

  describe('enlaceComoLlegar', () => {
    it('construye el enlace de ruta sin origin ni travelmode usando las coordenadas', () => {
      expect(enlaceComoLlegar(sedeConCoordenadas)).toBe(
        'https://www.google.com/maps/dir/?api=1&destination=-16.526795,-68.108216',
      );
    });

    it('ignora origin y travelmode cuando usa un enlace guardado sin coordenadas', () => {
      const sedeSinCoords = {
        nombre: 'Capilla San Pablo',
        ubicacion: null,
        configuracion: {
          enlaceComoLlegar:
            'https://www.google.com/maps/dir/?api=1&origin=Plaza+Murillo&destination=-16.52,-68.11&travelmode=driving',
        },
      };

      const resultado = enlaceComoLlegar(sedeSinCoords);
      expect(resultado).not.toContain('origin=');
      expect(resultado).not.toContain('travelmode=');
      expect(resultado).toContain('destination=-16.52%2C-68.11');
    });

    it('acepta enlaceComoLlegar en la raíz del objeto comunidad', () => {
      const comunidad = {
        nombre: 'Capilla San Pablo',
        enlaceComoLlegar:
          'https://www.google.com/maps/dir/?api=1&origin=Zona+Sur&destination=-16.53,-68.10',
      };

      const resultado = enlaceComoLlegar(comunidad);
      expect(resultado).not.toContain('origin=');
      expect(resultado).toContain('destination=-16.53%2C-68.10');
    });

    it('devuelve null cuando no hay coordenadas ni enlace guardado', () => {
      expect(enlaceComoLlegar({ nombre: 'Sin ubicación' })).toBeNull();
      expect(enlaceComoLlegar(null)).toBeNull();
    });
  });

  describe('enlaceVerEnMapa', () => {
    it('construye el enlace de búsqueda con las coordenadas de la sede', () => {
      expect(enlaceVerEnMapa(sedeConCoordenadas)).toBe(
        'https://www.google.com/maps/search/?api=1&query=-16.526795,-68.108216',
      );
    });

    it('devuelve null si faltan las coordenadas', () => {
      expect(enlaceVerEnMapa({ nombre: 'Sin ubicación', ubicacion: null })).toBeNull();
      expect(enlaceVerEnMapa(null)).toBeNull();
    });
  });

  describe('urlMapaIncrustado', () => {
    it('construye la URL de embed sin clave de API a partir de las coordenadas', () => {
      expect(urlMapaIncrustado(sedeConCoordenadas)).toBe(
        'https://maps.google.com/maps?q=-16.526795,-68.108216&z=17&hl=es&output=embed',
      );
    });

    it('da prioridad a configuracion.urlMapaEmbed cuando existe', () => {
      const sedeConEmbed = {
        ...sedeConCoordenadas,
        configuracion: {
          urlMapaEmbed: 'https://www.google.com/maps/embed?pb=personalizado',
        },
      };

      expect(urlMapaIncrustado(sedeConEmbed)).toBe(
        'https://www.google.com/maps/embed?pb=personalizado',
      );
    });

    it('devuelve null cuando no hay urlMapaEmbed ni coordenadas', () => {
      expect(urlMapaIncrustado({ nombre: 'Sin mapa', ubicacion: null })).toBeNull();
      expect(urlMapaIncrustado(null)).toBeNull();
    });
  });
});
