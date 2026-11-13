import { useEffect, useEffectEvent, useId, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { AlertCircle, ClipboardCheck, Inbox, Loader2, Pencil, Plus, Search, X } from 'lucide-react';

import Paginacion from '../componentes/Paginacion.jsx';
import { formatearFecha } from '../multimedia/formato.js';
import { usePermisos } from '../permisos/usePermisos.js';
import { AvisoSoloLectura } from '../componentes/EstadoConsulta.jsx';
import { useEnfocarAviso } from '../componentes/useEnfocarAviso.js';
import AccionesEstado from './AccionesEstado.jsx';
import { CLAVE_PUBLICACIONES, ESTADOS, listarPublicaciones, TIPO_AVISO, TIPOS_DE_ESTA_PANTALLA } from './api.js';
import InsigniaSituacion from './InsigniaSituacion.jsx';
import PestanasPublicaciones from './PestanasPublicaciones.jsx';

const ESPERA_BUSQUEDA_MS = 400;

const estiloControl =
  'w-full rounded-md border border-borderSoft bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-goldDark';

// Los filtros viven en la URL (se conservan al recargar). Un valor desconocido se descarta.
function leerFiltros(parametros, esAvisos) {
  const estado = parametros.get('estado');
  const tipo = parametros.get('tipo');
  const pagina = Number.parseInt(parametros.get('pagina'), 10);

  return {
    estado: estado in ESTADOS ? estado : '',
    // En la pestaña de avisos el tipo es siempre AVISO; en la otra, el filtro es opcional.
    tipo: esAvisos ? TIPO_AVISO : tipo in TIPOS_DE_ESTA_PANTALLA ? tipo : '',
    buscar: parametros.get('buscar')?.trim() ?? '',
    autor: parametros.get('autor') === 'yo' ? 'yo' : '',
    pagina: pagina >= 1 ? pagina : 1,
  };
}

function Selector({ etiqueta, valor, opciones, onChange }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-semibold text-muted">
        {etiqueta}
      </label>
      <select id={id} value={valor} onChange={(e) => onChange(e.target.value)} className={estiloControl}>
        {opciones.map(([clave, texto]) => (
          <option key={clave} value={clave}>
            {texto}
          </option>
        ))}
      </select>
    </div>
  );
}

function Filtros({ valores, hayFiltros, mostrarTipo, onCambiar, onLimpiar }) {
  const idBusqueda = useId();
  const idMias = useId();
  const [texto, setTexto] = useState(valores.buscar);

  // Si la búsqueda cambia desde fuera (por ejemplo, «Quitar los filtros»), el campo la refleja.
  const [buscarPrevio, setBuscarPrevio] = useState(valores.buscar);
  if (buscarPrevio !== valores.buscar) {
    setBuscarPrevio(valores.buscar);
    if (texto.trim() !== valores.buscar) setTexto(valores.buscar);
  }

  const aplicarBusqueda = useEffectEvent((buscar) => onCambiar({ buscar }));

  useEffect(() => {
    const buscar = texto.trim();
    if (buscar === valores.buscar) return undefined;
    const temporizador = setTimeout(() => aplicarBusqueda(buscar), ESPERA_BUSQUEDA_MS);
    return () => clearTimeout(temporizador);
  }, [texto, valores.buscar]);

  return (
    <form
      role="search"
      aria-label={mostrarTipo ? 'Filtros de publicaciones' : 'Filtros de avisos'}
      onSubmit={(e) => e.preventDefault()}
      className={`grid gap-3 sm:grid-cols-2 lg:items-end ${
        mostrarTipo ? 'lg:grid-cols-[2fr_1fr_1fr_auto_auto]' : 'lg:grid-cols-[2fr_1fr_auto_auto]'
      }`}
    >
      <div className="flex flex-col gap-1">
        <label htmlFor={idBusqueda} className="text-xs font-semibold text-muted">
          Buscar
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            id={idBusqueda}
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Título o resumen"
            className={`${estiloControl} pl-9`}
          />
        </div>
      </div>

      <Selector
        etiqueta="Estado"
        valor={valores.estado}
        onChange={(estado) => onCambiar({ estado })}
        opciones={[['', 'Todos'], ...Object.entries(ESTADOS)]}
      />
      {mostrarTipo && (
        <Selector
          etiqueta="Tipo"
          valor={valores.tipo}
          onChange={(tipo) => onCambiar({ tipo })}
          opciones={[['', 'Todos'], ...Object.entries(TIPOS_DE_ESTA_PANTALLA)]}
        />
      )}

      <label htmlFor={idMias} className="flex items-center gap-2 py-2 text-sm font-medium">
        <input
          id={idMias}
          type="checkbox"
          checked={valores.autor === 'yo'}
          onChange={(e) => onCambiar({ autor: e.target.checked ? 'yo' : '' })}
          className="size-4 accent-goldDark"
        />
        Solo las mías
      </label>

      <button
        type="button"
        onClick={() => {
          setTexto('');
          onLimpiar();
        }}
        disabled={!hayFiltros && !texto}
        className="flex items-center justify-center gap-1.5 rounded-md border border-borderSoft bg-white px-3 py-2 text-sm font-medium hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
      >
        <X className="size-4" aria-hidden="true" /> Limpiar filtros
      </button>
    </form>
  );
}

