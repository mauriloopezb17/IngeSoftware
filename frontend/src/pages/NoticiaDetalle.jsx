import { Link, useParams } from 'react-router';
import { ArrowLeft, ExternalLink } from 'lucide-react';

import '../styles/parroquia.css';
import '../styles/Noticias.css';
import '../styles/NoticiaDetalle.css';

import Encabezado from '../components/parroquia/Encabezado.jsx';
import PiePagina from '../components/parroquia/PiePagina.jsx';
import ContenidoBlockNote from '../components/parroquia/ContenidoBlockNote.jsx';
import { anchoContenido } from '../components/parroquia/ElementosComunes.jsx';
import { CargandoSeccion, ErrorSeccion } from '../components/parroquia/EstadoSeccion.jsx';
import { usePublicacion } from '../hooks/index.js';
import { formatearFechaLarga } from '../utils/formatoPortal.js';

function NoticiaDetalle() {
  const { slug } = useParams();
  const { data: publicacion, isPending, isError, error, refetch } = usePublicacion(slug);

  const esNoEncontrado = error?.estado === 404 || error?.codigo === 'NO_ENCONTRADO';
  const imagen = publicacion?.imagenPortada;
  const esAfiche = Boolean(imagen?.alto && imagen?.ancho && imagen.alto > imagen.ancho);
  const tituloSeo = publicacion?.titulo
    ? `${publicacion.titulo} | Parroquia Señor de la Exaltación`
    : esNoEncontrado
      ? 'Noticia no encontrada | Parroquia Señor de la Exaltación'
      : 'Noticias | Parroquia Señor de la Exaltación';
  const descripcionSeo =
    publicacion?.resumen ||
    publicacion?.titulo ||
    'Publicaciones y vida parroquial de la Parroquia Señor de la Exaltación.';

  return (
    <div className="font-body">
      <title>{tituloSeo}</title>
      <meta name="description" content={descripcionSeo} />
      {publicacion && (
        <>
          <meta property="og:title" content={publicacion.titulo} />
          <meta property="og:description" content={descripcionSeo} />
          {imagen?.url && <meta property="og:image" content={imagen.url} />}
        </>
      )}
      <div className="subpagina-encabezado">
        <Encabezado />
      </div>

      <main>
        {isPending ? (
          <section className="noticia-detalle-cuerpo">
            <div className={anchoContenido}>
              <CargandoSeccion alturaMinima={380} etiqueta="Cargando noticia" />
            </div>
          </section>
        ) : isError && esNoEncontrado ? (
          <section className="noticia-detalle-cuerpo">
            <div className={`${anchoContenido} noticia-detalle-no-encontrada`}>
              <p className="eyebrow">Publicación no disponible</p>
              <h1 className="serif-title">No encontramos esta noticia</h1>
              <p>
                Es posible que haya sido retirada o que el enlace no corresponda a una publicación
                vigente.
              </p>
              <div className="noticia-detalle-pie">
                <Link to="/noticias" className="noticia-detalle-volver">
                  <ArrowLeft size={15} aria-hidden="true" />
                  Ver todas las noticias
                </Link>
                <Link to="/" className="noticia-detalle-volver">
                  Volver al inicio
                </Link>
              </div>
            </div>
          </section>
        ) : isError ? (
          <section className="noticia-detalle-cuerpo">
            <div className={anchoContenido}>
              <ErrorSeccion mensaje="No pudimos cargar esta noticia." onReintentar={refetch} />
            </div>
          </section>
        ) : (
          <article>
            <header className="noticia-detalle-cabecera">
              <div className={anchoContenido}>
                <div className="noticia-detalle-articulo">
                  <nav className="noticias-miga" aria-label="Ruta de navegación">
                    <Link to="/">Inicio</Link>
                    <span aria-hidden="true">/</span>
                    <Link to="/noticias">Noticias</Link>
                  </nav>

                  <div className="noticia-detalle-metadatos">
                    <span className="noticia-detalle-categoria">
                      {publicacion.categoria?.nombre || publicacion.tipo?.nombre}
                    </span>

                    <span className="noticia-detalle-separador" />

                    <time dateTime={publicacion.fechaPublicacion}>
                      {formatearFechaLarga(publicacion.fechaPublicacion)}
                    </time>
                  </div>

                  <h1 className="serif-title noticia-detalle-titulo">{publicacion.titulo}</h1>

                  {publicacion.resumen && (
                    <p className="noticia-detalle-resumen">{publicacion.resumen}</p>
                  )}
                </div>
              </div>
            </header>

            <section className="noticia-detalle-cuerpo">
              <div className={anchoContenido}>
                <div className="noticia-detalle-articulo">
                  {imagen && (
                    <figure className="noticia-detalle-portada">
                      <img
                        src={imagen.url}
                        alt={imagen.textoAlternativo || publicacion.titulo}
                        width={imagen.ancho ?? undefined}
                        height={imagen.alto ?? undefined}
                        className={`noticia-detalle-portada-imagen ${
                          esAfiche ? 'noticia-detalle-portada-afiche' : ''
                        }`}
                      />
                    </figure>
                  )}

                  <ContenidoBlockNote contenido={publicacion.contenido} />

                  {publicacion.urlExterna && (
                    <div className="noticia-detalle-externa">
                      <a
                        href={publicacion.urlExterna}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="noticia-detalle-externa-enlace"
                      >
                        Ver publicación original
                        <ExternalLink size={15} aria-hidden="true" />
                      </a>
                    </div>
                  )}

                  <div className="noticia-detalle-pie">
                    <Link to="/noticias" className="noticia-detalle-volver">
                      <ArrowLeft size={15} aria-hidden="true" />
                      Ver todas las noticias
                    </Link>

                    <Link to="/" className="noticia-detalle-volver">
                      Volver al inicio
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          </article>
        )}
      </main>

      <PiePagina />
    </div>
  );
}

export default NoticiaDetalle;
