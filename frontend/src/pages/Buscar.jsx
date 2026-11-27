import { useId, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Search, X } from 'lucide-react';

import { EncabezadoPagina, Seccion } from '../components/portal/index.js';
import PaginacionPortal from '../components/parroquia/PaginacionPortal.jsx';
import { ErrorSeccion } from '../components/parroquia/EstadoSeccion.jsx';
import ResultadoBusqueda from '../components/parroquia/buscador/ResultadoBusqueda.jsx';
import { useBuscar } from '../hooks/index.js';

const POR_PAGINA = 10;

const PESTANAS_TIPO = [
  { clave: '', etiqueta: 'Todo' },
  { clave: 'noticia', etiqueta: 'Noticias' },
  { clave: 'evento', etiqueta: 'Eventos' },
  { clave: 'sacramento', etiqueta: 'Sacramentos' },
  { clave: 'grupo', etiqueta: 'Grupos' },
  { clave: 'boletin', etiqueta: 'Boletines' },
  { clave: 'pagina', etiqueta: 'Páginas' },
];

const TIPOS_VALIDOS = new Set(['noticia', 'evento', 'sacramento', 'grupo', 'boletin', 'pagina']);
const ORDENES_VALIDOS = new Set(['relevancia', 'reciente', 'antiguo']);
const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/;

function EsquemaCargando() {
  return (
    <div role="status" aria-label="Buscando en el portal" className="space-y-4">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="animate-pulse rounded-md border border-sand bg-white p-6 motion-reduce:animate-none"
        >
          <div className="h-4 w-24 rounded-sm bg-cream" />
          <div className="mt-3 h-6 w-2/3 rounded-sm bg-cream" />
          <div className="mt-3 h-4 w-full rounded-sm bg-cream" />
        </div>
      ))}
      <span className="sr-only">Buscando resultados…</span>
    </div>
  );
}

