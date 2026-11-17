import { useEffect, useEffectEvent, useId, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ClipboardCheck, Inbox, Pencil, Plus, Search, X } from 'lucide-react';

import Paginacion from '../componentes/Paginacion.jsx';
import { formatearFecha } from '../multimedia/formato.js';
import { usePermisos } from '../permisos/usePermisos.js';
import {
  Aviso,
  Boton,
  CampoCasilla,
  CampoSelect,
  EncabezadoPantalla,
  EsqueletoTabla,
  EstadoVacio,
  useToast,
} from '../ui/index.js';
import AccionesEstado from './AccionesEstado.jsx';
import { CLAVE_PUBLICACIONES, ESTADOS, listarPublicaciones, TIPO_AVISO, TIPOS_DE_ESTA_PANTALLA } from './api.js';
import InsigniaSituacion from './InsigniaSituacion.jsx';
import PestanasPublicaciones from './PestanasPublicaciones.jsx';

const ESPERA_BUSQUEDA_MS = 400;

const estiloControl =
  'w-full min-h-11 rounded-md border border-sand bg-white px-3 py-2 text-sm text-ink placeholder:text-muted/75 transition-colors duration-150 ease-salida focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink';

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

function Filtros({ valores, hayFiltros, mostrarTipo, onCambiar, onLimpiar }) {
  const idBusqueda = useId();
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
      <div className="flex flex-col gap-1.5">
        <label htmlFor={idBusqueda} className="text-sm font-semibold text-ink">
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

      <CampoSelect
        etiqueta="Estado"
        value={valores.estado}
        onChange={(e) => onCambiar({ estado: e.target.value })}
        opciones={[['', 'Todos'], ...Object.entries(ESTADOS)]}
      />

      {mostrarTipo && (
        <CampoSelect
          etiqueta="Tipo"
          value={valores.tipo}
          onChange={(e) => onCambiar({ tipo: e.target.value })}
          opciones={[['', 'Todos'], ...Object.entries(TIPOS_DE_ESTA_PANTALLA)]}
        />
      )}

      <div className="flex items-center pb-2.5">
        <CampoCasilla
          etiqueta="Solo las mías"
          checked={valores.autor === 'yo'}
          onChange={(e) => onCambiar({ autor: e.target.checked ? 'yo' : '' })}
        />
      </div>

      <Boton
        variante="secundario"
        icono={X}
        onClick={() => {
          setTexto('');
          onLimpiar();
        }}
        disabled={!hayFiltros && !texto}
      >
        Limpiar filtros
      </Boton>
    </form>
  );
}

