import { useParams } from 'react-router';

import { EncabezadoPagina, Seccion } from '../components/portal/index.js';
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

  if (isPending) {
    return (
      <>
        <title>{tituloPagina}</title>
        <meta name="description" content={descripcionPagina} />
        <Seccion fondo="blanco">
          <CargandoSeccion alturaMinima={360} etiqueta="Cargando página" />
        </Seccion>
      </>
    );
  }

  if (isError) {
    return (
      <>
        <title>{tituloPagina}</title>
        <meta name="description" content={descripcionPagina} />
        <Seccion fondo="blanco">
          <ErrorSeccion mensaje="No pudimos cargar esta página." onReintentar={refetch} />
        </Seccion>
      </>
    );
  }

  if (!pagina) {
    return <NoEncontrado />;
  }

  const migas = [{ texto: 'Inicio', enlace: '/' }];
  if (pagina.paginaPadre) {
    migas.push({
      texto: pagina.paginaPadre.titulo,
      enlace: `/paginas/${pagina.paginaPadre.slug}`,
    });
  }
  migas.push({ texto: pagina.titulo });

  return (
    <>
      <title>{tituloPagina}</title>
      <meta name="description" content={descripcionPagina} />

      <EncabezadoPagina
        migas={migas}
        eyebrow="Parroquia Señor de la Exaltación"
        titulo={pagina.titulo}
        bajada={pagina.descripcionSeo || undefined}
      />

      <Seccion fondo="blanco">
        {pagina.bloques?.length > 0 ? (
          <RenderizadorBloquesPagina bloques={pagina.bloques} />
        ) : (
          <SinResultados mensaje="Esta página aún no tiene bloques publicados." />
        )}
      </Seccion>
    </>
  );
}

export default PaginaPublica;
