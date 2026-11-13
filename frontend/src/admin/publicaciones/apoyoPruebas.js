// Apoyo para las pruebas que montan el editor real (BlockNote usa Mantine): jsdom no trae algunas
// APIs del navegador que Mantine y ProseMirror consultan. Solo lo usan las pruebas.
export function prepararEditorEnJsdom() {
  window.matchMedia ??= (consulta) => ({
    matches: false,
    media: consulta,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  });

  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  window.HTMLElement.prototype.scrollIntoView ??= () => {};
  document.elementFromPoint ??= () => null;
  document.elementsFromPoint ??= () => [];
  // El menú «/» llama a getBoundingClientRect().toJSON(), que jsdom no trae.
  const medir = Element.prototype.getBoundingClientRect;
  if (!medir.conToJSON) {
    Element.prototype.getBoundingClientRect = function getBoundingClientRect() {
      const caja = medir.call(this);
      return typeof caja.toJSON === 'function' ? caja : { ...caja, toJSON: () => ({ ...caja }) };
    };
    Element.prototype.getBoundingClientRect.conToJSON = true;
  }
  for (const Prototipo of [Range.prototype, Text.prototype]) {
    Prototipo.getBoundingClientRect ??= () => ({ x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0 });
    Prototipo.getClientRects ??= () => [];
  }
}
