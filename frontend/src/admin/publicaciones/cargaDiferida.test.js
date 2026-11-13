import { describe, expect, it } from 'vitest';

// BlockNote es pesado: solo debe descargarse al abrir el formulario de una publicación, no con el resto del
// panel (/admin/inicio) ni con el portal. Se comprueba el código fuente: el editor se importa con import()
// dentro de un React.lazy, y nada fuera de editor/ importa BlockNote ni el módulo del editor de forma estática.
const fuentes = import.meta.glob(['./**/*.js', './**/*.jsx', '!./**/*.test.{js,jsx}'], {
  query: '?raw',
  import: 'default',
  eager: true,
});

const fuera = Object.entries(fuentes).filter(([ruta]) => !ruta.startsWith('./editor/'));
const dentro = Object.entries(fuentes).filter(([ruta]) => ruta.startsWith('./editor/'));

describe('carga diferida del editor', () => {
  it('encuentra los archivos que debe revisar', () => {
    expect(fuera.length).toBeGreaterThan(5);
    expect(dentro.map(([ruta]) => ruta).sort()).toEqual(['./editor/EditorContenido.jsx', './editor/esquema.js']);
  });

  it('el formulario importa el editor con import() dentro de un React.lazy', () => {
    const formulario = fuentes['./FormularioPublicacion.jsx'];

    expect(formulario).toMatch(/const EditorContenido = lazy\(\(\) => import\('\.\/editor\/EditorContenido\.jsx'\)\)/);
  });

  it('ningún archivo fuera de editor/ importa BlockNote', () => {
    for (const [ruta, codigo] of fuera) expect(codigo, ruta).not.toMatch(/@blocknote/);
  });

  it('ningún archivo fuera de editor/ importa el editor ni su esquema de forma estática', () => {
    for (const [ruta, codigo] of fuera) {
      const importaEstatico = /^\s*import[^(\n]*from\s+['"][^'"]*\/editor\//m.test(codigo);
      expect(importaEstatico, ruta).toBe(false);
    }
  });

  it('el índice de las pantallas de publicaciones no arrastra el editor', () => {
    expect(fuentes['./pantallas.jsx']).not.toMatch(/editor\//);
    expect(fuentes['./Publicaciones.jsx']).not.toMatch(/editor\//);
  });
});
