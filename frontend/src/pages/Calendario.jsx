import { useRef } from 'react';
import { ArrowRight, CalendarDays, Clock3, MapPin } from 'lucide-react';
import { useSearchParams } from 'react-router';

import {
  EncabezadoPagina,
  Seccion,
} from '../components/portal/index.js';
import EnlacePortal from '../components/parroquia/EnlacePortal.jsx';
import PaginacionPortal from '../components/parroquia/PaginacionPortal.jsx';
import {
  CargandoSeccion,
  ErrorSeccion,
  SinResultados,
} from '../components/parroquia/EstadoSeccion.jsx';
import { construirAtributosImagen } from '../components/parroquia/imagenSrcSet.js';
import { useCategoriasEvento, useEventos } from '../hooks/index.js';
import { claveDiaBolivia, etiquetaDiaEvento } from '../utils/eventosPortal.js';
import { formatearDiaMes, formatearHoraEvento } from '../utils/formatoPortal.js';

const POR_PAGINA = 6;
const DESFASE_BOLIVIA_MS = -4 * 60 * 60 * 1000;
const MESES_TITULO = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

function obtenerHoyBolivia() {
  return new Date(Date.now() + DESFASE_BOLIVIA_MS).toISOString().slice(0, 10);
}

function obtenerOpcionesMeses(cantidad = 6) {
  const hoy = new Date(Date.now() + DESFASE_BOLIVIA_MS);
  const anioBase = hoy.getUTCFullYear();
  const mesBase = hoy.getUTCMonth();

  return Array.from({ length: cantidad }, (_, indice) => {
    const fecha = new Date(Date.UTC(anioBase, mesBase + indice, 1));
    const anio = fecha.getUTCFullYear();
    const mes = fecha.getUTCMonth();
    const valor = `${anio}-${String(mes + 1).padStart(2, '0')}`;
    return {
      valor,
      etiqueta: `${MESES_TITULO[mes]} ${anio}`,
    };
  });
}

function calcularRangoMes(mesParam, hoy) {
  if (!/^\d{4}-\d{2}$/.test(mesParam)) return null;
  const [anioStr, mesStr] = mesParam.split('-');
  const anio = Number(anioStr);
  const mes = Number(mesStr);
  if (mes < 1 || mes > 12) return null;

  const ultimoDiaNumero = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  const primerDia = `${mesParam}-01`;
  const ultimoDia = `${mesParam}-${String(ultimoDiaNumero).padStart(2, '0')}`;

  if (ultimoDia < hoy) {
    return { pasado: true };
  }

  return {
    pasado: false,
    desde: primerDia < hoy ? hoy : primerDia,
    hasta: ultimoDia,
  };
}

