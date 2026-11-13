import { describe, it, expect } from 'vitest';
import {
  aCamelCase,
  archivo,
  formatearFecha,
  formatearFechaHora,
  formatearHora,
  imagen,
  urlPublica,
} from '../../src/utils/formato.js';

const CDN = 'https://cdn.ejemplo.org/medios';

describe('formatearFechaHora', () => {
  it('convierte un Date a la hora de Bolivia con -04:00', () => {
    expect(formatearFechaHora(new Date('2026-11-14T15:00:00Z'))).toBe('2026-11-14T11:00:00-04:00');
  });

  it('acepta el texto ISO que PostgreSQL pone dentro de un json_agg', () => {
    expect(formatearFechaHora('2026-11-21T15:00:00+00:00')).toBe('2026-11-21T11:00:00-04:00');
  });

  it('cambia de día cuando corresponde en Bolivia', () => {
    expect(formatearFechaHora('2026-11-15T02:30:00Z')).toBe('2026-11-14T22:30:00-04:00');
    expect(formatearFechaHora('2027-01-01T03:59:59Z')).toBe('2026-12-31T23:59:59-04:00');
  });

  it('descarta los milisegundos', () => {
    expect(formatearFechaHora('2026-11-12T22:42:02.962Z')).toBe('2026-11-12T18:42:02-04:00');
  });

  it('respeta una fecha que ya viene en -04:00', () => {
    expect(formatearFechaHora('2026-11-14T11:00:00-04:00')).toBe('2026-11-14T11:00:00-04:00');
  });

  it('devuelve null si no hay fecha', () => {
    expect(formatearFechaHora(null)).toBeNull();
    expect(formatearFechaHora(undefined)).toBeNull();
  });

  it('lanza un error con una fecha inválida', () => {
    expect(() => formatearFechaHora('no es fecha')).toThrow(TypeError);
  });
});

describe('formatearFecha y formatearHora', () => {
  it('deja las fechas YYYY-MM-DD tal cual', () => {
    expect(formatearFecha('2026-11-01')).toBe('2026-11-01');
    expect(formatearFecha(null)).toBeNull();
    expect(() => formatearFecha(new Date())).toThrow(TypeError);
  });

  it('recorta las horas a HH:mm', () => {
    expect(formatearHora('07:00:00')).toBe('07:00');
    expect(formatearHora('19:30:00.000')).toBe('19:30');
    expect(formatearHora('18:45')).toBe('18:45');
    expect(formatearHora(null)).toBeNull();
    expect(() => formatearHora('7 de la noche')).toThrow(TypeError);
  });
});

describe('urlPublica', () => {
  it('deja tal cual las URL relativas del seed y las absolutas', () => {
    expect(urlPublica('/media/seed/crucifijo.webp', CDN)).toBe('/media/seed/crucifijo.webp');
    expect(urlPublica('https://otro.sitio/foto.jpg', CDN)).toBe('https://otro.sitio/foto.jpg');
  });

  it('antepone CDN_PUBLIC_URL a la clave de un archivo subido', () => {
    expect(urlPublica('sedes/senor-de-la-exaltacion/2026/11/foto.webp', CDN)).toBe(
      'https://cdn.ejemplo.org/medios/sedes/senor-de-la-exaltacion/2026/11/foto.webp',
    );
  });

  it('devuelve null sin URL, o con una clave y sin CDN configurado', () => {
    expect(urlPublica(null, CDN)).toBeNull();
    expect(urlPublica('', CDN)).toBeNull();
    expect(urlPublica('sedes/x.webp', null)).toBeNull();
  });
});

describe('imagen', () => {
  it('arma el objeto imagen estándar', () => {
    expect(
      imagen(
        {
          id: 2,
          url: '/media/seed/crucifijo.webp',
          textoAlternativo: 'Crucifijo en el interior del templo parroquial',
          ancho: 1888,
          alto: 1059,
        },
        CDN,
      ),
    ).toEqual({
      id: 2,
      url: '/media/seed/crucifijo.webp',
      textoAlternativo: 'Crucifijo en el interior del templo parroquial',
      ancho: 1888,
      alto: 1059,
    });
  });

  it('completa con null los campos que faltan', () => {
    expect(imagen({ url: '/media/seed/exterior-parroquia.webp' }, CDN)).toEqual({
      id: null,
      url: '/media/seed/exterior-parroquia.webp',
      textoAlternativo: null,
      ancho: null,
      alto: null,
    });
  });

  it('devuelve null si no hay imagen, nunca un objeto vacío', () => {
    expect(imagen({ id: null, url: null }, CDN)).toBeNull();
    expect(imagen(undefined, CDN)).toBeNull();
  });
});

describe('archivo', () => {
  it('arma el objeto archivo con la URL pública del bucket', () => {
    expect(
      archivo(
        {
          id: 7,
          url: 'sedes/senor-de-la-exaltacion/2026/10/boletin.pdf',
          nombreOriginal: 'Boletín octubre 2026.pdf',
          tipoMime: 'application/pdf',
          tamanoBytes: 2516582,
        },
        CDN,
      ),
    ).toEqual({
      id: 7,
      url: 'https://cdn.ejemplo.org/medios/sedes/senor-de-la-exaltacion/2026/10/boletin.pdf',
      nombreOriginal: 'Boletín octubre 2026.pdf',
      tipoMime: 'application/pdf',
      tamanoBytes: 2516582,
    });
  });

  it('devuelve null si no hay archivo', () => {
    expect(archivo({ url: null }, CDN)).toBeNull();
    expect(archivo(undefined, CDN)).toBeNull();
  });
});

describe('aCamelCase', () => {
  it('traduce las claves anidadas y deja los valores intactos', () => {
    expect(
      aCamelCase({
        color_primario: '#231F20',
        texto_barra_superior: 'Hoy, sábado: Santa Misa 7:00',
        horarios_notas: { confesiones_adoracion: 'Previo a cada misa', secretaria: 'Trámites' },
        lista_de_cosas: [{ clave_interna: 'valor_con_guion_bajo' }, 'texto_suelto'],
        nulo: null,
      }),
    ).toEqual({
      colorPrimario: '#231F20',
      textoBarraSuperior: 'Hoy, sábado: Santa Misa 7:00',
      horariosNotas: { confesionesAdoracion: 'Previo a cada misa', secretaria: 'Trámites' },
      listaDeCosas: [{ claveInterna: 'valor_con_guion_bajo' }, 'texto_suelto'],
      nulo: null,
    });
  });

  it('devuelve un objeto vacío sin cambios', () => {
    expect(aCamelCase({})).toEqual({});
  });
});
