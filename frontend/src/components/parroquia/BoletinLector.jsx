import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, ExternalLink, Minus, Plus, RotateCw, X } from 'lucide-react';
import 'pdfjs-dist/web/pdf_viewer.css';

import { descargarBoletinPdf } from '../../utils/boletines.js';
import { formatearPeriodoMes } from '../../utils/formatoPortal.js';
import { cargarPdfJs } from '../../utils/pdfJs.js';
import { prefiereMovimientoReducido } from '../portal/observadorCompartido.js';

// Tamaño de la página respecto del ancho disponible del lector: 100 % = la hoja ocupa todo el ancho.
const NIVELES_ZOOM = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];
const ZOOM_MIN = NIVELES_ZOOM[0];
const ZOOM_MAX = NIVELES_ZOOM[NIVELES_ZOOM.length - 1];
const ANCHO_INICIAL = 640;
// Tope de píxeles por lienzo: los celulares fallan al dibujar lienzos más grandes (~16 MP).
const PIXELES_MAXIMOS_LIENZO = 16_000_000;

function etiquetaZoom(nivel) {
  return `${Math.round(nivel * 100)} %`;
}

function obtenerElementosFocables(contenedor) {
  if (!contenedor) return [];
  return Array.from(
    contenedor.querySelectorAll(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => !el.hasAttribute('hidden'));
}

function HojaPdf({
  pdfDoc,
  pdfjs,
  numeroPagina,
  debeRenderizar,
  anchoBase,
  zoom,
  registrarNodo,
}) {
  const hojaRef = useRef(null);
  const canvasRef = useRef(null);
  const textoRef = useRef(null);
  // El ancho de la hoja siempre es "ancho disponible × zoom"; el alto sale de la proporción de la
  // página (A4 hasta conocerla). Así las hojas aún no dibujadas no ensanchan el visor.
  const [proporcion, setProporcion] = useState(297 / 210);
  const anchoHoja = Math.round((anchoBase || ANCHO_INICIAL) * zoom);
  const altoHoja = Math.round(anchoHoja * proporcion);
  const [dibujada, setDibujada] = useState(false);
  const [enlaces, setEnlaces] = useState([]);

  useEffect(() => {
    registrarNodo(numeroPagina, hojaRef.current);
    return () => registrarNodo(numeroPagina, null);
  }, [numeroPagina, registrarNodo]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const capaTexto = textoRef.current;

    if (!debeRenderizar || !pdfDoc || !canvas || !capaTexto) {
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
      }
      if (capaTexto) {
        capaTexto.replaceChildren();
      }
      setDibujada(false);
      setEnlaces([]);
      return undefined;
    }

    let cancelado = false;
    let tareaRender = null;
    let capaTextoInstancia = null;

    async function dibujar() {
      try {
        const pagina = await pdfDoc.getPage(numeroPagina);
        if (cancelado) return;

        const viewportBase = pagina.getViewport({ scale: 1 });
        const anchoDisponible = anchoBase || ANCHO_INICIAL;
        const escalaFinal = Math.max(0.1, (anchoDisponible / viewportBase.width) * zoom);
        const viewport = pagina.getViewport({ scale: escalaFinal });

        setProporcion(viewportBase.height / viewportBase.width);

        // Nitidez según la pantalla, sin pasar el tope de píxeles del lienzo al acercar mucho.
        const dprPantalla = Math.min(window.devicePixelRatio || 1, 2);
        const dprMaximo = Math.sqrt(PIXELES_MAXIMOS_LIENZO / (viewport.width * viewport.height));
        const dpr = Math.max(0.5, Math.min(dprPantalla, dprMaximo));
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.round(viewport.width)}px`;
        canvas.style.height = `${Math.round(viewport.height)}px`;

        const contexto = canvas.getContext('2d');
        if (contexto) {
          contexto.setTransform(dpr, 0, 0, dpr, 0, 0);
          tareaRender = pagina.render({ canvasContext: contexto, viewport });
          await tareaRender.promise;
        }
        if (cancelado) return;

        capaTexto.replaceChildren();
        capaTexto.style.setProperty('--scale-factor', String(viewport.scale));

        if (pdfjs?.TextLayer) {
          const fuenteTexto =
            typeof pagina.streamTextContent === 'function'
              ? pagina.streamTextContent()
              : await pagina.getTextContent();
          if (cancelado) return;

          capaTextoInstancia = new pdfjs.TextLayer({
            textContentSource: fuenteTexto,
            container: capaTexto,
            viewport,
          });
          await capaTextoInstancia.render();
        }
        if (cancelado) return;

        if (typeof pagina.getAnnotations === 'function') {
          const anotaciones = await pagina.getAnnotations();
          if (!cancelado && Array.isArray(anotaciones)) {
            const links = anotaciones
              .filter((a) => a.subtype === 'Link' && a.url && Array.isArray(a.rect))
              .map((a, idx) => {
                const [x1, y1, x2, y2] = viewport.convertToViewportRectangle(a.rect);
                return {
                  id: `${numeroPagina}-${idx}`,
                  url: a.url,
                  left: Math.min(x1, x2),
                  top: Math.min(y1, y2),
                  width: Math.abs(x2 - x1),
                  height: Math.abs(y2 - y1),
                };
              });
            setEnlaces(links);
          }
        }

        if (!cancelado) {
          setDibujada(true);
        }
      } catch (error) {
        if (error?.name !== 'RenderingCancelledException' && !cancelado) {
          setDibujada(false);
        }
      }
    }

    dibujar();

    return () => {
      cancelado = true;
      tareaRender?.cancel?.();
      capaTextoInstancia?.cancel?.();
    };
  }, [debeRenderizar, pdfDoc, pdfjs, numeroPagina, anchoBase, zoom]);

  return (
    <div
      ref={hojaRef}
      data-pagina={numeroPagina}
      aria-label={`Página ${numeroPagina}`}
      className="relative mx-auto shrink-0 overflow-hidden bg-white shadow-md"
      style={{ width: anchoHoja, height: altoHoja }}
    >
      {!dibujada && (
        <div
          aria-hidden="true"
          className="absolute inset-0 animate-pulse border border-sand bg-white"
        />
      )}

      <canvas
        ref={canvasRef}
        className={`block transition-opacity duration-200 ${dibujada ? 'opacity-100' : 'opacity-0'}`}
      />

      <div ref={textoRef} className="textLayer" />

      {enlaces.map((enlace) => (
        <a
          key={enlace.id}
          href={enlace.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Enlace externo en página ${numeroPagina}`}
          className="absolute z-10 focus-visible:outline-2 focus-visible:outline-gold"
          style={{
            left: enlace.left,
            top: enlace.top,
            width: enlace.width,
            height: enlace.height,
          }}
        />
      ))}
    </div>
  );
}

