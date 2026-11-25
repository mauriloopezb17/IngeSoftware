import { Suspense, lazy, useState } from 'react';
import { BookOpen, Download, FileText } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';

import {
  BotonEnlace,
  EncabezadoPagina,
  Reveal,
  Seccion,
} from '../components/portal/index.js';
import PaginacionPortal from '../components/parroquia/PaginacionPortal.jsx';
import {
  CargandoSeccion,
  ErrorSeccion,
  SinResultados,
} from '../components/parroquia/EstadoSeccion.jsx';
import NoEncontrado from './NoEncontrado.jsx';
import { useBoletines } from '../hooks/index.js';
import {
  descargarBoletinPdf,
  esPeriodoRutaValido,
  periodoARutaSegmento,
  rutaBoletin,
} from '../utils/boletines.js';
import {
  formatearFechaLarga,
  formatearPeriodoMes,
  formatearTamanoArchivo,
} from '../utils/formatoPortal.js';

const BoletinLector = lazy(() => import('../components/parroquia/BoletinLector.jsx'));

const POR_PAGINA = 6;

function obtenerAniosDisponibles() {
  const anioActual = Math.max(2026, new Date().getFullYear());
  return [String(anioActual), String(anioActual - 1), String(anioActual - 2)];
}

function BotonDescargarBoletin({ boletin, variante = 'secundario', etiqueta = 'Descargar' }) {
  const [descargando, setDescargando] = useState(false);
  const url = boletin?.archivo?.url;
  if (!url) return null;

  const clasesBase =
    'relative z-10 inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-sm px-5 font-body text-button font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-60';
  const clasesVariante =
    variante === 'primario'
      ? 'bg-gold text-ink hover:bg-gold-dark'
      : 'border border-sand bg-white text-ink hover:border-ink hover:bg-cream';

  const manejarClick = async () => {
    if (descargando) return;
    setDescargando(true);
    try {
      await descargarBoletinPdf({ url, periodo: boletin.periodo });
    } finally {
      setDescargando(false);
    }
  };

  return (
    <button
      type="button"
      onClick={manejarClick}
      disabled={descargando}
      aria-label={`${etiqueta}: ${boletin.titulo}`}
      className={`${clasesBase} ${clasesVariante}`}
    >
      <Download size={15} aria-hidden="true" />
      <span>{descargando ? 'Descargando…' : etiqueta}</span>
    </button>
  );
}

