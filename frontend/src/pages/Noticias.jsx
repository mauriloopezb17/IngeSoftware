import { Link, useSearchParams } from 'react-router';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

import '../styles/parroquia.css';
import '../styles/VidaParroquial.css';
import '../styles/Noticias.css';

import Encabezado from '../components/parroquia/Encabezado.jsx';
import PiePagina from '../components/parroquia/PiePagina.jsx';
import { anchoContenido } from '../components/parroquia/ElementosComunes.jsx';
import {
  CargandoSeccion,
  ErrorSeccion,
  SinResultados,
} from '../components/parroquia/EstadoSeccion.jsx';
import { useCategorias, usePublicaciones } from '../hooks/index.js';
import { formatearFechaLarga } from '../utils/formatoPortal.js';

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
    <div className="font-body">
      <div className="subpagina-encabezado">
        <Encabezado />
      </div>

      <main>
        <section className="noticias-cabecera">
          <div className={anchoContenido}>
            <nav className="noticias-miga" aria-label="Ruta de navegación">
              <Link to="/" className="inline-flex items-center gap-1.5">
                <ArrowLeft size={14} aria-hidden="true" />
                Inicio
              </Link>
              <span aria-hidden="true">/</span>
              <span>Noticias</span>
            </nav>

            <p className="eyebrow">Vida parroquial</p>
            <h1 className="serif-title noticias-titulo">Noticias</h1>
            <p className="noticias-subtitulo">
              Crónicas, actividades pastorales y notas de prensa de nuestra comunidad parroquial.
            </p>
          </div>
        </section>

        <section className="noticias-cuerpo">
          <div className={anchoContenido}>
            <div className="noticias-filtros">
              <div className="noticias-tipos" role="group" aria-label="Filtrar por tipo de publicación">
                {OPCIONES_TIPO.map(({ valor, etiqueta }) => {
                  const activo = tipoActivo === valor;
                  return (
                    <button
                      key={etiqueta}
                      type="button"
                      onClick={() => actualizarFiltros({ tipo: valor })}
                      className={`noticias-filtro-boton ${
                        activo ? 'noticias-filtro-boton-activo' : ''
                      }`}
                      aria-pressed={activo}
                    >
                      {etiqueta}
                    </button>
                  );
                })}
              </div>

              <div className="noticias-categoria-grupo">
                <label htmlFor="filtro-categoria-noticias" className="noticias-categoria-etiqueta">
                  Categoría
                </label>
                <select
                  id="filtro-categoria-noticias"
                  className="noticias-categoria-select"
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
                    className="noticias-limpiar"
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
              <ErrorSeccion
                mensaje="No pudimos cargar las noticias."
                onReintentar={refetch}
              />
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
                <div className="vida-parroquial-tarjetas">
                  {publicaciones.map((noticia) => {
                    const imagen = noticia.imagenPortada;
                    const esAfiche = Boolean(
                      imagen?.alto && imagen?.ancho && imagen.alto > imagen.ancho,
                    );

                    const contenidoImagen = imagen ? (
                      <img
                        src={imagen.url}
                        alt={imagen.textoAlternativo || noticia.titulo}
                        width={imagen.ancho ?? undefined}
                        height={imagen.alto ?? undefined}
                        className={`vida-parroquial-imagen ${
                          esAfiche ? 'vida-parroquial-imagen-afiche' : ''
                        }`}
                        loading="lazy"
                      />
                    ) : null;

                    return (
                      <article key={noticia.id} className="vida-parroquial-tarjeta">
                        <div className="vida-parroquial-imagen-contenedor">
                          {contenidoImagen &&
                            (noticia.urlExterna ? (
                              <a
                                href={noticia.urlExterna}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="vida-parroquial-imagen-enlace"
                                aria-label={`Abrir ${noticia.titulo} en enlace externo`}
                              >
                                {contenidoImagen}
                              </a>
                            ) : (
                              <Link
                                to={`/noticias/${noticia.slug}`}
                                className="vida-parroquial-imagen-enlace"
                                aria-label={`Leer ${noticia.titulo}`}
                              >
                                {contenidoImagen}
                              </Link>
                            ))}
                        </div>

                        <div className="vida-parroquial-contenido">
                          <div className="vida-parroquial-metadatos">
                            <span className="vida-parroquial-categoria">
                              {noticia.categoria?.nombre || noticia.tipo?.nombre}
                            </span>

                            <span className="vida-parroquial-separador" />

                            <span>{formatearFechaLarga(noticia.fechaPublicacion)}</span>
                          </div>

                          <h2 className="vida-parroquial-tarjeta-titulo">{noticia.titulo}</h2>

                          {noticia.resumen && (
                            <p className="vida-parroquial-descripcion">{noticia.resumen}</p>
                          )}

                          {noticia.urlExterna ? (
                            <a
                              href={noticia.urlExterna}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="vida-parroquial-enlace"
                              aria-label={`Leer publicación: ${noticia.titulo}`}
                            >
                              Leer nota
                              <ArrowRight size={15} />
                            </a>
                          ) : (
                            <Link
                              to={`/noticias/${noticia.slug}`}
                              className="vida-parroquial-enlace"
                              aria-label={`Leer publicación: ${noticia.titulo}`}
                            >
                              Leer nota
                              <ArrowRight size={15} />
                            </Link>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>

                {paginacion.totalPaginas > 1 && (
                  <nav className="noticias-paginacion" aria-label="Paginación de noticias">
                    <button
                      type="button"
                      className="noticias-paginacion-boton"
                      disabled={paginaActual <= 1}
                      onClick={() => actualizarFiltros({ pagina: paginaActual - 1 })}
                    >
                      <ChevronLeft size={16} aria-hidden="true" />
                      Anterior
                    </button>

                    <span className="noticias-paginacion-estado">
                      Página {paginaActual} de {paginacion.totalPaginas}
                    </span>

                    <button
                      type="button"
                      className="noticias-paginacion-boton"
                      disabled={paginaActual >= paginacion.totalPaginas}
                      onClick={() => actualizarFiltros({ pagina: paginaActual + 1 })}
                    >
                      Siguiente
                      <ChevronRight size={16} aria-hidden="true" />
                    </button>
                  </nav>
                )}
              </>
            )}
          </div>
        </section>
      </main>

      <PiePagina />
    </div>
  );
}

export default Noticias;