function Calendario() {
  const [searchParams, setSearchParams] = useSearchParams();
  const inicioListadoRef = useRef(null);

  const mesActivo = searchParams.get('mes') ?? '';
  const categoriaActiva = searchParams.get('categoria') ?? '';
  const paginaNumero = Number(searchParams.get('pagina') ?? '1');
  const paginaActual = Number.isInteger(paginaNumero) && paginaNumero >= 1 ? paginaNumero : 1;

  const hoyBolivia = obtenerHoyBolivia();
  const rangoMes = mesActivo ? calcularRangoMes(mesActivo, hoyBolivia) : null;
  const esMesPasado = Boolean(rangoMes?.pasado);

  const { data: categorias = [] } = useCategoriasEvento();

  const filtrosApi = {
    pagina: paginaActual,
    porPagina: POR_PAGINA,
  };
  if (categoriaActiva) {
    filtrosApi.categoria = categoriaActiva;
  }
  if (rangoMes && !rangoMes.pasado) {
    filtrosApi.desde = rangoMes.desde;
    filtrosApi.hasta = rangoMes.hasta;
  }

  const { data, isPending, isError, refetch } = useEventos(filtrosApi);

  const eventos = esMesPasado ? [] : (data?.datos ?? []);
  const paginacion = esMesPasado
    ? { pagina: 1, porPagina: POR_PAGINA, total: 0, totalPaginas: 0 }
    : (data?.paginacion ?? {
        pagina: paginaActual,
        porPagina: POR_PAGINA,
        total: 0,
        totalPaginas: 0,
      });

  const actualizarFiltros = (cambios) => {
    const siguientes = new URLSearchParams(searchParams);

    if ('mes' in cambios) {
      if (cambios.mes) siguientes.set('mes', cambios.mes);
      else siguientes.delete('mes');
      siguientes.delete('pagina');
    }

    if ('categoria' in cambios) {
      if (cambios.categoria) siguientes.set('categoria', String(cambios.categoria));
      else siguientes.delete('categoria');
      siguientes.delete('pagina');
    }

    if ('pagina' in cambios) {
      if (cambios.pagina > 1) siguientes.set('pagina', String(cambios.pagina));
      else siguientes.delete('pagina');
    }

    setSearchParams(siguientes);
  };

  const opcionesMeses = obtenerOpcionesMeses(6);
  const hayFiltrosActivos = Boolean(mesActivo || categoriaActiva);

  return (
    <>
      <title>Calendario de eventos | Parroquia Señor de la Exaltación</title>
      <meta
        name="description"
        content="Calendario completo de próximos eventos, celebraciones y actividades de la Parroquia Señor de la Exaltación en Obrajes, La Paz."
      />

      <EncabezadoPagina
        migas={[{ texto: 'Inicio', enlace: '/' }, { texto: 'Calendario' }]}
        eyebrow="Agenda parroquial"
        titulo="Calendario de eventos"
        bajada="Próximas celebraciones, catequesis, retiros y encuentros comunitarios de nuestra parroquia."
      />

      <Seccion fondo="blanco">
        <div className="mb-10 flex flex-col gap-4 border-b border-sand pb-6 lg:flex-row lg:items-center lg:justify-between">
          <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-label="Filtrar por categoría"
          >
            <button
              type="button"
              onClick={() => actualizarFiltros({ categoria: '' })}
              aria-pressed={!categoriaActiva}
              className={`min-h-11 cursor-pointer rounded-sm border px-4 py-2 font-body text-meta font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
                !categoriaActiva
                  ? 'border-ink bg-ink text-white'
                  : 'border-sand bg-white text-ink hover:border-ink'
              }`}
            >
              Todas
            </button>

            {categorias.map((cat) => {
              const idTexto = String(cat.id);
              const activo = categoriaActiva === idTexto;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => actualizarFiltros({ categoria: idTexto })}
                  aria-pressed={activo}
                  className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-sm border px-4 py-2 font-body text-meta font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
                    activo
                      ? 'border-ink bg-ink text-white'
                      : 'border-sand bg-white text-ink hover:border-ink'
                  }`}
                >
                  {cat.colorHex && (
                    <span
                      aria-hidden="true"
                      className="inline-block size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: cat.colorHex }}
                    />
                  )}
                  <span>{cat.nombre}</span>
                </button>
              );
            })}
          </div>

          <div className="flex w-full flex-wrap items-center gap-3 lg:w-auto">
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <label
                htmlFor="filtro-mes-calendario"
                className="font-body text-meta font-semibold text-muted"
              >
                Mes
              </label>
              <select
                id="filtro-mes-calendario"
                className="min-h-11 flex-1 rounded-sm border border-sand bg-white px-3 py-2 font-body text-meta font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:flex-initial"
                value={mesActivo}
                onChange={(evento) => actualizarFiltros({ mes: evento.target.value })}
              >
                <option value="">Todos los próximos meses</option>
                {opcionesMeses.map((opcion) => (
                  <option key={opcion.valor} value={opcion.valor}>
                    {opcion.etiqueta}
                  </option>
                ))}
              </select>
            </div>

            {hayFiltrosActivos && (
              <button
                type="button"
                className="min-h-11 cursor-pointer px-3 py-2 font-body text-meta font-semibold text-ink underline underline-offset-4 hover:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                onClick={() => setSearchParams({})}
              >
                Quitar filtros
              </button>
            )}
          </div>
        </div>

        <div ref={inicioListadoRef} tabIndex={-1} className="outline-none">
        {isPending && !esMesPasado ? (
          <CargandoSeccion alturaMinima={340} etiqueta="Cargando calendario de eventos" />
        ) : isError && !esMesPasado ? (
          <ErrorSeccion
            mensaje="No pudimos cargar los próximos eventos."
            onReintentar={refetch}
          />
        ) : eventos.length === 0 ? (
          <div className="space-y-4">
            <SinResultados
              mensaje={
                hayFiltrosActivos
                  ? 'No hay próximos eventos que coincidan con los filtros seleccionados.'
                  : 'No hay próximos eventos programados por el momento.'
              }
            />
            {hayFiltrosActivos && (
              <button
                type="button"
                onClick={() => setSearchParams({})}
                className="inline-flex min-h-11 cursor-pointer items-center rounded-sm border border-sand bg-white px-5 py-2.5 font-body text-meta font-semibold text-ink hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                Quitar filtros
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-10">
              {Object.entries(
                eventos.reduce((grupos, evento) => {
                  const diaIso = claveDiaBolivia(evento.fechaInicio);
                  if (!grupos[diaIso]) grupos[diaIso] = [];
                  grupos[diaIso].push(evento);
                  return grupos;
                }, {}),
              ).map(([diaIso, eventosDelDia]) => {
                const etiquetaDia = etiquetaDiaEvento(diaIso) || diaIso;
                return (
                  <section key={diaIso} aria-labelledby={`dia-calendario-${diaIso}`}>
                    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-sand pb-2">
                      <h2
                        id={`dia-calendario-${diaIso}`}
                        className="font-display text-2xl font-semibold text-ink"
                      >
                        <EnlacePortal
                          to={`/calendario/dia/${diaIso}`}
                          className="inline-flex min-h-11 items-center gap-2 underline-offset-4 transition-colors hover:underline hover:decoration-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                        >
                          <span>{etiquetaDia}</span>
                          <span className="font-body text-meta font-medium text-muted">
                            Ver día <span aria-hidden="true">→</span>
                          </span>
                        </EnlacePortal>
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                      {eventosDelDia.map((evento) => {
                        const { dia, mes } = formatearDiaMes(evento.fechaInicio);
                        const horaTexto = formatearHoraEvento(evento);
                        const mostrarDescripcion =
                          evento.descripcion && !/^Horarios:/i.test(evento.descripcion);
                        const atributosImagen = evento.imagen
                          ? construirAtributosImagen(evento.imagen, '96px')
                          : {};

                        return (
                          <article
                            key={evento.id}
                            className="group relative flex flex-col gap-4 rounded-md border border-sand bg-white p-6 transition-[border-color,transform] duration-150 hover:-translate-y-1 hover:border-gold focus-within:border-gold focus-within:ring-2 focus-within:ring-ink/25 sm:flex-row sm:items-start"
                          >
                            <div className="flex w-20 shrink-0 items-baseline gap-2 border-sand sm:flex-col sm:items-center sm:gap-0 sm:border-r sm:pr-4">
                              <span className="font-display text-h2 font-semibold lining-nums tabular-nums text-ink">
                                {dia}
                              </span>
                              <span className="font-body text-eyebrow font-semibold uppercase tracking-[0.2em] text-muted">
                                {mes}
                              </span>
                            </div>

                            <div className="min-w-0 flex-1">
                              {evento.categoria?.nombre && (
                                <p className="mb-1.5 inline-flex items-center gap-2 font-body text-meta font-semibold text-ink">
                                  {evento.categoria.colorHex && (
                                    <span
                                      aria-hidden="true"
                                      className="inline-block size-2.5 shrink-0 rounded-full"
                                      style={{ backgroundColor: evento.categoria.colorHex }}
                                    />
                                  )}
                                  <span>{evento.categoria.nombre}</span>
                                </p>
                              )}

                              <h3 className="font-display text-h3 font-semibold text-ink">
                                <EnlacePortal
                                  to={`/calendario/${evento.id}`}
                                  className="after:absolute after:inset-0 focus-visible:outline-none"
                                >
                                  {evento.titulo}
                                </EnlacePortal>
                              </h3>

                              <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-body text-meta tabular-nums text-muted">
                                <span className="inline-flex items-center gap-1.5">
                                  <Clock3 size={14} aria-hidden="true" />
                                  <span>{horaTexto}</span>
                                </span>

                                {evento.lugar && (
                                  <span className="inline-flex items-center gap-1.5">
                                    <MapPin size={14} aria-hidden="true" />
                                    <span>{evento.lugar}</span>
                                  </span>
                                )}
                              </p>

                              {mostrarDescripcion && (
                                <p className="mt-3 max-w-prose font-body text-body text-muted">
                                  {evento.descripcion}
                                </p>
                              )}

                              <p
                                aria-hidden="true"
                                className="mt-4 inline-flex items-center gap-1.5 font-body text-meta font-semibold text-ink transition-transform duration-150 group-hover:translate-x-0.5"
                              >
                                <span>Ver detalles</span>
                                <ArrowRight size={15} />
                              </p>
                            </div>

                            {evento.imagen?.url && (
                              <img
                                src={evento.imagen.url}
                                alt={evento.imagen.textoAlternativo || evento.titulo}
                                width={evento.imagen.ancho ?? undefined}
                                height={evento.imagen.alto ?? undefined}
                                className="size-24 shrink-0 rounded-sm border border-sand object-cover"
                                loading="lazy"
                                {...atributosImagen}
                              />
                            )}
                          </article>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>

            <PaginacionPortal
              paginaActual={paginacion.pagina}
              totalPaginas={paginacion.totalPaginas}
              etiqueta="Paginación del calendario"
              alCambiarPagina={(siguiente) => actualizarFiltros({ pagina: siguiente })}
              destinoFocoRef={inicioListadoRef}
            />
          </>
        )}
        </div>

        <p className="mt-8 flex items-center gap-2 font-body text-meta text-muted">
          <CalendarDays size={15} aria-hidden="true" />
          <span>
            Los eventos ya realizados se ocultan automáticamente. Sincronizado con el calendario de
            la secretaría.
          </span>
        </p>
      </Seccion>
    </>
  );
}

export default Calendario;