function BoletinLector({ boletin, alCerrar }) {
  const dialogoRef = useRef(null);
  const cerrarBtnRef = useRef(null);
  const scrollRef = useRef(null);
  const nodosPaginaRef = useRef(new Map());
  const retornoFocoRef = useRef(null);

  const [estado, setEstado] = useState('cargando'); // 'cargando' | 'listo' | 'error'
  const [mensajeError, setMensajeError] = useState('No pudimos mostrar el boletín.');
  const [intento, setIntento] = useState(0);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pdfjsLib, setPdfjsLib] = useState(null);
  const [numPaginas, setNumPaginas] = useState(0);
  const [paginaActual, setPaginaActual] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [anchoContenedor, setAnchoContenedor] = useState(ANCHO_INICIAL);
  const [descargando, setDescargando] = useState(false);
  const [visible, setVisible] = useState(() => prefiereMovimientoReducido());

  useEffect(() => {
    if (visible) return undefined;
    const frame = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, [visible]);

  const urlPdf = boletin?.archivo?.url ?? '';

  // Guardar foco previo, enfocar botón cerrar y bloquear scroll del fondo
  useEffect(() => {
    retornoFocoRef.current = document.activeElement;
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cerrarBtnRef.current?.focus();

    return () => {
      document.body.style.overflow = overflowPrevio;
      if (retornoFocoRef.current && typeof retornoFocoRef.current.focus === 'function') {
        retornoFocoRef.current.focus();
      }
    };
  }, []);

  // Medir el ancho disponible del visor (sin su relleno): es el 100 % del zoom.
  useEffect(() => {
    const contenedor = scrollRef.current;
    if (!contenedor) return undefined;

    const actualizarAncho = () => {
      const estilos = window.getComputedStyle(contenedor);
      const relleno =
        (parseFloat(estilos.paddingLeft) || 0) + (parseFloat(estilos.paddingRight) || 0);
      setAnchoContenedor(Math.max(240, contenedor.clientWidth - relleno));
    };

    actualizarAncho();

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(actualizarAncho);
      ro.observe(contenedor);
      return () => ro.disconnect();
    }

    window.addEventListener('resize', actualizarAncho);
    return () => window.removeEventListener('resize', actualizarAncho);
  }, []);

  // Cargar pdf.js y el documento PDF de forma diferida
  useEffect(() => {
    if (!urlPdf) return undefined;

    let cancelado = false;
    let tareaCarga = null;
    let docCargado = null;

    async function cargarDocumento() {
      try {
        const pdfjs = await cargarPdfJs();
        if (cancelado) return;
        setPdfjsLib(pdfjs);

        tareaCarga = pdfjs.getDocument({ url: urlPdf, isEvalSupported: false });
        docCargado = await tareaCarga.promise;
        if (cancelado) {
          docCargado.destroy?.();
          return;
        }

        setPdfDoc(docCargado);
        setNumPaginas(docCargado.numPages || 1);
        setEstado('listo');
      } catch (error) {
        if (cancelado) return;
        if (error?.name === 'PasswordException') {
          setMensajeError('Este boletín está protegido con contraseña y no se puede abrir aquí.');
        } else {
          setMensajeError('No pudimos mostrar el boletín.');
        }
        setEstado('error');
      }
    }

    cargarDocumento();

    return () => {
      cancelado = true;
      tareaCarga?.destroy?.();
      docCargado?.destroy?.();
    };
  }, [urlPdf, intento]);

  const estadoVisible = !urlPdf ? 'error' : estado;

  // Rastrear qué página está visible con IntersectionObserver
  useEffect(() => {
    const raiz = scrollRef.current;
    if (estado !== 'listo' || !raiz || typeof IntersectionObserver === 'undefined') {
      return undefined;
    }

    const observador = new IntersectionObserver(
      (entradas) => {
        const visibles = entradas
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visibles.length > 0) {
          const num = Number(visibles[0].target.getAttribute('data-pagina'));
          if (Number.isInteger(num) && num >= 1) {
            setPaginaActual(num);
          }
        }
      },
      { root: raiz, threshold: [0.15, 0.5] },
    );

    nodosPaginaRef.current.forEach((nodo) => {
      if (nodo) observador.observe(nodo);
    });

    return () => observador.disconnect();
  }, [estado, numPaginas]);

  const registrarNodo = useCallback((numero, nodo) => {
    if (nodo) {
      nodosPaginaRef.current.set(numero, nodo);
    } else {
      nodosPaginaRef.current.delete(numero);
    }
  }, []);

  const irAPagina = useCallback(
    (destino) => {
      const siguiente = Math.max(1, Math.min(numPaginas || 1, destino));
      setPaginaActual(siguiente);
      const nodo = nodosPaginaRef.current.get(siguiente);
      nodo?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    },
    [numPaginas],
  );

  const acercar = useCallback(() => {
    setZoom((z) => NIVELES_ZOOM.find((nivel) => nivel > z) ?? ZOOM_MAX);
  }, []);

  const alejar = useCallback(() => {
    setZoom((z) => [...NIVELES_ZOOM].reverse().find((nivel) => nivel < z) ?? ZOOM_MIN);
  }, []);

  // Atajos de teclado y trampa de foco
  useEffect(() => {
    const manejarTeclado = (evento) => {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        alCerrar();
        return;
      }

      if (evento.key === 'Tab') {
        const focables = obtenerElementosFocables(dialogoRef.current);
        if (focables.length === 0) return;

        const primero = focables[0];
        const ultimo = focables[focables.length - 1];

        if (evento.shiftKey && document.activeElement === primero) {
          evento.preventDefault();
          ultimo.focus();
        } else if (!evento.shiftKey && document.activeElement === ultimo) {
          evento.preventDefault();
          primero.focus();
        }
        return;
      }

      if (evento.key === 'ArrowRight' || evento.key === 'PageDown') {
        evento.preventDefault();
        irAPagina(paginaActual + 1);
      } else if (evento.key === 'ArrowLeft' || evento.key === 'PageUp') {
        evento.preventDefault();
        irAPagina(paginaActual - 1);
      } else if (evento.key === '+' || evento.key === '=') {
        evento.preventDefault();
        acercar();
      } else if (evento.key === '-') {
        evento.preventDefault();
        alejar();
      }
    };

    window.addEventListener('keydown', manejarTeclado);
    return () => window.removeEventListener('keydown', manejarTeclado);
  }, [alCerrar, irAPagina, paginaActual, acercar, alejar]);

  const manejarDescargar = async () => {
    if (descargando || !urlPdf) return;
    setDescargando(true);
    try {
      await descargarBoletinPdf({ url: urlPdf, periodo: boletin.periodo });
    } finally {
      setDescargando(false);
    }
  };

  const paginas = Array.from({ length: numPaginas }, (_, indice) => indice + 1);

  return createPortal(
    <>
      <title>{`${boletin.titulo} | Boletines | Parroquia Señor de la Exaltación`}</title>

      <div
        className={`fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-0 transition-opacity duration-200 ease-salida motion-reduce:opacity-100 motion-reduce:transition-none md:p-4 lg:p-6 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={(evento) => {
          if (evento.target === evento.currentTarget) alCerrar();
        }}
      >
        <div
          ref={dialogoRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-lector-boletin"
          className="flex h-dvh w-screen flex-col overflow-hidden bg-cream md:h-full md:w-full md:max-w-6xl md:rounded-md md:border md:border-sand md:shadow-2xl"
        >
          {/* Barra del lector */}
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-sand bg-white px-4 py-3 md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                ref={cerrarBtnRef}
                type="button"
                onClick={alCerrar}
                aria-label="Cerrar el lector"
                className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-sand text-ink transition-colors hover:bg-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                <X size={20} aria-hidden="true" />
              </button>

              <div className="min-w-0">
                <h2
                  id="titulo-lector-boletin"
                  className="truncate font-display text-h3 font-semibold text-ink"
                >
                  {boletin.titulo}
                </h2>
                <p className="font-body text-meta text-muted">
                  {formatearPeriodoMes(boletin.periodo)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              {numPaginas > 0 && (
                <span
                  aria-live="polite"
                  className="font-body text-meta font-medium tabular-nums text-muted"
                >
                  Página {paginaActual} de {numPaginas}
                </span>
              )}

              <div
                role="group"
                aria-label="Tamaño de la página"
                className="inline-flex items-center gap-0.5 rounded-sm border border-sand bg-cream p-0.5"
              >
                <button
                  type="button"
                  onClick={alejar}
                  disabled={zoom <= ZOOM_MIN}
                  aria-label="Alejar"
                  className="inline-flex size-11 cursor-pointer items-center justify-center rounded-sm text-ink hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-gold lg:size-9"
                >
                  <Minus size={16} aria-hidden="true" />
                </button>

                <label htmlFor="zoom-lector-boletin" className="sr-only">
                  Tamaño de la página (100 % es el ancho de la pantalla)
                </label>
                <select
                  id="zoom-lector-boletin"
                  value={String(zoom)}
                  onChange={(evento) => setZoom(Number(evento.target.value))}
                  title="100 % es el ancho de la pantalla"
                  className="min-h-11 cursor-pointer rounded-sm border border-transparent bg-white px-2 text-center font-body text-meta font-semibold tabular-nums text-ink hover:border-sand focus-visible:outline-2 focus-visible:outline-gold lg:min-h-9"
                >
                  {NIVELES_ZOOM.map((nivel) => (
                    <option key={nivel} value={String(nivel)}>
                      {etiquetaZoom(nivel)}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={acercar}
                  disabled={zoom >= ZOOM_MAX}
                  aria-label="Acercar"
                  className="inline-flex size-11 cursor-pointer items-center justify-center rounded-sm text-ink hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-gold lg:size-9"
                >
                  <Plus size={16} aria-hidden="true" />
                </button>
              </div>

              <button
                type="button"
                onClick={manejarDescargar}
                disabled={descargando || !urlPdf}
                className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-sm bg-gold px-4 font-body text-button font-semibold text-ink transition-colors hover:bg-gold-dark disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                <Download size={16} aria-hidden="true" />
                <span>{descargando ? 'Descargando…' : 'Descargar'}</span>
              </button>
            </div>
          </header>

          {/* Contenido del lector */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-auto bg-cream px-4 py-6 md:px-8"
          >
            {estadoVisible === 'cargando' && (
              <div className="mx-auto flex max-w-[900px] flex-col items-center gap-6" aria-busy="true">
                <p className="font-body text-meta text-muted">Cargando boletín…</p>
                <div className="aspect-[210/297] w-full max-w-[640px] animate-pulse rounded-sm border border-sand bg-white shadow-sm" />
                <div className="aspect-[210/297] w-full max-w-[640px] animate-pulse rounded-sm border border-sand bg-white shadow-sm" />
              </div>
            )}

            {estadoVisible === 'error' && (
              <div className="mx-auto my-12 max-w-lg rounded-md border border-sand bg-white p-8 text-center">
                <p className="font-display text-h3 font-semibold text-ink">{mensajeError}</p>
                <p className="mt-2 font-body text-body text-muted">
                  Puedes volver a intentarlo, abrir el archivo en otra pestaña o descargarlo directamente.
                </p>

                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEstado('cargando');
                      setMensajeError('No pudimos mostrar el boletín.');
                      setPdfDoc(null);
                      setNumPaginas(0);
                      setPaginaActual(1);
                      setIntento((n) => n + 1);
                    }}
                    className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-sm border border-sand bg-white px-4 font-body text-button font-semibold text-ink hover:bg-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                  >
                    <RotateCw size={15} aria-hidden="true" />
                    <span>Reintentar</span>
                  </button>

                  {urlPdf && (
                    <a
                      href={urlPdf}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-sand bg-white px-4 font-body text-button font-semibold text-ink hover:bg-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                    >
                      <ExternalLink size={15} aria-hidden="true" />
                      <span>Abrir en una pestaña nueva</span>
                    </a>
                  )}

                  {urlPdf && (
                    <button
                      type="button"
                      onClick={manejarDescargar}
                      disabled={descargando}
                      className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-sm bg-gold px-4 font-body text-button font-semibold text-ink hover:bg-gold-dark disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                    >
                      <Download size={15} aria-hidden="true" />
                      <span>{descargando ? 'Descargando…' : 'Descargar'}</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {estadoVisible === 'listo' && pdfDoc && (
              // w-max + min-w-full: al acercar, las hojas más anchas que la pantalla se recorren con
              // desplazamiento horizontal (centradas, sin cortar su lado izquierdo).
              <div className="flex w-max min-w-full flex-col items-center gap-6">
                {paginas.map((numero) => (
                  <HojaPdf
                    key={numero}
                    pdfDoc={pdfDoc}
                    pdfjs={pdfjsLib}
                    numeroPagina={numero}
                    debeRenderizar={Math.abs(numero - paginaActual) <= 2}
                    anchoBase={anchoContenedor}
                    zoom={zoom}
                    registrarNodo={registrarNodo}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}

export default BoletinLector;
