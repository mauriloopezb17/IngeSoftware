import { Link, useSearchParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';

import '../styles/parroquia.css';
import '../styles/Proclamas.css';
import '../styles/Noticias.css';
import '../styles/SubpaginasPortal.css';

import Encabezado from '../components/parroquia/Encabezado.jsx';
import PiePagina from '../components/parroquia/PiePagina.jsx';
import PaginacionPortal from '../components/parroquia/PaginacionPortal.jsx';
import { anchoContenido } from '../components/parroquia/ElementosComunes.jsx';
import {
  CargandoSeccion,
  ErrorSeccion,
  SinResultados,
} from '../components/parroquia/EstadoSeccion.jsx';
import { useHistorialProclamas, useProclamas } from '../hooks/index.js';
import { formatearFechaBoda, formatearFechaLarga } from '../utils/formatoPortal.js';

const POR_PAGINA = 5;

function obtenerAniosDisponibles() {
  const anioActual = Math.max(2026, new Date().getFullYear());
  return [String(anioActual), String(anioActual - 1), String(anioActual - 2)];
}

function FilaProclama({ proclama, mostrarPublicaciones = false }) {
  const { contrayente1, contrayente2, fechaMatrimonio, numeroProclama, publicaciones = [] } =
    proclama;

  return (
    <article className="proclamas-fila">
      <div className="proclamas-datos">
        <h3 className="proclamas-nombres">{`${contrayente1} & ${contrayente2}`}</h3>

        <p className="proclamas-fecha">{formatearFechaBoda(fechaMatrimonio)}</p>

        {mostrarPublicaciones && publicaciones.length > 0 && (
          <ul className="proclamas-publicaciones" aria-label="Fechas de publicación">
            {publicaciones.map((pub) => (
              <li key={pub.numero} className="proclamas-publicacion-item">
                <strong>{pub.numero}.ª:</strong> {formatearFechaLarga(pub.fecha)}
              </li>
            ))}
          </ul>
        )}
      </div>

      <span className="proclamas-etiqueta">{`${numeroProclama}.ª proclama`}</span>
    </article>
  );
}

function Proclamas() {
  const [searchParams, setSearchParams] = useSearchParams();

  const anioActivo = searchParams.get('anio') ?? '';
  const paginaNumero = Number(searchParams.get('pagina') ?? '1');
  const paginaActual = Number.isInteger(paginaNumero) && paginaNumero >= 1 ? paginaNumero : 1;

  const {
    data: vigentes = [],
    isPending: cargandoVigentes,
    isError: errorVigentes,
    refetch: reintentarVigentes,
  } = useProclamas();

  const filtrosHistorial = {
    pagina: paginaActual,
    porPagina: POR_PAGINA,
  };
  if (anioActivo) {
    filtrosHistorial.anio = anioActivo;
  }

  const {
    data: respuestaHistorial,
    isPending: cargandoHistorial,
    isError: errorHistorial,
    refetch: reintentarHistorial,
  } = useHistorialProclamas(filtrosHistorial);

  const historial = respuestaHistorial?.datos ?? [];
  const paginacion = respuestaHistorial?.paginacion ?? {
    pagina: paginaActual,
    porPagina: POR_PAGINA,
    total: 0,
    totalPaginas: 0,
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

  return (
    <div className="font-body">
      <title>Proclamas matrimoniales | Parroquia Señor de la Exaltación</title>
      <meta
        name="description"
        content="Proclamas matrimoniales vigentes e historial público de la Parroquia Señor de la Exaltación en Obrajes, La Paz."
      />
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
              <span>Proclamas matrimoniales</span>
            </nav>

            <p className="eyebrow">Sacramentos · Matrimonio</p>
            <h1 className="serif-title noticias-titulo">Proclamas matrimoniales</h1>
            <p className="noticias-subtitulo">
              Publicación canónica de próximos matrimonios e historial público de proclamas. Si
              alguien conoce algún impedimento, debe comunicarlo al párroco o en secretaría.
            </p>
          </div>
        </section>

        <section className="noticias-cuerpo">
          <div className={anchoContenido}>
            <div className="subpagina-bloque">
              <div className="subpagina-bloque-encabezado">
                <div>
                  <p className="eyebrow">Esta semana</p>
                  <h2 className="serif-title subpagina-bloque-titulo">Proclamas vigentes</h2>
                </div>
              </div>

              {cargandoVigentes ? (
                <CargandoSeccion alturaMinima={220} etiqueta="Cargando proclamas vigentes" />
              ) : errorVigentes ? (
                <ErrorSeccion
                  mensaje="No pudimos cargar las proclamas vigentes."
                  onReintentar={reintentarVigentes}
                />
              ) : vigentes.length === 0 ? (
                <SinResultados mensaje="No hay proclamas vigentes esta semana." />
              ) : (
                <div className="proclamas-lista-publica">
                  {vigentes.map((proclama) => (
                    <FilaProclama key={proclama.id} proclama={proclama} />
                  ))}
                </div>
              )}
            </div>

            <div className="subpagina-bloque">
              <div className="subpagina-bloque-encabezado">
                <div>
                  <p className="eyebrow">Registro parroquial</p>
                  <h2 className="serif-title subpagina-bloque-titulo">Historial de proclamas</h2>
                </div>

                <div className="noticias-categoria-grupo">
                  <label htmlFor="filtro-anio-proclamas" className="noticias-categoria-etiqueta">
                    Año
                  </label>
                  <select
                    id="filtro-anio-proclamas"
                    className="noticias-categoria-select"
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
                      className="noticias-limpiar"
                      onClick={() => setSearchParams({})}
                    >
                      Limpiar filtros
                    </button>
                  )}
                </div>
              </div>

              {cargandoHistorial ? (
                <CargandoSeccion alturaMinima={280} etiqueta="Cargando historial de proclamas" />
              ) : errorHistorial ? (
                <ErrorSeccion
                  mensaje="No pudimos cargar el historial de proclamas."
                  onReintentar={reintentarHistorial}
                />
              ) : historial.length === 0 ? (
                <SinResultados
                  mensaje={
                    anioActivo
                      ? `No hay proclamas registradas para el año ${anioActivo}.`
                      : 'No hay proclamas registradas en el historial.'
                  }
                />
              ) : (
                <>
                  <div className="proclamas-lista-publica">
                    {historial.map((proclama) => (
                      <FilaProclama
                        key={proclama.id}
                        proclama={proclama}
                        mostrarPublicaciones
                      />
                    ))}
                  </div>

                  <PaginacionPortal
                    paginaActual={paginacion.pagina}
                    totalPaginas={paginacion.totalPaginas}
                    etiqueta="Paginación del historial de proclamas"
                    alCambiarPagina={(siguiente) => actualizarFiltros({ pagina: siguiente })}
                  />
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      <PiePagina />
    </div>
  );
}

export default Proclamas;

