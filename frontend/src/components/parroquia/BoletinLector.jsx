import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, ExternalLink, Maximize2, Minus, Plus, RotateCw, X } from 'lucide-react';
import 'pdfjs-dist/web/pdf_viewer.css';

import { descargarBoletinPdf } from '../../utils/boletines.js';
import { formatearPeriodoMes } from '../../utils/formatoPortal.js';
import { cargarPdfJs } from '../../utils/pdfJs.js';

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.5;
const ZOOM_PASO = 0.25;
const ANCHO_MAXIMO_HOJA = 900;

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
  ajusteAncho,
  registrarNodo,
}) {
  const hojaRef = useRef(null);
  const canvasRef = useRef(null);
  const textoRef = useRef(null);
  const [dimensiones, setDimensiones] = useState({ ancho: 640, alto: 830 });
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
        const anchoDisponible = Math.min(anchoBase || ANCHO_MAXIMO_HOJA, ANCHO_MAXIMO_HOJA);
        const escalaBase = ajusteAncho ? anchoDisponible / viewportBase.width : 1.25;
        const escalaFinal = Math.max(0.25, escalaBase * (ajusteAncho ? 1 : zoom));
        const viewport = pagina.getViewport({ scale: escalaFinal });

        setDimensiones({ ancho: Math.round(viewport.width), alto: Math.round(viewport.height) });

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
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
  }, [debeRenderizar, pdfDoc, pdfjs, numeroPagina, anchoBase, zoom, ajusteAncho]);

  return (
    <div
      ref={hojaRef}
      data-pagina={numeroPagina}
      aria-label={`Página ${numeroPagina}`}
      className="relative mx-auto shrink-0 overflow-hidden bg-white shadow-md"
      style={{ width: dimensiones.ancho, height: dimensiones.alto }}
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
  const [ajusteAncho, setAjusteAncho] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [anchoContenedor, setAnchoContenedor] = useState(ANCHO_MAXIMO_HOJA);
  const [descargando, setDescargando] = useState(false);

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

  // Medir ancho disponible del visor para "Ajustar al ancho"
  useEffect(() => {
    const contenedor = scrollRef.current;
    if (!contenedor) return undefined;

    const actualizarAncho = () => {
      const ancho = Math.max(260, contenedor.clientWidth - 48);
      setAnchoContenedor(Math.min(ancho, ANCHO_MAXIMO_HOJA));
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
    setAjusteAncho(false);
    setZoom((z) => Math.min(ZOOM_MAX, Number((z + ZOOM_PASO).toFixed(2))));
  }, []);

  const alejar = useCallback(() => {
    setAjusteAncho(false);
    setZoom((z) => Math.max(ZOOM_MIN, Number((z - ZOOM_PASO).toFixed(2))));
  }, []);

  const ajustarAlAncho = useCallback(() => {
    setAjusteAncho(true);
    setZoom(1);
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

  return (
    <>
      <title>{`${boletin.titulo} | Boletines | Parroquia Señor de la Exaltación`}</title>

      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-0 md:p-4 lg:p-6"
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

              <div className="hidden items-center gap-1 rounded-sm border border-sand bg-cream px-1 py-0.5 sm:inline-flex">
                <button
                  type="button"
                  onClick={alejar}
                  disabled={!ajusteAncho && zoom <= ZOOM_MIN}
                  aria-label="Alejar"
                  className="inline-flex size-9 cursor-pointer items-center justify-center rounded-sm text-ink hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-gold"
                >
                  <Minus size={16} aria-hidden="true" />
                </button>

                <span className="min-w-12 text-center font-body text-meta tabular-nums text-ink">
                  {ajusteAncho ? '100 %' : `${Math.round(zoom * 100)} %`}
                </span>

                <button
                  type="button"
                  onClick={acercar}
                  disabled={!ajusteAncho && zoom >= ZOOM_MAX}
                  aria-label="Acercar"
                  className="inline-flex size-9 cursor-pointer items-center justify-center rounded-sm text-ink hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-gold"
                >
                  <Plus size={16} aria-hidden="true" />
                </button>
              </div>

              <button
                type="button"
                onClick={ajustarAlAncho}
                aria-pressed={ajusteAncho}
                className={`inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-sm border px-3 font-body text-meta font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
                  ajusteAncho
                    ? 'border-ink bg-cream text-ink'
                    : 'border-sand bg-white text-ink hover:bg-cream'
                }`}
              >
                <Maximize2 size={14} aria-hidden="true" />
                <span>Ajustar al ancho</span>
              </button>

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
            className="flex-1 overflow-y-auto bg-cream px-4 py-6 md:px-8"
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
              <div className="flex flex-col items-center gap-6">
                {paginas.map((numero) => (
                  <HojaPdf
                    key={numero}
                    pdfDoc={pdfDoc}
                    pdfjs={pdfjsLib}
                    numeroPagina={numero}
                    debeRenderizar={Math.abs(numero - paginaActual) <= 2}
                    anchoBase={anchoContenedor}
                    zoom={zoom}
                    ajusteAncho={ajusteAncho}
                    registrarNodo={registrarNodo}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default BoletinLector;