function Buscar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const idCampo = useId();
  const idDesde = useId();
  const idHasta = useId();
  const idOrden = useId();
  const inicioResultadosRef = useRef(null);

  const qUrl = (searchParams.get('q') ?? '').trim();
  const tipoParam = searchParams.get('tipo') ?? '';
  const tipoActivo = TIPOS_VALIDOS.has(tipoParam) ? tipoParam : '';
  const desdeParam = searchParams.get('desde') ?? '';
  const desdeActivo = REGEX_FECHA.test(desdeParam) ? desdeParam : '';
  const hastaParam = searchParams.get('hasta') ?? '';
  const hastaActivo = REGEX_FECHA.test(hastaParam) ? hastaParam : '';
  const ordenParam = searchParams.get('orden') ?? 'relevancia';
  const ordenActivo = ORDENES_VALIDOS.has(ordenParam) ? ordenParam : 'relevancia';
  const paginaNumero = Number(searchParams.get('pagina') ?? '1');
  const paginaActual = Number.isInteger(paginaNumero) && paginaNumero >= 1 ? paginaNumero : 1;

  const [estadoInput, setEstadoInput] = useState({ texto: qUrl, urlAnterior: qUrl });
  if (estadoInput.urlAnterior !== qUrl) {
    setEstadoInput({ texto: qUrl, urlAnterior: qUrl });
  }
  const textoInput = estadoInput.texto;

  const qValida = qUrl.length >= 2 ? qUrl : '';
  const rangoInvalido = Boolean(desdeActivo && hastaActivo && hastaActivo < desdeActivo);

  const filtrosApi = {
    q: qValida,
    orden: ordenActivo,
    pagina: paginaActual,
    porPagina: POR_PAGINA,
  };
  if (tipoActivo) filtrosApi.tipo = tipoActivo;
  if (desdeActivo && !rangoInvalido) filtrosApi.desde = desdeActivo;
  if (hastaActivo && !rangoInvalido) filtrosApi.hasta = hastaActivo;

  const { data, isPending, isError, error, refetch } = useBuscar(filtrosApi);

  const resultados = data?.datos ?? [];
  const paginacion = data?.paginacion ?? {
    pagina: paginaActual,
    porPagina: POR_PAGINA,
    total: 0,
    totalPaginas: 0,
  };
  const totalesPorTipo = data?.totalesPorTipo ?? {};
  const totalGeneral = Object.values(totalesPorTipo).reduce((acc, n) => acc + (Number(n) || 0), 0);

  const actualizarParametros = (cambios) => {
    const siguientes = new URLSearchParams(searchParams);

    if ('q' in cambios) {
      const limpio = (cambios.q ?? '').trim();
      if (limpio) siguientes.set('q', limpio);
      else siguientes.delete('q');
      siguientes.delete('pagina');
    }

    if ('tipo' in cambios) {
      if (cambios.tipo) siguientes.set('tipo', cambios.tipo);
      else siguientes.delete('tipo');
      siguientes.delete('pagina');
    }

    if ('desde' in cambios) {
      if (cambios.desde) siguientes.set('desde', cambios.desde);
      else siguientes.delete('desde');
      siguientes.delete('pagina');
    }

    if ('hasta' in cambios) {
      if (cambios.hasta) siguientes.set('hasta', cambios.hasta);
      else siguientes.delete('hasta');
      siguientes.delete('pagina');
    }

    if ('orden' in cambios) {
      if (cambios.orden && cambios.orden !== 'relevancia') siguientes.set('orden', cambios.orden);
      else siguientes.delete('orden');
      siguientes.delete('pagina');
    }

    if ('pagina' in cambios) {
      if (cambios.pagina > 1) siguientes.set('pagina', String(cambios.pagina));
      else siguientes.delete('pagina');
    }

    setSearchParams(siguientes);
  };

  const enviarFormulario = (evento) => {
    evento.preventDefault();
    actualizarParametros({ q: textoInput });
  };

  const limpiarFiltros = () => {
    const siguientes = new URLSearchParams();
    if (qUrl) siguientes.set('q', qUrl);
    setSearchParams(siguientes);
  };

  const hayFiltrosSecundarios = Boolean(
    tipoActivo || desdeActivo || hastaActivo || ordenActivo !== 'relevancia',
  );

  const esLimiteSolicitudes = isError && error?.estado === 429;

  return (
    <>
      <title>
        {qValida
          ? `Buscar: ${qValida} | Parroquia Señor de la Exaltación`
          : 'Buscar | Parroquia Señor de la Exaltación'}
      </title>
      <meta name="robots" content="noindex" />

      <EncabezadoPagina
        migas={[{ texto: 'Inicio', enlace: '/' }, { texto: 'Buscar' }]}
        eyebrow="Buscador del portal"
        titulo="Buscar"
        bajada="Encuentra noticias, eventos, sacramentos, grupos pastorales, boletines y páginas publicadas."
      />

      <Seccion fondo="blanco">
        <form role="search" aria-label="Buscar en el portal" onSubmit={enviarFormulario}>
          <label htmlFor={idCampo} className="mb-2 block font-body text-meta font-semibold text-ink">
            ¿Qué estás buscando?
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <input
                id={idCampo}
                type="search"
                enterKeyHint="search"
                value={textoInput}
                onChange={(evento) =>
                  setEstadoInput({ texto: evento.target.value, urlAnterior: qUrl })
                }
                placeholder="Ej. bautismo, horarios de semana santa, coro…"
                className="min-h-11 w-full rounded-sm border border-sand bg-white px-4 py-2.5 pr-10 font-body text-body text-ink placeholder:text-muted focus-visible:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              />
              {textoInput && (
                <button
                  type="button"
                  onClick={() => {
                    setEstadoInput({ texto: '', urlAnterior: '' });
                    setSearchParams({});
                  }}
                  aria-label="Limpiar búsqueda"
                  className="absolute inset-y-0 right-0 inline-flex w-11 cursor-pointer items-center justify-center text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              )}
            </div>

            <button
              type="submit"
              className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-sm bg-gold px-6 py-2.5 font-body text-button font-semibold text-ink transition-colors duration-150 ease-salida hover:bg-gold-dark active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink motion-reduce:transition-none"
            >
              <Search size={18} aria-hidden="true" />
              <span>Buscar</span>
            </button>
          </div>
          <p className="mt-2 font-body text-meta text-muted">
            Usa comillas para una frase exacta y un guion para excluir una palabra.
          </p>
        </form>

        {/* Pestañas por tipo y filtros de fecha/orden */}
        {qValida && (
          <div className="mt-8 space-y-6 border-t border-sand pt-6">
            <div role="tablist" aria-label="Filtrar por tipo de contenido" className="flex flex-wrap gap-2">
              {PESTANAS_TIPO.map(({ clave, etiqueta }) => {
                const conteo = clave === '' ? totalGeneral : Number(totalesPorTipo[clave] ?? 0);
                const activa = tipoActivo === clave;
                if (clave !== '' && !activa && data && conteo === 0) {
                  return null;
                }

                return (
                  <button
                    key={clave || 'todo'}
                    role="tab"
                    type="button"
                    aria-selected={activa}
                    onClick={() => actualizarParametros({ tipo: clave })}
                    className={`inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-sm border px-4 py-2 font-body text-meta font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
                      activa
                        ? 'border-ink bg-ink text-white'
                        : 'border-sand bg-white text-ink hover:border-ink hover:bg-cream'
                    }`}
                  >
                    <span>{etiqueta}</span>
                    {data && <span className="tabular-nums opacity-85">({conteo})</span>}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label htmlFor={idDesde} className="mb-1.5 block font-body text-meta font-medium text-ink">
                  Desde
                </label>
                <input
                  id={idDesde}
                  type="date"
                  value={desdeActivo}
                  onChange={(evento) => actualizarParametros({ desde: evento.target.value })}
                  className="min-h-11 rounded-sm border border-sand bg-white px-3 py-2 font-body text-meta text-ink focus-visible:border-ink focus-visible:outline-2 focus-visible:outline-ink"
                />
              </div>

              <div>
                <label htmlFor={idHasta} className="mb-1.5 block font-body text-meta font-medium text-ink">
                  Hasta
                </label>
                <input
                  id={idHasta}
                  type="date"
                  value={hastaActivo}
                  onChange={(evento) => actualizarParametros({ hasta: evento.target.value })}
                  className="min-h-11 rounded-sm border border-sand bg-white px-3 py-2 font-body text-meta text-ink focus-visible:border-ink focus-visible:outline-2 focus-visible:outline-ink"
                />
              </div>

              <div>
                <label htmlFor={idOrden} className="mb-1.5 block font-body text-meta font-medium text-ink">
                  Ordenar por
                </label>
                <select
                  id={idOrden}
                  value={ordenActivo}
                  onChange={(evento) => actualizarParametros({ orden: evento.target.value })}
                  className="min-h-11 rounded-sm border border-sand bg-white px-3 py-2 font-body text-meta text-ink focus-visible:border-ink focus-visible:outline-2 focus-visible:outline-ink"
                >
                  <option value="relevancia">Más relevante</option>
                  <option value="reciente">Más reciente</option>
                  <option value="antiguo">Más antiguo</option>
                </select>
              </div>

              {hayFiltrosSecundarios && (
                <button
                  type="button"
                  onClick={limpiarFiltros}
                  className="inline-flex min-h-11 cursor-pointer items-center rounded-sm border border-sand bg-white px-4 py-2 font-body text-meta font-semibold text-ink transition-colors hover:border-ink hover:bg-cream focus-visible:outline-2 focus-visible:outline-ink"
                >
                  Limpiar filtros
                </button>
              )}
            </div>

            {rangoInvalido && (
              <p role="alert" className="font-body text-meta text-danger">
                La fecha «Hasta» debe ser igual o posterior a «Desde».
              </p>
            )}
          </div>
        )}

        {/* Zona de resultados */}
        <div
          ref={inicioResultadosRef}
          tabIndex={-1}
          aria-live="polite"
          className="mt-8 outline-none"
        >
          {!qValida ? (
            <div className="rounded-md border border-sand bg-cream/60 p-8 text-center">
              <p className="font-body text-body text-muted">
                Escribe al menos 2 letras para buscar en el portal.
              </p>
            </div>
          ) : isPending ? (
            <EsquemaCargando />
          ) : esLimiteSolicitudes ? (
            <div
              role="alert"
              className="rounded-md border border-danger/30 bg-danger-soft p-6 text-center text-ink"
            >
              <p className="font-body text-body font-medium">
                Hiciste muchas búsquedas seguidas. Espera un momento.
              </p>
            </div>
          ) : isError ? (
            <ErrorSeccion
              mensaje="No pudimos completar la búsqueda en este momento."
              onReintentar={refetch}
            />
          ) : resultados.length === 0 ? (
            <div className="rounded-md border border-sand bg-cream/60 p-8">
              <p className="font-display text-h3 font-semibold text-ink">
                No encontramos resultados para «{qValida}»
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5 font-body text-meta text-muted">
                <li>Revisa la ortografía de las palabras buscadas.</li>
                <li>Usa menos palabras o quita los filtros de fecha y tipo.</li>
              </ul>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  to="/noticias"
                  className="inline-flex min-h-11 items-center rounded-sm border border-sand bg-white px-4 py-2 font-body text-meta font-semibold text-ink transition-colors hover:border-ink hover:bg-cream focus-visible:outline-2 focus-visible:outline-ink"
                >
                  Noticias
                </Link>
                <Link
                  to="/calendario"
                  className="inline-flex min-h-11 items-center rounded-sm border border-sand bg-white px-4 py-2 font-body text-meta font-semibold text-ink transition-colors hover:border-ink hover:bg-cream focus-visible:outline-2 focus-visible:outline-ink"
                >
                  Calendario
                </Link>
                <Link
                  to="/sacramentos"
                  className="inline-flex min-h-11 items-center rounded-sm border border-sand bg-white px-4 py-2 font-body text-meta font-semibold text-ink transition-colors hover:border-ink hover:bg-cream focus-visible:outline-2 focus-visible:outline-ink"
                >
                  Sacramentos
                </Link>
              </div>
            </div>
          ) : (
            <>
              <p className="mb-4 font-body text-meta text-muted">
                {paginacion.total === 1
                  ? '1 resultado encontrado'
                  : `${paginacion.total} resultados encontrados`}
              </p>

              <div className="space-y-4">
                {resultados.map((resultado) => (
                  <ResultadoBusqueda
                    key={`${resultado.tipo}-${resultado.id}`}
                    resultado={resultado}
                  />
                ))}
              </div>

              <PaginacionPortal
                paginaActual={paginacion.pagina}
                totalPaginas={paginacion.totalPaginas}
                etiqueta="Paginación de resultados"
                destinoFocoRef={inicioResultadosRef}
                alCambiarPagina={(nuevaPagina) => actualizarParametros({ pagina: nuevaPagina })}
              />
            </>
          )}
        </div>
      </Seccion>
    </>
  );
}

export default Buscar;
