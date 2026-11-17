import { Download, FileText } from 'lucide-react';
import { useSearchParams } from 'react-router';

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
        bajada="Ediciones mensuales con reflexiones, agenda y noticias de nuestra comunidad, disponibles para leer o descargar en PDF."
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
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {boletines.map((boletin, indice) => {
                const tamano = boletin.archivo?.tamanoBytes
                  ? formatearTamanoArchivo(boletin.archivo.tamanoBytes)
                  : '';

                return (
                  <Reveal
                    key={boletin.id}
                    variante="tarjeta"
                    retraso={indice * 90}
                    as="article"
                    className="flex flex-col justify-between rounded-md border border-sand bg-cream p-6 transition-[border-color,transform] duration-200 ease-out hover:-translate-y-1 hover:border-gold"
                  >
                    <div>
                      <span className="inline-flex size-11 items-center justify-center rounded-sm bg-ink text-gold">
                        <FileText size={20} aria-hidden="true" />
                      </span>

                      <p className="mt-4 font-body text-eyebrow font-semibold uppercase tracking-[0.2em] text-muted">
                        {formatearPeriodoMes(boletin.periodo)}
                      </p>

                      <h2 className="mt-2 font-display text-h3 font-semibold text-ink">
                        {boletin.titulo}
                      </h2>

                      <p className="mt-2 font-body text-meta text-muted">
                        Publicado el {formatearFechaLarga(boletin.fechaPublicacion)}
                        {tamano ? ` · PDF (${tamano})` : ''}
                      </p>
                    </div>

                    {boletin.archivo?.url && (
                      <div className="mt-6">
                        <BotonEnlace
                          to={boletin.archivo.url}
                          variante="primario"
                          aria-label={`Descargar PDF: ${boletin.titulo}`}
                        >
                          <span>Descargar PDF</span>
                          <Download size={15} aria-hidden="true" />
                        </BotonEnlace>
                      </div>
                    )}
                  </Reveal>
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
      </Seccion>
    </>
  );
}

export default Boletines;