// `modo`: 'noticias' (por defecto) o 'avisos'. Mismo listado para ambos: cambian el tipo, los textos y los botones.
export default function ListadoPublicaciones({ modo = 'noticias' }) {
  const esAvisos = modo === 'avisos';
  const [parametros, setParametros] = useSearchParams();
  const toast = useToast();
  // Al desaparecer una fila o su botón de acción, el foco vuelve al <h1> de la pantalla.
  const tituloRef = useRef(null);
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
      <EncabezadoPantalla
        titulo={esAvisos ? 'Avisos' : 'Publicaciones'}
        headingRef={tituloRef}
        descripcion={
          esAvisos
            ? 'Avisos parroquiales. Se publican directamente, sin revisión, y se pueden programar y archivar.'
            : 'Noticias y notas de prensa de la sede.'
        }
        acciones={
          <>
            {!esAvisos && puede('noticias.publicar') && (
              <Boton como={Link} to="/admin/publicaciones/revision" variante="secundario" icono={ClipboardCheck}>
                Bandeja de revisión
              </Boton>
            )}
            {esAvisos && puede('avisos.gestionar') && (
              <Boton como={Link} to="/admin/publicaciones/avisos/nuevo" variante="primario" icono={Plus}>
                Nuevo aviso
              </Boton>
            )}
            {!esAvisos && puede('noticias.redactar') && (
              <Boton como={Link} to="/admin/publicaciones/nueva" variante="primario" icono={Plus}>
                Nueva publicación
              </Boton>
            )}
          </>
        }
      />

      <PestanasPublicaciones />
      {esAvisos && !puede('avisos.gestionar') && (
        <Aviso tipo="soloLectura" className="mt-4">
          <p>
            <strong className="font-semibold text-ink">Solo lectura.</strong> Tu rol puede consultar los avisos, pero no
            crearlos ni modificarlos.
          </p>
        </Aviso>
      )}

      <div className="mt-6 rounded-lg border border-sand bg-white p-4">
        <Filtros
          valores={filtros}
          hayFiltros={hayFiltros}
          mostrarTipo={!esAvisos}
          onCambiar={cambiar}
          onLimpiar={limpiar}
        />
      </div>

      <div className="mt-6" aria-busy={isPending || isPlaceholderData}>
        {isPending && <EsqueletoTabla filas={5} columnas={5} etiqueta="Cargando publicaciones…" />}

        {isError && !data && (
          <Aviso
            tipo="error"
            accion={
              <Boton variante="secundario" tamano="sm" onClick={() => refetch()}>
                Reintentar
              </Boton>
            }
          >
            <p>No se pudieron cargar las publicaciones: {error.message}</p>
          </Aviso>
        )}

        {data && (
          <>
            <p className="mb-3 text-sm tabular-nums text-muted" aria-live="polite">
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
                className={`relative overflow-x-auto rounded-lg border border-sand bg-white focus-visible:outline-2 focus-visible:outline-ink ${isPlaceholderData ? 'opacity-60' : ''}`}
              >
                {/* En móvil se ocultan Tipo, Autor y Publicación (pasan a una línea bajo el título) para que las
                    acciones queden a la vista sin desplazar la tabla; desde `md` salen todas las columnas. */}
                <table className="w-full text-left text-sm md:min-w-[40rem]">
                  <caption className="sr-only">{esAvisos ? 'Avisos' : 'Publicaciones'}</caption>
                  <thead className="border-b border-sand bg-panel text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th scope="col" className="px-3 py-3 font-semibold md:min-w-64 2xl:px-4">Título</th>
                      <th scope="col" className="hidden px-3 py-3 font-semibold md:table-cell 2xl:px-4">Tipo</th>
                      <th scope="col" className="px-3 py-3 font-semibold 2xl:px-4">Situación</th>
                      <th scope="col" className="hidden px-3 py-3 font-semibold 2xl:table-cell 2xl:px-4">Autor</th>
                      <th scope="col" className="hidden px-3 py-3 font-semibold md:table-cell 2xl:px-4">Publicación</th>
                      <th scope="col" className="px-3 py-3 font-semibold 2xl:px-4"><span className="sr-only">Acciones</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sand bg-white">
                    {publicaciones.map((publicacion) => (
                      <tr key={publicacion.id} className="transition-colors duration-150 ease-salida hover:bg-panel/70 motion-reduce:transition-none">
                        <th scope="row" className="px-3 py-3 font-semibold text-ink 2xl:px-4">
                          {publicacion.titulo}
                          {/* En anchos intermedios (`md`–`xl`), Autor baja bajo el título para priorizar su ancho y evitar recorte en acciones. */}
                          <span className="mt-0.5 hidden text-xs font-normal text-muted md:block 2xl:hidden">
                            Por {publicacion.autor.nombreCompleto}
                          </span>
                          {/* Solo en móvil: lo que las columnas ocultas muestran en escritorio. */}
                          <span className="mt-1 block text-xs font-normal text-muted md:hidden">
                            {[
                              publicacion.tipo.nombre,
                              publicacion.autor.nombreCompleto,
                              publicacion.fechaPublicacion ? formatearFecha(publicacion.fechaPublicacion) : 'Sin fecha',
                            ].join(' · ')}
                          </span>
                        </th>
                        <td className="hidden px-3 py-3 text-ink md:table-cell 2xl:px-4">{publicacion.tipo.nombre}</td>
                        <td className="px-3 py-3 2xl:px-4">
                          <InsigniaSituacion publicacion={publicacion} />
                        </td>
                        <td className="hidden px-3 py-3 text-ink 2xl:table-cell 2xl:px-4">{publicacion.autor.nombreCompleto}</td>
                        <td className="hidden whitespace-nowrap px-3 py-3 tabular-nums text-ink md:table-cell 2xl:px-4">
                          {publicacion.fechaPublicacion ? formatearFecha(publicacion.fechaPublicacion) : 'Sin fecha'}
                          {esAvisos && publicacion.fechaExpiracion && (
                            <span className="block text-xs text-muted">
                              Expira: {formatearFecha(publicacion.fechaExpiracion)}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right md:w-px md:whitespace-nowrap 2xl:px-4">
                          {/* En móvil los botones se apilan (columna estrecha); desde `sm` van en fila. */}
                          <div className="flex flex-col items-stretch gap-1.5 sm:flex-row sm:flex-nowrap sm:justify-end">
                            {/* Los botones salen de `acciones`: la API dice qué puede hacer esta sesión. */}
                            {publicacion.acciones.includes('EDITAR') && (
                              <Boton
                                como={Link}
                                to={`/admin/publicaciones/${publicacion.id}/editar`}
                                variante="secundario"
                                tamano="sm"
                                icono={Pencil}
                                className="md:px-2.5 2xl:px-3"
                                aria-label={`Editar «${publicacion.titulo}»`}
                              >
                                Editar
                              </Boton>
                            )}
                            <AccionesEstado
                              publicacion={publicacion}
                              alTerminar={(mensaje) => {
                                toast.exito(mensaje);
                                setTimeout(() => tituloRef.current?.focus(), 0);
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
              <EstadoVacio
                icono={Inbox}
                titulo={
                  hayFiltros
                    ? `No hay ${esAvisos ? 'avisos' : 'publicaciones'} que coincidan con los filtros.`
                    : `Todavía no hay ${esAvisos ? 'avisos' : 'publicaciones'}.`
                }
                descripcion={
                  hayFiltros
                    ? 'Prueba limpiar los filtros para ver todos los registros.'
                    : 'Crea el primer registro para empezar a publicar en el portal.'
                }
                accion={
                  hayFiltros ? (
                    <Boton variante="primario" onClick={limpiar}>
                      Quitar los filtros
                    </Boton>
                  ) : esAvisos && puede('avisos.gestionar') ? (
                    <Boton como={Link} to="/admin/publicaciones/avisos/nuevo" variante="primario" icono={Plus}>
                      Nuevo aviso
                    </Boton>
                  ) : !esAvisos && puede('noticias.redactar') ? (
                    <Boton como={Link} to="/admin/publicaciones/nueva" variante="primario" icono={Plus}>
                      Nueva publicación
                    </Boton>
                  ) : null
                }
              />
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
