import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Inbox, Pencil, X } from 'lucide-react';

import SinPermiso from '../componentes/SinPermiso.jsx';
import { formatearFecha } from '../multimedia/formato.js';
import { usePermisos } from '../permisos/usePermisos.js';
import {
  Boton,
  CampoSelect,
  EncabezadoPantalla,
  TablaListado,
  useFiltrosListado,
  useToast,
} from '../ui/index.js';
import {
  CLAVE_CATALOGOS,
  CLAVE_PUBLICACIONES,
  listarPublicaciones,
  obtenerCatalogos,
  POR_PAGINA,
  TIPOS_DE_ESTA_PANTALLA,
} from './api.js';
import { DialogoAprobar, DialogoRechazar } from './DialogosRevision.jsx';

// /admin/publicaciones/revision: lo que espera la revisión del Párroco en su sede. La sección la decide
// matriz.js (permiso noticias.publicar); los botones de cada publicación, el campo `acciones` de la API.
export default function BandejaRevision() {
  const { puede } = usePermisos();
  const clienteConsultas = useQueryClient();
  const toast = useToast();
  const tituloRef = useRef(null);
  // { publicacion, accion: 'aprobar' | 'rechazar' } mientras hay un diálogo abierto.
  const [revisando, setRevisando] = useState(null);
  const autorizado = puede('noticias.publicar');

  const configFiltros = useMemo(
    () => ({
      categoria: { defecto: '' },
      tipo: { defecto: '', validar: (v) => v in TIPOS_DE_ESTA_PANTALLA },
    }),
    [],
  );

  const {
    valores,
    busqueda,
    setBusqueda,
    pagina,
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
    () => ({ ...filtrosActivos, estado: 'EN_REVISION' }),
    [filtrosActivos],
  );

  const catalogos = useQuery({
    queryKey: CLAVE_CATALOGOS,
    queryFn: obtenerCatalogos,
    staleTime: 5 * 60 * 1000,
    enabled: autorizado,
  });

  const { data, isPending, isError, error, isPlaceholderData, refetch } = useQuery({
    queryKey: [...CLAVE_PUBLICACIONES, 'bandeja', filtrosApi],
    queryFn: ({ signal }) => listarPublicaciones(filtrosApi, signal),
    placeholderData: keepPreviousData,
    enabled: autorizado,
  });

  if (!autorizado) return <SinPermiso />;

  const publicaciones = data?.datos ?? [];
  const categorias = catalogos.data?.categoriasPublicacion ?? [];

  function terminar(mensaje) {
    setRevisando(null);
    toast.exito(mensaje);
    clienteConsultas.invalidateQueries({ queryKey: CLAVE_PUBLICACIONES });
    if (publicaciones.length === 1 && pagina > 1) setPagina(pagina - 1);
    setTimeout(() => tituloRef.current?.focus(), 0);
  }

  const columnas = [
    {
      id: 'titulo',
      encabezado: 'Publicación',
      claseCelda: 'font-semibold text-ink',
      render: (publicacion) => (
        <div>
          <p className="font-semibold text-ink">{publicacion.titulo}</p>
          <p className="mt-1 text-xs font-normal text-muted">
            {publicacion.tipo.nombre}
            {publicacion.categoria && ` · ${publicacion.categoria.nombre}`} · {publicacion.autor.nombreCompleto} ·
            creada el {formatearFecha(publicacion.fechaCreacion)}
          </p>
          {publicacion.resumen && <p className="mt-1.5 text-sm font-normal text-ink">{publicacion.resumen}</p>}
        </div>
      ),
    },
    {
      id: 'acciones',
      encabezado: <span className="sr-only">Acciones</span>,
      claseCelda: 'text-right md:w-px md:whitespace-nowrap',
      render: (publicacion) => (
        <div className="flex flex-wrap justify-end gap-2">
          {publicacion.acciones.includes('EDITAR') && (
            <Boton
              como={Link}
              to={`/admin/publicaciones/${publicacion.id}/editar`}
              variante="secundario"
              tamano="sm"
              icono={Pencil}
              aria-label={`Revisar el contenido de «${publicacion.titulo}»`}
            >
              Revisar
            </Boton>
          )}
          {publicacion.acciones.includes('APROBAR') && (
            <Boton
              variante="primario"
              tamano="sm"
              icono={Check}
              onClick={() => setRevisando({ publicacion, accion: 'aprobar' })}
              aria-label={`Aprobar «${publicacion.titulo}»`}
            >
              Aprobar
            </Boton>
          )}
          {publicacion.acciones.includes('RECHAZAR') && (
            <Boton
              variante="peligro"
              tamano="sm"
              icono={X}
              onClick={() => setRevisando({ publicacion, accion: 'rechazar' })}
              aria-label={`Rechazar «${publicacion.titulo}»`}
            >
              Rechazar
            </Boton>
          )}
        </div>
      ),
    },
  ];

  return (
    <section className="mx-auto max-w-5xl">
      <EncabezadoPantalla
        titulo="Bandeja de revisión"
        descripcion="Publicaciones que esperan tu aprobación."
        headingRef={tituloRef}
        acciones={
          <Boton como={Link} to="/admin/publicaciones" variante="secundario">
            Volver a publicaciones
          </Boton>
        }
      />

      <div className="mt-6">
        <TablaListado
          caption="Publicaciones en revisión"
          columnas={columnas}
          datos={publicaciones}
          paginacion={data?.paginacion}
          onCambiarPagina={setPagina}
          cargando={isPending}
          tenue={isPlaceholderData}
          error={isError && !data ? `No se pudo cargar la bandeja: ${error.message}` : null}
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
            <div className="min-w-[150px]">
              <CampoSelect
                etiqueta="Tipo"
                value={valores.tipo}
                onChange={(e) => actualizarFiltro('tipo', e.target.value)}
                opciones={[['', 'Todos'], ...Object.entries(TIPOS_DE_ESTA_PANTALLA)]}
              />
            </div>
          }
          hayFiltrosActivos={hayFiltrosActivos}
          onLimpiarFiltros={limpiarFiltros}
          vacio={{
            icono: Inbox,
            titulo: 'No hay publicaciones esperando revisión.',
            descripcion: 'Cuando el equipo envíe noticias para aprobar, aparecerán aquí.',
          }}
          vacioConFiltros={{
            icono: Inbox,
            titulo: 'No hay publicaciones en revisión con estos filtros.',
          }}
        />
      </div>

      {revisando?.accion === 'aprobar' && (
        <DialogoAprobar publicacion={revisando.publicacion} onCerrar={() => setRevisando(null)} onHecho={terminar} />
      )}
      {revisando?.accion === 'rechazar' && (
        <DialogoRechazar publicacion={revisando.publicacion} onCerrar={() => setRevisando(null)} onHecho={terminar} />
      )}
    </section>
  );
}
