import { Link, useSearchParams } from 'react-router';
import { ArrowLeft, CalendarDays, Clock3, MapPin } from 'lucide-react';

import '../styles/parroquia.css';
import '../styles/Agenda.css';
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
import { construirAtributosImagen } from '../components/parroquia/imagenSrcSet.js';
import { useCategoriasEvento, useEventos } from '../hooks/index.js';
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
    <div className="font-body">
      <title>Calendario de eventos | Parroquia Señor de la Exaltación</title>
      <meta
        name="description"
        content="Calendario completo de próximos eventos, celebraciones y actividades de la Parroquia Señor de la Exaltación en Obrajes, La Paz."
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
              <span>Calendario</span>
            </nav>

            <p className="eyebrow">Agenda parroquial</p>
            <h1 className="serif-title noticias-titulo">Calendario de eventos</h1>
            <p className="noticias-subtitulo">
              Próximas celebraciones, catequesis, retiros y encuentros comunitarios de nuestra
              parroquia.
            </p>
          </div>
        </section>

        <section className="noticias-cuerpo">
          <div className={anchoContenido}>
            <div className="noticias-filtros">
              <div className="noticias-tipos" role="group" aria-label="Filtrar por categoría">
                <button
                  type="button"
                  onClick={() => actualizarFiltros({ categoria: '' })}
                  className={`noticias-filtro-boton ${
                    !categoriaActiva ? 'noticias-filtro-boton-activo' : ''
                  }`}
                  aria-pressed={!categoriaActiva}
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
                      className={`noticias-filtro-boton ${
                        activo ? 'noticias-filtro-boton-activo' : ''
                      }`}
                      aria-pressed={activo}
                    >
                      {cat.nombre}
                    </button>
                  );
                })}
              </div>

              <div className="noticias-categoria-grupo">
                <label htmlFor="filtro-mes-calendario" className="noticias-categoria-etiqueta">
                  Mes
                </label>
                <select
                  id="filtro-mes-calendario"
                  className="noticias-categoria-select"
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

            {isPending && !esMesPasado ? (
              <CargandoSeccion alturaMinima={340} etiqueta="Cargando calendario de eventos" />
            ) : isError && !esMesPasado ? (
              <ErrorSeccion
                mensaje="No pudimos cargar los próximos eventos."
                onReintentar={refetch}
              />
            ) : eventos.length === 0 ? (
              <SinResultados
                mensaje={
                  hayFiltrosActivos
                    ? 'No hay próximos eventos que coincidan con los filtros seleccionados.'
                    : 'No hay próximos eventos programados por el momento.'
                }
              />
            ) : (
              <>
                <div className="calendario-lista">
                  {eventos.map((evento) => {
                    const { dia, mes } = formatearDiaMes(evento.fechaInicio);
                    const horaTexto = formatearHoraEvento(evento);
                    const mostrarDescripcion =
                      evento.descripcion && !/^Horarios:/i.test(evento.descripcion);
                    const atributosImagen = evento.imagen
                      ? construirAtributosImagen(evento.imagen, '84px')
                      : {};

                    return (
                      <article key={evento.id} className="calendario-evento">
                        <div className="agenda-fecha">
                          <span className="agenda-fecha-dia">{dia}</span>
                          <span className="agenda-fecha-mes">{mes}</span>
                        </div>

                        <div className="agenda-evento-informacion">
                          {evento.categoria?.nombre && (
                            <p className="calendario-evento-categoria">
                              {evento.categoria.colorHex && (
                                <span
                                  className="calendario-evento-punto"
                                  style={{ backgroundColor: evento.categoria.colorHex }}
                                  aria-hidden="true"
                                />
                              )}
                              {evento.categoria.nombre}
                            </p>
                          )}

                          <h2 className="agenda-evento-titulo">{evento.titulo}</h2>

                          <p className="agenda-evento-detalle">
                            <Clock3 size={13} aria-hidden="true" />
                            {horaTexto}

                            {evento.lugar && (
                              <>
                                <span className="agenda-evento-separador">·</span>
                                <MapPin size={13} aria-hidden="true" />
                                {evento.lugar}
                              </>
                            )}
                          </p>

                          {mostrarDescripcion && (
                            <p className="calendario-evento-descripcion">{evento.descripcion}</p>
                          )}
                        </div>

                        {evento.imagen?.url && (
                          <img
                            src={evento.imagen.url}
                            alt={evento.imagen.textoAlternativo || evento.titulo}
                            width={evento.imagen.ancho ?? undefined}
                            height={evento.imagen.alto ?? undefined}
                            className="calendario-evento-imagen"
                            loading="lazy"
                            {...atributosImagen}
                          />
                        )}
                      </article>
                    );
                  })}
                </div>

                <PaginacionPortal
                  paginaActual={paginacion.pagina}
                  totalPaginas={paginacion.totalPaginas}
                  etiqueta="Paginación del calendario"
                  alCambiarPagina={(siguiente) => actualizarFiltros({ pagina: siguiente })}
                />
              </>
            )}

            <p className="agenda-nota">
              <CalendarDays size={14} aria-hidden="true" />
              Los eventos ya realizados se ocultan automáticamente. Sincronizado con el calendario
              de la secretaría.
            </p>
          </div>
        </section>
      </main>

      <PiePagina />
    </div>
  );
}

export default Calendario;

