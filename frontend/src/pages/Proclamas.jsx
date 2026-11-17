import { useSearchParams } from 'react-router';

import {
  EncabezadoPagina,
  EncabezadoSeccion,
  Seccion,
} from '../components/portal/index.js';
import PaginacionPortal from '../components/parroquia/PaginacionPortal.jsx';
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
    <article className="flex flex-col gap-3 py-6 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h3 className="font-display text-h3 font-semibold text-ink">
          {`${contrayente1} & ${contrayente2}`}
        </h3>

        <p className="mt-1 font-body text-meta text-muted">
          {formatearFechaBoda(fechaMatrimonio)}
        </p>

        {mostrarPublicaciones && publicaciones.length > 0 && (
          <ul
            className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-body text-meta text-muted"
            aria-label="Fechas de publicación"
          >
            {publicaciones.map((pub) => (
              <li key={pub.numero}>
                <strong className="font-semibold text-ink">{pub.numero}.ª:</strong>{' '}
                {formatearFechaLarga(pub.fecha)}
              </li>
            ))}
          </ul>
        )}
      </div>

      <span className="inline-flex w-fit shrink-0 items-center rounded-sm bg-gold-soft px-3 py-1 font-body text-meta font-semibold text-ink">
        {`${numeroProclama}.ª proclama`}
      </span>
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
    <>
      <title>Proclamas matrimoniales | Parroquia Señor de la Exaltación</title>
      <meta
        name="description"
        content="Proclamas matrimoniales vigentes e historial público de la Parroquia Señor de la Exaltación en Obrajes, La Paz."
      />

      <EncabezadoPagina
        migas={[{ texto: 'Inicio', enlace: '/' }, { texto: 'Proclamas matrimoniales' }]}
        eyebrow="Sacramentos · Matrimonio"
        titulo="Proclamas matrimoniales"
        bajada="Publicación canónica de próximos matrimonios e historial público de proclamas. Si alguien conoce algún impedimento, debe comunicarlo al párroco o en secretaría."
      />

      <Seccion fondo="blanco">
        <EncabezadoSeccion eyebrow="Esta semana" titulo="Proclamas vigentes" />

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
          <div className="divide-y divide-sand rounded-md border border-sand bg-white px-6">
            {vigentes.map((proclama) => (
              <FilaProclama key={proclama.id} proclama={proclama} />
            ))}
          </div>
        )}
      </Seccion>

      <Seccion fondo="crema">
        <EncabezadoSeccion
          eyebrow="Registro parroquial"
          titulo="Historial de proclamas"
          accion={
            <div className="flex flex-wrap items-center gap-3">
              <label
                htmlFor="filtro-anio-proclamas"
                className="font-body text-meta font-semibold text-muted"
              >
                Año
              </label>
              <select
                id="filtro-anio-proclamas"
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
          }
        />

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
            <div className="divide-y divide-sand rounded-md border border-sand bg-white px-6">
              {historial.map((proclama) => (
                <FilaProclama key={proclama.id} proclama={proclama} mostrarPublicaciones />
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
      </Seccion>
    </>
  );
}

export default Proclamas;
