import { Link, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';

import '../styles/parroquia.css';
import '../styles/Nosotros.css';
import '../styles/Noticias.css';
import '../styles/SubpaginasPortal.css';

import Encabezado from '../components/parroquia/Encabezado.jsx';
import PiePagina from '../components/parroquia/PiePagina.jsx';
import { anchoContenido } from '../components/parroquia/ElementosComunes.jsx';
import {
  CargandoSeccion,
  ErrorSeccion,
  SinResultados,
} from '../components/parroquia/EstadoSeccion.jsx';
import { RenderizadorBloquesPagina } from '../components/parroquia/BloquesPagina.jsx';
import { usePagina } from '../hooks/index.js';
import NoEncontrado from './NoEncontrado.jsx';

function PaginaPublica() {
  const { slug } = useParams();
  const { data: pagina, isPending, isError, error, refetch } = usePagina(slug);

  if (!isPending && isError && error?.estado === 404) {
    return <NoEncontrado />;
  }

  const tituloPagina = pagina?.titulo
    ? `${pagina.titulo} | Parroquia Señor de la Exaltación`
    : 'Parroquia Señor de la Exaltación';
  const descripcionPagina =
    pagina?.descripcionSeo ||
    (pagina?.titulo
      ? `${pagina.titulo} — Parroquia Señor de la Exaltación en Obrajes, La Paz.`
      : 'Información parroquial de la Parroquia Señor de la Exaltación en Obrajes, La Paz.');

  return (
    <div className="font-body">
      <title>{tituloPagina}</title>
      <meta name="description" content={descripcionPagina} />
      <div className="subpagina-encabezado">
        <Encabezado />
      </div>

      <main>
        {isPending ? (
          <section className="noticias-cuerpo">
            <div className={anchoContenido}>
              <CargandoSeccion alturaMinima={360} etiqueta="Cargando página" />
            </div>
          </section>
        ) : isError ? (
          <section className="noticias-cuerpo">
            <div className={anchoContenido}>
              <ErrorSeccion
                mensaje="No pudimos cargar esta página."
                onReintentar={refetch}
              />
            </div>
          </section>
        ) : !pagina ? (
          <NoEncontrado />
        ) : (
          <>
            <section className="noticias-cabecera">
              <div className={anchoContenido}>
                <nav className="noticias-miga" aria-label="Ruta de navegación">
                  <Link to="/" className="inline-flex items-center gap-1.5">
                    <ArrowLeft size={14} aria-hidden="true" />
                    Inicio
                  </Link>
                  {pagina.paginaPadre && (
                    <>
                      <span aria-hidden="true">/</span>
                      <Link to={`/paginas/${pagina.paginaPadre.slug}`}>
                        {pagina.paginaPadre.titulo}
                      </Link>
                    </>
                  )}
                  <span aria-hidden="true">/</span>
                  <span>{pagina.titulo}</span>
                </nav>

                <p className="eyebrow">Parroquia Señor de la Exaltación</p>
                <h1 className="serif-title noticias-titulo">{pagina.titulo}</h1>
                {pagina.descripcionSeo && (
                  <p className="noticias-subtitulo">{pagina.descripcionSeo}</p>
                )}
              </div>
            </section>

            <section className="noticias-cuerpo">
              <div className={anchoContenido}>
                {pagina.bloques?.length > 0 ? (
                  <RenderizadorBloquesPagina bloques={pagina.bloques} />
                ) : (
                  <SinResultados mensaje="Esta página aún no tiene bloques publicados." />
                )}
              </div>
            </section>
          </>
        )}
      </main>

      <PiePagina />
    </div>
  );
}

export default PaginaPublica;