// `modo`: 'noticias' (por defecto) o 'avisos'. Mismo listado para ambos: cambian el tipo, los textos y los botones.
export default function ListadoPublicaciones({ modo = 'noticias' }) {
  const esAvisos = modo === 'avisos';
  const [parametros, setParametros] = useSearchParams();
  const ubicacion = useLocation();
  const [avisoAccion, setAvisoAccion] = useState('');
  const aviso = avisoAccion || ubicacion.state?.aviso;
  // Archivar, restaurar o eliminar cambia o quita la fila: el foco pasa al mensaje de confirmación.
  const avisoRef = useEnfocarAviso(aviso);
  const filtros = leerFiltros(parametros, esAvisos);
  const { puede } = usePermisos();
  const hayFiltros = Boolean(filtros.estado || (!esAvisos && filtros.tipo) || filtros.buscar || filtros.autor);

  const { data, isPending, isError, error, isPlaceholderData, refetch } = useQuery({
    queryKey: [...CLAVE_PUBLICACIONES, 'lista', filtros],
    queryFn: ({ signal }) => listarPublicaciones(filtros, signal),
    placeholderData: keepPreviousData,
  });
  const publicaciones = data?.datos ?? [];

  // Cambiar un filtro vuelve a la primera página.
  function cambiar(cambios) {
    const siguiente = { ...filtros, pagina: 1, ...cambios };
    const nuevos = new URLSearchParams();
    if (siguiente.estado) nuevos.set('estado', siguiente.estado);
    if (siguiente.tipo && !esAvisos) nuevos.set('tipo', siguiente.tipo);
    if (siguiente.buscar) nuevos.set('buscar', siguiente.buscar);
    if (siguiente.autor) nuevos.set('autor', siguiente.autor);
    if (siguiente.pagina > 1) nuevos.set('pagina', String(siguiente.pagina));
    setParametros(nuevos, { replace: true });
  }

  const limpiar = () => setParametros(new URLSearchParams(), { replace: true });

  return (
    <section className="mx-auto max-w-6xl">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold text-ink">{esAvisos ? 'Avisos' : 'Publicaciones'}</h1>
          <p className="mt-2 text-muted">
            {esAvisos
              ? 'Avisos parroquiales. Se publican directamente, sin revisión, y se pueden programar y archivar.'
              : 'Noticias y notas de prensa de la sede.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!esAvisos && puede('noticias.publicar') && (
            <Link
              to="/admin/publicaciones/revision"
              className="flex items-center gap-2 rounded-md border border-borderSoft bg-white px-4 py-2.5 font-medium hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark"
            >
              <ClipboardCheck className="size-4" aria-hidden="true" /> Bandeja de revisión
            </Link>
          )}
          {esAvisos && puede('avisos.gestionar') && (
            <Link
              to="/admin/publicaciones/avisos/nuevo"
              className="flex items-center gap-2 rounded-md bg-gold px-4 py-2.5 font-semibold text-ink hover:bg-goldDark hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-goldDark"
            >
              <Plus className="size-4" aria-hidden="true" /> Nuevo aviso
            </Link>
          )}
          {!esAvisos && puede('noticias.redactar') && (
            <Link
              to="/admin/publicaciones/nueva"
              className="flex items-center gap-2 rounded-md bg-gold px-4 py-2.5 font-semibold text-ink hover:bg-goldDark hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-goldDark"
            >
              <Plus className="size-4" aria-hidden="true" /> Nueva publicación
            </Link>
          )}
        </div>
      </header>

      <PestanasPublicaciones />
      {esAvisos && !puede('avisos.gestionar') && (
        <AvisoSoloLectura>Tu rol puede consultar los avisos, pero no crearlos ni modificarlos.</AvisoSoloLectura>
      )}

      {aviso && (
        <p
          ref={avisoRef}
          role="status"
          tabIndex={-1}
          className="mt-4 rounded-md bg-goldPale px-3 py-2 text-sm text-goldDark outline-none focus-visible:outline-2 focus-visible:outline-goldDark"
        >
          {aviso}
        </p>
      )}

      <div className="mt-6 rounded-lg border border-borderSoft bg-white p-4">
        <Filtros
          valores={filtros}
          hayFiltros={hayFiltros}
          mostrarTipo={!esAvisos}
          onCambiar={cambiar}
          onLimpiar={limpiar}
        />
      </div>

      <div className="mt-6" aria-busy={isPending || isPlaceholderData}>
        {isPending && (
          <p role="status" className="flex items-center gap-2 py-10 text-sm text-muted">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Cargando publicaciones…
          </p>
        )}

        {isError && !data && (
          <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-redParish/30 bg-redParish/5 p-4 text-sm text-redParish">
            <p className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              No se pudieron cargar las publicaciones: {error.message}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-md border border-redParish/40 bg-white px-3 py-1.5 font-medium hover:bg-redParish/5 focus-visible:outline-2 focus-visible:outline-redParish"
            >
              Reintentar
            </button>
          </div>
        )}

        {data && (
          <>
            <p className="mb-3 text-sm text-muted" aria-live="polite">
              {data.paginacion.total}{' '}
              {esAvisos
                ? data.paginacion.total === 1
                  ? 'aviso'
                  : 'avisos'
                : data.paginacion.total === 1
                  ? 'publicación'
                  : 'publicaciones'}
              {hayFiltros && ' con estos filtros'}
            </p>

            {publicaciones.length ? (
              // `relative`: los textos solo para lectores de pantalla (sr-only, position: absolute) de las celdas se quedan
              // dentro del recorte; sin eso la última columna ensanchaba toda la página en móvil.
              // Con tabIndex el scroll horizontal también se alcanza con el teclado.
              <div
                role="region"
                aria-label={esAvisos ? 'Tabla de avisos' : 'Tabla de publicaciones'}
                tabIndex={0}
                className={`relative overflow-x-auto rounded-lg border border-borderSoft bg-white focus-visible:outline-2 focus-visible:outline-goldDark ${isPlaceholderData ? 'opacity-60' : ''}`}
              >
                {/* En móvil se ocultan Tipo, Autor y Publicación (pasan a una línea bajo el título) para que las
                    acciones queden a la vista sin desplazar la tabla; desde `md` salen todas las columnas. */}
                <table className="w-full text-left text-sm md:min-w-[40rem]">
                  <caption className="sr-only">{esAvisos ? 'Avisos' : 'Publicaciones'}</caption>
                  <thead className="border-b border-borderSoft bg-stone text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-semibold">Título</th>
                      <th scope="col" className="hidden px-4 py-3 font-semibold md:table-cell">Tipo</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Situación</th>
                      <th scope="col" className="hidden px-4 py-3 font-semibold md:table-cell">Autor</th>
                      <th scope="col" className="hidden px-4 py-3 font-semibold md:table-cell">Publicación</th>
                      <th scope="col" className="px-4 py-3 font-semibold"><span className="sr-only">Acciones</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-borderSoft">
                    {publicaciones.map((publicacion) => (
                      <tr key={publicacion.id}>
                        <th scope="row" className="px-3 py-3 font-semibold text-ink md:px-4">
                          {publicacion.titulo}
                          {/* Solo en móvil: lo que las columnas ocultas muestran en escritorio. */}
                          <span className="mt-1 block text-xs font-normal text-muted md:hidden">
                            {[
                              publicacion.tipo.nombre,
                              publicacion.autor.nombreCompleto,
                              publicacion.fechaPublicacion ? formatearFecha(publicacion.fechaPublicacion) : 'Sin fecha',
                            ].join(' · ')}
                          </span>
                        </th>
                        <td className="hidden px-4 py-3 text-charcoal md:table-cell">{publicacion.tipo.nombre}</td>
                        <td className="px-3 py-3 md:px-4">
                          <InsigniaSituacion publicacion={publicacion} />
                        </td>
                        <td className="hidden px-4 py-3 text-charcoal md:table-cell">{publicacion.autor.nombreCompleto}</td>
                        <td className="hidden whitespace-nowrap px-4 py-3 text-charcoal md:table-cell">
                          {publicacion.fechaPublicacion ? formatearFecha(publicacion.fechaPublicacion) : 'Sin fecha'}
                          {esAvisos && publicacion.fechaExpiracion && (
                            <span className="block text-xs text-muted">
                              Expira: {formatearFecha(publicacion.fechaExpiracion)}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right md:px-4">
                          {/* En móvil los botones se apilan (columna estrecha); desde `sm` van en fila. */}
                          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                          {/* Los botones salen de `acciones`: la API dice qué puede hacer esta sesión. */}
                          {publicacion.acciones.includes('EDITAR') && (
                            <Link
                              to={`/admin/publicaciones/${publicacion.id}/editar`}
                              aria-label={`Editar «${publicacion.titulo}»`}
                              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-borderSoft bg-white px-3 py-1.5 text-xs font-medium hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark"
                            >
                              <Pencil className="size-3.5" aria-hidden="true" /> Editar
                            </Link>
                          )}
                          <AccionesEstado
                            publicacion={publicacion}
                            alTerminar={(mensaje) => {
                              setAvisoAccion(mensaje);
                            }}
                          />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-borderSoft bg-white py-12 text-center text-muted">
                <Inbox className="size-10" aria-hidden="true" />
                <p>
                  {hayFiltros
                    ? `No hay ${esAvisos ? 'avisos' : 'publicaciones'} que coincidan con los filtros.`
                    : `Todavía no hay ${esAvisos ? 'avisos' : 'publicaciones'}.`}
                </p>
                {hayFiltros && (
                  <button
                    type="button"
                    onClick={limpiar}
                    className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-ink hover:bg-goldDark hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-goldDark"
                  >
                    Quitar los filtros
                  </button>
                )}
              </div>
            )}

            <Paginacion
              paginacion={data.paginacion}
              nombre={esAvisos ? 'Paginación de avisos' : 'Paginación de publicaciones'}
              onCambiar={(pagina) => cambiar({ pagina })}
            />
          </>
        )}
      </div>
    </section>
  );
}
