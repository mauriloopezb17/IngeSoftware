import { Link, useSearchParams } from 'react-router';
import { ArrowLeft, Download, FileText } from 'lucide-react';

import '../styles/parroquia.css';
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
import { useBoletines } from '../hooks/index.js';
import {
  formatearFechaLarga,
  formatearPeriodoMes,
  formatearTamanoArchivo,
} from '../utils/formatoPortal.js';

const POR_PAGINA = 6;

function obtenerAniosDisponibles() {
  const anioActual = Math.max(2026, new Date().getFullYear());
  return [String(anioActual), String(anioActual - 1), String(anioActual - 2)];
}

function Boletines() {
  const [searchParams, setSearchParams] = useSearchParams();

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
      <title>Boletines parroquiales | Parroquia Señor de la Exaltación</title>
      <meta
        name="description"
        content="Archivo de boletines parroquiales en PDF de la Parroquia Señor de la Exaltación en Obrajes, La Paz."
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
              <span>Boletines</span>
            </nav>

            <p className="eyebrow">Archivo parroquial</p>
            <h1 className="serif-title noticias-titulo">Boletines parroquiales</h1>
            <p className="noticias-subtitulo">
              Ediciones mensuales con reflexiones, agenda y noticias de nuestra comunidad,
              disponibles para leer o descargar en PDF.
            </p>
          </div>
        </section>

        <section className="noticias-cuerpo">
          <div className={anchoContenido}>
            <div className="noticias-filtros">
              <p className="subpagina-nota" style={{ margin: 0 }}>
                Ordenados del más reciente al más antiguo por periodo mensual.
              </p>

              <div className="noticias-categoria-grupo">
                <label htmlFor="filtro-anio-boletines" className="noticias-categoria-etiqueta">
                  Año
                </label>
                <select
                  id="filtro-anio-boletines"
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
                <div className="boletines-grilla">
                  {boletines.map((boletin) => {
                    const tamano = boletin.archivo?.tamanoBytes
                      ? formatearTamanoArchivo(boletin.archivo.tamanoBytes)
                      : '';

                    return (
                      <article key={boletin.id} className="boletin-tarjeta">
                        <div>
                          <div className="boletin-tarjeta-icono">
                            <FileText size={21} aria-hidden="true" />
                          </div>

                          <p className="boletin-tarjeta-periodo">
                            {formatearPeriodoMes(boletin.periodo)}
                          </p>

                          <h2 className="boletin-tarjeta-titulo">{boletin.titulo}</h2>

                          <p className="boletin-tarjeta-meta">
                            Publicado el {formatearFechaLarga(boletin.fechaPublicacion)}
                            {tamano ? ` · PDF (${tamano})` : ''}
                          </p>
                        </div>

                        {boletin.archivo?.url && (
                          <a
                            href={boletin.archivo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="boletin-tarjeta-boton"
                            aria-label={`Descargar PDF: ${boletin.titulo}`}
                          >
                            Descargar PDF
                            <Download size={15} aria-hidden="true" />
                          </a>
                        )}
                      </article>
                    );
                  })}
                </div>

                <PaginacionPortal
                  paginaActual={paginacion.pagina}
                  totalPaginas={paginacion.totalPaginas}
                  etiqueta="Paginación de boletines"
                  alCambiarPagina={(siguiente) => actualizarFiltros({ pagina: siguiente })}
                />
              </>
            )}
          </div>
        </section>
      </main>

      <PiePagina />
    </div>
  );
}

export default Boletines;

