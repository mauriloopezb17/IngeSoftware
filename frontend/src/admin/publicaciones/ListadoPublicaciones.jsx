import { useMemo, useRef } from 'react';
import { Link } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ClipboardCheck, Inbox, Pencil, Plus } from 'lucide-react';

import { formatearFecha } from '../multimedia/formato.js';
import { usePermisos } from '../permisos/usePermisos.js';
import {
  Aviso,
  Boton,
  BotonExportarCsv,
  CampoCasilla,
  CampoSelect,
  EncabezadoPantalla,
  TablaListado,
  useFiltrosListado,
  useToast,
} from '../ui/index.js';
import AccionesEstado from './AccionesEstado.jsx';
import {
  CLAVE_CATALOGOS,
  CLAVE_PUBLICACIONES,
  ESTADOS,
  listarPublicaciones,
  obtenerCatalogos,
  POR_PAGINA,
  TIPO_AVISO,
  TIPOS_DE_ESTA_PANTALLA,
} from './api.js';
import InsigniaSituacion from './InsigniaSituacion.jsx';
import PestanasPublicaciones from './PestanasPublicaciones.jsx';

// `modo`: 'noticias' (por defecto) o 'avisos'. Mismo listado para ambos: cambian el tipo, los textos y los botones.
export default function ListadoPublicaciones({ modo = 'noticias' }) {
  const esAvisos = modo === 'avisos';
  const toast = useToast();
  // Al desaparecer una fila o su botón de acción, el foco vuelve al <h1> de la pantalla.
  const tituloRef = useRef(null);
  const { puede } = usePermisos();

  const configFiltros = useMemo(
    () => ({
      estado: { defecto: '', validar: (v) => v in ESTADOS },
      categoria: { defecto: '' },
      ...(esAvisos
        ? {}
        : { tipo: { defecto: '', validar: (v) => v in TIPOS_DE_ESTA_PANTALLA } }),
      autor: { defecto: '', validar: (v) => v === 'yo' },
    }),
    [esAvisos],
  );

  const {
    valores,
    busqueda,
    setBusqueda,
    setPagina,
    actualizarFiltro,
    limpiarFiltros,
    hayFiltrosActivos,
    filtrosActivos,
  } = useFiltrosListado({
    filtros: configFiltros,
    porPagina: POR_PAGINA,
  });

  const filtrosApi = useMemo(
    () => ({
      ...filtrosActivos,
      ...(esAvisos ? { tipo: TIPO_AVISO } : {}),
    }),
    [filtrosActivos, esAvisos],
  );

  const catalogos = useQuery({
    queryKey: CLAVE_CATALOGOS,
    queryFn: obtenerCatalogos,
    staleTime: 5 * 60 * 1000,
  });

  const { data, isPending, isError, error, isPlaceholderData, refetch } = useQuery({
    queryKey: [...CLAVE_PUBLICACIONES, 'lista', filtrosApi],
    queryFn: ({ signal }) => listarPublicaciones(filtrosApi, signal),
    placeholderData: keepPreviousData,
  });

  const publicaciones = data?.datos ?? [];
  const categorias = catalogos.data?.categoriasPublicacion ?? [];

  const columnas = [
    {
      id: 'titulo',
      encabezado: 'Título',
      claseEncabezado: 'md:min-w-64',
      claseCelda: 'font-semibold text-ink',
      render: (publicacion) => (
        <>
          <span>{publicacion.titulo}</span>
          <span className="mt-0.5 hidden text-xs font-normal text-muted md:block 2xl:hidden">
            Por {publicacion.autor.nombreCompleto}
          </span>
          <span className="mt-1 block text-xs font-normal text-muted md:hidden">
            {[
              publicacion.tipo.nombre,
              publicacion.autor.nombreCompleto,
              publicacion.fechaPublicacion ? formatearFecha(publicacion.fechaPublicacion) : 'Sin fecha',
            ].join(' · ')}
          </span>
        </>
      ),
    },
    {
      id: 'tipo',
      encabezado: 'Tipo',
      claseEncabezado: 'hidden md:table-cell',
      claseCelda: 'hidden md:table-cell',
      render: (publicacion) => publicacion.tipo.nombre,
    },
    {
      id: 'situacion',
      encabezado: 'Situación',
      render: (publicacion) => <InsigniaSituacion publicacion={publicacion} />,
    },
    {
      id: 'autor',
      encabezado: 'Autor',
      claseEncabezado: 'hidden 2xl:table-cell',
      claseCelda: 'hidden 2xl:table-cell',
      render: (publicacion) => publicacion.autor.nombreCompleto,
    },
    {
      id: 'publicacion',
      encabezado: 'Publicación',
      claseEncabezado: 'hidden md:table-cell',
      claseCelda: 'hidden whitespace-nowrap tabular-nums md:table-cell',
      render: (publicacion) => (
        <>
          {publicacion.fechaPublicacion ? formatearFecha(publicacion.fechaPublicacion) : 'Sin fecha'}
          {esAvisos && publicacion.fechaExpiracion && (
            <span className="block text-xs text-muted">
              Expira: {formatearFecha(publicacion.fechaExpiracion)}
            </span>
          )}
        </>
      ),
    },
    {
      id: 'acciones',
      encabezado: <span className="sr-only">Acciones</span>,
      claseCelda: 'text-right md:w-px md:whitespace-nowrap',
      render: (publicacion) => (
        <div className="flex flex-col items-stretch gap-1.5 sm:flex-row sm:flex-nowrap sm:justify-end">
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
      ),
    },
  ];

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
            <BotonExportarCsv
              recurso="publicaciones"
              permiso="publicaciones.exportar"
              filtros={filtrosApi}
            />
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

      <div className="mt-6">
        <TablaListado
          caption={esAvisos ? 'Avisos' : 'Publicaciones'}
          columnas={columnas}
          datos={publicaciones}
          paginacion={data?.paginacion}
          onCambiarPagina={setPagina}
          cargando={isPending}
          tenue={isPlaceholderData}
          error={isError && !data ? `No se pudieron cargar las publicaciones: ${error.message}` : null}
          onReintentar={refetch}
          busqueda={busqueda}
          onCambiarBusqueda={setBusqueda}
          placeholderBusqueda="Título o resumen"
          categoria={
            categorias.length > 0
              ? {
                  etiqueta: 'Categoría',
                  valor: valores.categoria,
                  opciones: categorias.map((c) => ({ valor: c.slug, etiqueta: c.nombre })),
                  onCambiar: (v) => actualizarFiltro('categoria', v),
                }
              : undefined
          }
          filtrosExtra={
            <>
              <div className="w-full sm:w-auto sm:min-w-[150px]">
                <CampoSelect
                  etiqueta="Estado"
                  value={valores.estado}
                  onChange={(e) => actualizarFiltro('estado', e.target.value)}
                  opciones={[['', 'Todos'], ...Object.entries(ESTADOS)]}
                />
              </div>

              {!esAvisos && (
                <div className="w-full sm:w-auto sm:min-w-[150px]">
                  <CampoSelect
                    etiqueta="Tipo"
                    value={valores.tipo}
                    onChange={(e) => actualizarFiltro('tipo', e.target.value)}
                    opciones={[['', 'Todos'], ...Object.entries(TIPOS_DE_ESTA_PANTALLA)]}
                  />
                </div>
              )}

              <div className="flex min-h-11 items-center">
                <CampoCasilla
                  etiqueta="Solo las mías"
                  checked={valores.autor === 'yo'}
                  onChange={(e) => actualizarFiltro('autor', e.target.checked ? 'yo' : '')}
                />
              </div>
            </>
          }
          hayFiltrosActivos={hayFiltrosActivos}
          onLimpiarFiltros={limpiarFiltros}
          vacio={{
            icono: Inbox,
            titulo: `Todavía no hay ${esAvisos ? 'avisos' : 'publicaciones'}.`,
            descripcion: 'Crea el primer registro para empezar a publicar en el portal.',
            accion:
              esAvisos && puede('avisos.gestionar') ? (
                <Boton como={Link} to="/admin/publicaciones/avisos/nuevo" variante="primario" icono={Plus}>
                  Nuevo aviso
                </Boton>
              ) : !esAvisos && puede('noticias.redactar') ? (
                <Boton como={Link} to="/admin/publicaciones/nueva" variante="primario" icono={Plus}>
                  Nueva publicación
                </Boton>
              ) : null,
          }}
          vacioConFiltros={{
            icono: Inbox,
            titulo: `No hay ${esAvisos ? 'avisos' : 'publicaciones'} que coincidan con los filtros.`,
            descripcion: 'Prueba limpiar los filtros para ver todos los registros.',
          }}
        />
      </div>
    </section>
  );
}
