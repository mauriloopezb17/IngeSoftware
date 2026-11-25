import { ArrowRight, ExternalLink } from 'lucide-react';
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

  const tipoParam = searchParams.get('tipo') ?? '';
  const tipoActivo = TIPOS_VALIDOS.has(tipoParam) ? tipoParam : '';
  const categoriaActiva = searchParams.get('categoria') ?? '';
  const paginaNumero = Number(searchParams.get('pagina') ?? '1');
  const paginaActual = Number.isInteger(paginaNumero) && paginaNumero >= 1 ? paginaNumero : 1;

  const { data: categorias = [] } = useCategorias();

  const filtrosApi = {
    tipo: tipoActivo || 'NOTICIA,NOTA_DE_PRENSA',
    pagina: paginaActual,
    porPagina: POR_PAGINA,
  };
  if (categoriaActiva) {
    filtrosApi.categoria = categoriaActiva;
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

  const hayFiltrosActivos = Boolean(tipoActivo || categoriaActiva);

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
                onClick={() => setSearchParams({})}
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {isPending ? (
          <CargandoSeccion alturaMinima={360} etiqueta="Cargando noticias" />
        ) : isError ? (
          <ErrorSeccion mensaje="No pudimos cargar las noticias." onReintentar={refetch} />
        ) : publicaciones.length === 0 ? (
          <SinResultados
            mensaje={
              hayFiltrosActivos
                ? 'No hay noticias que coincidan con los filtros seleccionados.'
                : 'No hay noticias publicadas por el momento.'
            }
          />
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
            />
          </>
        )}
      </Seccion>
    </>
  );
}

export default Noticias;
