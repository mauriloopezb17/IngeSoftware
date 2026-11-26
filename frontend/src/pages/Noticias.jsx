import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ExternalLink, Search, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';

import {
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
import { construirAtributosImagen } from '../components/parroquia/imagenSrcSet.js';
import { useCategorias, usePublicaciones } from '../hooks/index.js';
import { destinoLeerNota, formatearFechaLarga } from '../utils/formatoPortal.js';

const POR_PAGINA = 6;
const TIPOS_VALIDOS = new Set(['NOTICIA', 'NOTA_DE_PRENSA']);
const OPCIONES_TIPO = [
  { valor: '', etiqueta: 'Todas' },
  { valor: 'NOTICIA', etiqueta: 'Noticias' },
  { valor: 'NOTA_DE_PRENSA', etiqueta: 'Notas de prensa' },
];

function Noticias() {
  const [searchParams, setSearchParams] = useSearchParams();
  const inicioListadoRef = useRef(null);

  const tipoParam = searchParams.get('tipo') ?? '';
  const tipoActivo = TIPOS_VALIDOS.has(tipoParam) ? tipoParam : '';
  const categoriaActiva = searchParams.get('categoria') ?? '';
  const buscarUrl = searchParams.get('buscar')?.trim() ?? '';
  const paginaNumero = Number(searchParams.get('pagina') ?? '1');
  const paginaActual = Number.isInteger(paginaNumero) && paginaNumero >= 1 ? paginaNumero : 1;

  const [estadoBusqueda, setEstadoBusqueda] = useState({
    texto: buscarUrl,
    urlAnterior: buscarUrl,
  });
  if (estadoBusqueda.urlAnterior !== buscarUrl) {
    setEstadoBusqueda({ texto: buscarUrl, urlAnterior: buscarUrl });
  }
  const textoBusqueda = estadoBusqueda.texto;

  useEffect(() => {
    const limpio = textoBusqueda.trim();
    if (limpio === buscarUrl) return undefined;
    const temporizador = setTimeout(() => {
      setSearchParams(
        (actuales) => {
          const siguientes = new URLSearchParams(actuales);
          if (limpio) siguientes.set('buscar', limpio);
          else siguientes.delete('buscar');
          siguientes.delete('pagina');
          return siguientes;
        },
        { replace: true },
      );
    }, 300);
    return () => clearTimeout(temporizador);
  }, [textoBusqueda, buscarUrl, setSearchParams]);

  const { data: categorias = [] } = useCategorias();

  const filtrosApi = {
    tipo: tipoActivo || 'NOTICIA,NOTA_DE_PRENSA',
    pagina: paginaActual,
    porPagina: POR_PAGINA,
  };
  if (categoriaActiva) {
    filtrosApi.categoria = categoriaActiva;
  }
  if (buscarUrl) {
    filtrosApi.buscar = buscarUrl;
  }

  const { data, isPending, isError, refetch } = usePublicaciones(filtrosApi);

  const publicaciones = data?.datos ?? [];
  const paginacion = data?.paginacion ?? {
    pagina: paginaActual,
    porPagina: POR_PAGINA,
    total: 0,
    totalPaginas: 0,
  };

  const actualizarFiltros = (cambios) => {
    const siguientes = new URLSearchParams(searchParams);

    if ('tipo' in cambios) {
      if (cambios.tipo) siguientes.set('tipo', cambios.tipo);
      else siguientes.delete('tipo');
      siguientes.delete('pagina');
    }

    if ('categoria' in cambios) {
      if (cambios.categoria) siguientes.set('categoria', cambios.categoria);
      else siguientes.delete('categoria');
      siguientes.delete('pagina');
    }

    if ('pagina' in cambios) {
      if (cambios.pagina > 1) siguientes.set('pagina', String(cambios.pagina));
      else siguientes.delete('pagina');
    }

    setSearchParams(siguientes);
  };

  const limpiarFiltros = () => {
    setEstadoBusqueda({ texto: '', urlAnterior: '' });
    setSearchParams({});
  };

  const hayFiltrosActivos = Boolean(tipoActivo || categoriaActiva || buscarUrl);

  return (
    <>
      <title>Noticias | Parroquia Señor de la Exaltación</title>
      <meta
        name="description"
        content="Noticias, actividades pastorales y notas de prensa de la Parroquia Señor de la Exaltación en Obrajes, La Paz."
      />

      <EncabezadoPagina
        migas={[{ texto: 'Inicio', enlace: '/' }, { texto: 'Noticias' }]}
        eyebrow="Vida parroquial"
        titulo="Noticias"
        bajada="Crónicas, actividades pastorales y notas de prensa de nuestra comunidad parroquial."
      />

      <Seccion fondo="blanco">
        <div className="mb-10 flex flex-col gap-4 border-b border-sand pb-6 md:flex-row md:items-center md:justify-between">
          <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-label="Filtrar por tipo de publicación"
          >
            {OPCIONES_TIPO.map(({ valor, etiqueta }) => {
              const activo = tipoActivo === valor;
              return (
                <button
                  key={etiqueta}
                  type="button"
                  onClick={() => actualizarFiltros({ tipo: valor })}
                  aria-pressed={activo}
                  className={`min-h-11 cursor-pointer rounded-sm border px-4 py-2 font-body text-meta font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
                    activo
                      ? 'border-ink bg-ink text-white'
                      : 'border-sand bg-white text-ink hover:border-ink'
                  }`}
                >
                  {etiqueta}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <label htmlFor="buscar-noticias" className="sr-only">
                Buscar noticias
              </label>
              <Search
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                id="buscar-noticias"
                type="search"
                value={textoBusqueda}
                onChange={(evento) =>
                  setEstadoBusqueda((prev) => ({ ...prev, texto: evento.target.value }))
                }
                placeholder="Buscar noticias…"
                className="min-h-11 w-full rounded-sm border border-sand bg-white py-2 pl-9 pr-9 font-body text-meta text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              />
              {textoBusqueda && (
                <button
                  type="button"
                  onClick={() => setEstadoBusqueda((prev) => ({ ...prev, texto: '' }))}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              )}
            </div>

            <label
              htmlFor="filtro-categoria-noticias"
              className="font-body text-meta font-semibold text-muted"
            >
              Categoría
            </label>
            <select
              id="filtro-categoria-noticias"
              className="min-h-11 rounded-sm border border-sand bg-white px-3 py-2 font-body text-meta font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              value={categoriaActiva}
              onChange={(evento) => actualizarFiltros({ categoria: evento.target.value })}
            >
              <option value="">Todas las categorías</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.slug}>
                  {categoria.nombre}
                </option>
              ))}
            </select>

            {hayFiltrosActivos && (
              <button
                type="button"
                className="min-h-11 cursor-pointer px-3 py-2 font-body text-meta font-semibold text-ink underline underline-offset-4 hover:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                onClick={limpiarFiltros}
              >
                Quitar filtros
              </button>
            )}
          </div>
        </div>

        <div ref={inicioListadoRef} tabIndex={-1} className="outline-none">
        {isPending ? (
          <CargandoSeccion alturaMinima={360} etiqueta="Cargando noticias" />
        ) : isError ? (
          <ErrorSeccion mensaje="No pudimos cargar las noticias." onReintentar={refetch} />
        ) : publicaciones.length === 0 ? (
          <div className="space-y-4">
            <SinResultados
              mensaje={
                hayFiltrosActivos
                  ? 'No hay noticias que coincidan con los filtros seleccionados.'
                  : 'No hay noticias publicadas por el momento.'
              }
            />
            {hayFiltrosActivos && (
              <button
                type="button"
                onClick={limpiarFiltros}
                className="inline-flex min-h-11 cursor-pointer items-center rounded-sm border border-sand bg-white px-5 py-2.5 font-body text-meta font-semibold text-ink hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                Quitar filtros
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {publicaciones.map((noticia, indice) => {
                const destino = destinoLeerNota(noticia);
                const imagen = noticia.imagenPortada;
                const esAfiche = Boolean(
                  imagen?.alto && imagen?.ancho && imagen.alto > imagen.ancho,
                );

                const contenidoImagen = imagen ? (
                  <img
                    src={imagen.url}
                    {...construirAtributosImagen(
                      imagen,
                      '(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw',
                    )}
                    alt={imagen.textoAlternativo || noticia.titulo}
                    width={imagen.ancho ?? undefined}
                    height={imagen.alto ?? undefined}
                    className={`foto-hover aspect-[16/10] w-full ${
                      esAfiche ? 'object-contain bg-cream' : 'object-cover'
                    }`}
                    loading="lazy"
                  />
                ) : null;

                return (
                  <Reveal
                    key={noticia.id}
                    variante="tarjeta"
                    retraso={indice * 120}
                    as="article"
                    className="tarjeta-portal group flex flex-col overflow-hidden rounded-md border border-sand bg-white"
                  >
                    {contenidoImagen && (
                      <div className="overflow-hidden bg-cream">
                        {destino.esExterno ? (
                          <a
                            href={destino.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Abrir ${noticia.titulo} en enlace externo (se abre en otra pestaña)`}
                            className="block"
                          >
                            {contenidoImagen}
                          </a>
                        ) : (
                          <Link
                            to={destino.url}
                            aria-label={`Leer ${noticia.titulo}`}
                            className="block"
                          >
                            {contenidoImagen}
                          </Link>
                        )}
                      </div>
                    )}

                    <div className="flex flex-1 flex-col justify-between p-6">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 font-body text-meta text-muted">
                          <span className="font-semibold text-ink">
                            {noticia.categoria?.nombre || noticia.tipo?.nombre}
                          </span>
                          <span aria-hidden="true">·</span>
                          <time dateTime={noticia.fechaPublicacion}>
                            {formatearFechaLarga(noticia.fechaPublicacion)}
                          </time>
                        </div>

                        <h2 className="mt-2 font-display text-h3 font-semibold text-ink">
                          {noticia.titulo}
                        </h2>

                        {noticia.resumen && (
                          <p className="mt-3 line-clamp-3 font-body text-body text-muted">
                            {noticia.resumen}
                          </p>
                        )}
                      </div>

                      <div className="mt-5 pt-3">
                        {destino.esExterno ? (
                          <a
                            href={destino.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Leer publicación: ${noticia.titulo} (se abre en otra pestaña)`}
                            className="inline-flex min-h-11 items-center gap-2 font-body text-button font-semibold text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                          >
                            <span>Leer nota</span>
                            <ExternalLink size={15} aria-hidden="true" />
                          </a>
                        ) : (
                          <Link
                            to={destino.url}
                            aria-label={`Leer publicación: ${noticia.titulo}`}
                            className="inline-flex min-h-11 items-center gap-2 font-body text-button font-semibold text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                          >
                            <span>Leer nota</span>
                            <ArrowRight
                              size={15}
                              aria-hidden="true"
                              className="transition-transform duration-200 ease-salida group-hover:translate-x-1"
                            />
                          </Link>
                        )}
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>

            <PaginacionPortal
              paginaActual={paginacion.pagina}
              totalPaginas={paginacion.totalPaginas}
              etiqueta="Paginación de noticias"
              alCambiarPagina={(siguiente) => actualizarFiltros({ pagina: siguiente })}
              destinoFocoRef={inicioListadoRef}
            />
          </>
        )}
        </div>
      </Seccion>
    </>
  );
}

export default Noticias;