function Boletines() {
  const { periodo: periodoRuta } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const periodoValido = !periodoRuta || esPeriodoRutaValido(periodoRuta);

  const anioActivo = searchParams.get('anio') ?? '';
  const paginaNumero = Number(searchParams.get('pagina') ?? '1');
  const paginaActual = Number.isInteger(paginaNumero) && paginaNumero >= 1 ? paginaNumero : 1;

  const filtrosApi = {
    pagina: paginaActual,
    porPagina: POR_PAGINA,
  };
  if (anioActivo) {
    filtrosApi.anio = anioActivo;
  }

  const { data, isPending, isError, refetch } = useBoletines(filtrosApi);

  const boletines = data?.datos ?? [];
  const paginacion = data?.paginacion ?? {
    pagina: paginaActual,
    porPagina: POR_PAGINA,
    total: 0,
    totalPaginas: 0,
  };

  const boletinEnLista = periodoRuta
    ? boletines.find((b) => periodoARutaSegmento(b.periodo) === periodoRuta)
    : null;

  // Si se entra directo a /boletines/AAAA-MM y no está en la página actual, búscalo por año.
  const { data: dataPorAnio, isPending: cargandoPorAnio } = useBoletines(
    { anio: periodoRuta?.slice(0, 4), porPagina: 12 },
    undefined,
  );
  const boletinPorAnio =
    periodoRuta && !boletinEnLista
      ? (dataPorAnio?.datos ?? []).find((b) => periodoARutaSegmento(b.periodo) === periodoRuta)
      : null;

  const boletinActivo = boletinEnLista ?? boletinPorAnio ?? null;

  if (!periodoValido) {
    return <NoEncontrado />;
  }

  if (periodoRuta && !isPending && !cargandoPorAnio && !boletinActivo && !isError) {
    return <NoEncontrado />;
  }

  const cerrarLector = () => {
    navigate({ pathname: '/boletines', search: location.search });
  };

  const actualizarFiltros = (cambios) => {
    const siguientes = new URLSearchParams(searchParams);

    if ('anio' in cambios) {
      if (cambios.anio) siguientes.set('anio', cambios.anio);
      else siguientes.delete('anio');
      siguientes.delete('pagina');
    }

    if ('pagina' in cambios) {
      if (cambios.pagina > 1) siguientes.set('pagina', String(cambios.pagina));
      else siguientes.delete('pagina');
    }

    setSearchParams(siguientes);
  };

  const anios = obtenerAniosDisponibles();
  const mostrarDestacado = paginaActual === 1 && !anioActivo && boletines.length > 0;
  const boletinDestacado = mostrarDestacado ? boletines[0] : null;
  const boletinesArchivo = mostrarDestacado ? boletines.slice(1) : boletines;

  return (
    <>
      <title>Boletines parroquiales | Parroquia Señor de la Exaltación</title>
      <meta
        name="description"
        content="Archivo de boletines parroquiales en PDF de la Parroquia Señor de la Exaltación en Obrajes, La Paz."
      />

      <EncabezadoPagina
        migas={[{ texto: 'Inicio', enlace: '/' }, { texto: 'Boletines' }]}
        eyebrow="Archivo parroquial"
        titulo="Boletines parroquiales"
        bajada="Ediciones mensuales con reflexiones, agenda y noticias de nuestra comunidad, disponibles para leer en línea o descargar en PDF."
      />

      <Seccion fondo="blanco">
        <div className="mb-10 flex flex-col gap-4 border-b border-sand pb-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-body text-meta text-muted">
            Ordenados del más reciente al más antiguo por periodo mensual.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <label
              htmlFor="filtro-anio-boletines"
              className="font-body text-meta font-semibold text-muted"
            >
              Año
            </label>
            <select
              id="filtro-anio-boletines"
              className="min-h-11 rounded-sm border border-sand bg-white px-3 py-2 font-body text-meta font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              value={anioActivo}
              onChange={(evento) => actualizarFiltros({ anio: evento.target.value })}
            >
              <option value="">Todos los años</option>
              {anios.map((anio) => (
                <option key={anio} value={anio}>
                  {anio}
                </option>
              ))}
            </select>

            {anioActivo && (
              <button
                type="button"
                className="min-h-11 cursor-pointer px-3 py-2 font-body text-meta font-semibold text-ink underline underline-offset-4 hover:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                onClick={() => setSearchParams({})}
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {isPending ? (
          <CargandoSeccion alturaMinima={320} etiqueta="Cargando boletines parroquiales" />
        ) : isError ? (
          <ErrorSeccion
            mensaje="No pudimos cargar los boletines parroquiales."
            onReintentar={refetch}
          />
        ) : boletines.length === 0 ? (
          <SinResultados
            mensaje={
              anioActivo
                ? `No hay boletines publicados para el año ${anioActivo}.`
                : 'No hay boletines publicados por el momento.'
            }
          />
        ) : (
          <>
            {boletinDestacado && (
              <article className="mb-12 rounded-md border border-sand bg-cream p-6 md:p-8">
                <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
                  <div>
                    <p className="font-body text-eyebrow font-semibold uppercase tracking-[0.2em] text-muted">
                      Edición más reciente · {formatearPeriodoMes(boletinDestacado.periodo)}
                    </p>
                    <h2 className="mt-2 font-display text-h2 font-semibold lining-nums text-ink">
                      {boletinDestacado.titulo}
                    </h2>
                    <p className="mt-2 font-body text-meta text-muted">
                      Publicado el {formatearFechaLarga(boletinDestacado.fechaPublicacion)}
                      {boletinDestacado.archivo?.tamanoBytes
                        ? ` · PDF (${formatearTamanoArchivo(boletinDestacado.archivo.tamanoBytes)})`
                        : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <BotonEnlace
                      to={rutaBoletin(boletinDestacado.periodo, location.search)}
                      variante="primario"
                    >
                      <BookOpen size={16} aria-hidden="true" />
                      <span>Leer boletín</span>
                    </BotonEnlace>
                    <BotonDescargarBoletin boletin={boletinDestacado} variante="secundario" />
                  </div>
                </div>
              </article>
            )}

            {boletinesArchivo.length > 0 && (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {boletinesArchivo.map((boletin, indice) => {
                  const tamano = boletin.archivo?.tamanoBytes
                    ? formatearTamanoArchivo(boletin.archivo.tamanoBytes)
                    : '';
                  const destino = rutaBoletin(boletin.periodo, location.search);

                  return (
                    <Reveal
                      key={boletin.id}
                      variante="tarjeta"
                      retraso={indice * 90}
                      as="article"
                      className="relative flex flex-col justify-between rounded-md border border-sand bg-cream p-6 transition-[border-color,transform] duration-200 ease-out hover:-translate-y-1 hover:border-gold"
                    >
                      <div>
                        <span className="inline-flex size-11 items-center justify-center rounded-sm bg-ink text-gold">
                          <FileText size={20} aria-hidden="true" />
                        </span>

                        <p className="mt-4 font-body text-eyebrow font-semibold uppercase tracking-[0.2em] text-muted">
                          {formatearPeriodoMes(boletin.periodo)}
                        </p>

                        <h2 className="mt-2 font-display text-h3 font-semibold lining-nums text-ink">
                          <Link
                            to={destino}
                            className="after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                          >
                            {boletin.titulo}
                          </Link>
                        </h2>

                        <p className="mt-2 font-body text-meta text-muted">
                          Publicado el {formatearFechaLarga(boletin.fechaPublicacion)}
                          {tamano ? ` · PDF (${tamano})` : ''}
                        </p>
                      </div>

                      {boletin.archivo?.url && (
                        <div className="mt-6 flex items-center justify-between gap-3">
                          <span className="font-body text-meta font-semibold text-ink">
                            Leer boletín →
                          </span>
                          <BotonDescargarBoletin boletin={boletin} variante="secundario" />
                        </div>
                      )}
                    </Reveal>
                  );
                })}
              </div>
            )}

            <PaginacionPortal
              paginaActual={paginacion.pagina}
              totalPaginas={paginacion.totalPaginas}
              etiqueta="Paginación de boletines"
              alCambiarPagina={(siguiente) => actualizarFiltros({ pagina: siguiente })}
            />
          </>
        )}
      </Seccion>

      {periodoRuta && boletinActivo && (
        <Suspense fallback={null}>
          <BoletinLector boletin={boletinActivo} alCerrar={cerrarLector} />
        </Suspense>
      )}
    </>
  );
}

export default Boletines;
