import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Inbox, Layers, Pencil, Plus, Trash2 } from 'lucide-react';

import ConfirmarAccion from '../../componentes/ConfirmarAccion.jsx';
import { usePermisos } from '../../permisos/usePermisos.js';
import {
  Aviso,
  Boton,
  CampoSelect,
  EncabezadoPantalla,
  Insignia,
  TablaListado,
  useFiltrosListado,
  useToast,
} from '../../ui/index.js';
import {
  CLAVE_PAGINAS,
  eliminarPagina,
  ESTADOS_PAGINA,
  listarPaginasPaginadas,
} from './api.js';
import FormularioPagina from './FormularioPagina.jsx';

const VARIANTE_ESTADO = {
  PUBLICADO: 'publicado',
  BORRADOR: 'borrador',
  ARCHIVADO: 'archivado',
};

// /admin/paginas: listado. Cada página se abre en su propia ruta (/admin/paginas/:id), con el editor de bloques.
export default function ListadoPaginas() {
  const queryClient = useQueryClient();
  const { puede } = usePermisos();
  const toast = useToast();
  const puedeGestionar = puede('paginas.gestionar');

  const tituloRef = useRef(null);

  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState(null);
  const [porEliminar, setPorEliminar] = useState(null);

  const configFiltros = useMemo(
    () => ({
      estado: { defecto: '', validar: (v) => ESTADOS_PAGINA.some((e) => e.codigo === v) },
      mostrarEnMenu: { defecto: '', validar: (v) => v === 'true' || v === 'false' },
    }),
    [],
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
    porPagina: 15,
  });

  const paginasQuery = useQuery({
    queryKey: [...CLAVE_PAGINAS, 'lista', filtrosActivos],
    queryFn: ({ signal }) => listarPaginasPaginadas(filtrosActivos, signal),
    placeholderData: keepPreviousData,
  });

  const eliminarMut = useMutation({
    mutationFn: (pagina) => eliminarPagina(pagina.id),
    onSuccess: (_, pagina) => {
      queryClient.invalidateQueries({ queryKey: CLAVE_PAGINAS });
      toast.exito(`Se eliminó la página «${pagina.titulo}».`);
      setPorEliminar(null);
      setTimeout(() => tituloRef.current?.focus(), 0);
    },
  });

  const paginas = paginasQuery.data?.datos ?? [];

  // Al volver desde una página (enlace «Volver a páginas») el foco queda en el título del listado.
  const volvioDeUnaPagina = useLocation().state?.enfocarTitulo === true;
  useEffect(() => {
    if (volvioDeUnaPagina) tituloRef.current?.focus();
  }, [volvioDeUnaPagina]);

  const columnas = [
    {
      id: 'pagina',
      encabezado: 'Página',
      render: (pagina) => (
        <div>
          <p className="font-semibold text-ink">{pagina.titulo}</p>
          <p className="mt-0.5 text-xs text-muted">/paginas/{pagina.slug}</p>
        </div>
      ),
    },
    {
      id: 'estado',
      encabezado: 'Estado',
      render: (pagina) => (
        <div className="flex flex-wrap gap-1.5">
          <Insignia variante={VARIANTE_ESTADO[pagina.estado.codigo] ?? 'borrador'}>
            {pagina.estado.nombre}
          </Insignia>
          {pagina.mostrarEnMenu && <Insignia variante="programado">En menú</Insignia>}
          {pagina.esSistema && <Insignia variante="borrador">Del sistema</Insignia>}
        </div>
      ),
    },
    {
      id: 'acciones',
      encabezado: <span className="sr-only">Acciones</span>,
      claseCelda: 'text-right sm:w-px sm:whitespace-nowrap',
      render: (pagina) => (
        <div className="flex flex-wrap justify-end gap-2">
          <Boton
            como={Link}
            to={`/admin/paginas/${pagina.id}`}
            variante="secundario"
            tamano="sm"
            icono={Layers}
            aria-label={`Bloques de «${pagina.titulo}»`}
          >
            Bloques
          </Boton>
          {puedeGestionar && (
            <>
              <Boton
                variante="secundario"
                tamano="sm"
                icono={Pencil}
                onClick={() => setEditando(pagina)}
                aria-label={`Editar «${pagina.titulo}»`}
              >
                Editar
              </Boton>
              {!pagina.esSistema && (
                <Boton
                  variante="secundario"
                  tamano="sm"
                  icono={Trash2}
                  onClick={() => setPorEliminar(pagina)}
                  aria-label={`Eliminar «${pagina.titulo}»`}
                >
                  Eliminar
                </Boton>
              )}
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <section className="mx-auto max-w-5xl">
      <EncabezadoPantalla
        titulo="Páginas"
        descripcion="Páginas institucionales del portal y sus bloques de contenido."
        headingRef={tituloRef}
        acciones={
          puedeGestionar && (
            <Boton
              variante="primario"
              icono={Plus}
              onClick={() => setCreando(true)}
            >
              Nueva página
            </Boton>
          )
        }
      />

      {!puedeGestionar && (
        <Aviso tipo="soloLectura" className="mt-4">
          <p>
            <strong className="font-semibold text-ink">Solo lectura:</strong> tu rol puede consultar las páginas y sus
            bloques, pero no realizar cambios.
          </p>
        </Aviso>
      )}

      <div className="mt-6">
        <TablaListado
          caption="Páginas"
          nombrePaginacion="Paginación de páginas"
          columnas={columnas}
          datos={paginas}
          paginacion={paginasQuery.data?.paginacion}
          onCambiarPagina={setPagina}
          cargando={paginasQuery.isPending}
          tenue={paginasQuery.isPlaceholderData}
          error={
            paginasQuery.isError
              ? paginasQuery.error?.message || 'No se pudieron cargar los datos.'
              : null
          }
          onReintentar={paginasQuery.refetch}
          busqueda={busqueda}
          onCambiarBusqueda={setBusqueda}
          placeholderBusqueda="Título o slug"
          filtrosExtra={
            <>
              <div className="min-w-[160px]">
                <CampoSelect
                  etiqueta="Estado"
                  value={valores.estado}
                  onChange={(e) => actualizarFiltro('estado', e.target.value)}
                >
                  <option value="">Todos los estados</option>
                  {ESTADOS_PAGINA.map((est) => (
                    <option key={est.codigo} value={est.codigo}>
                      {est.nombre}
                    </option>
                  ))}
                </CampoSelect>
              </div>
              <div className="min-w-[150px]">
                <CampoSelect
                  etiqueta="Menú"
                  value={valores.mostrarEnMenu}
                  onChange={(e) => actualizarFiltro('mostrarEnMenu', e.target.value)}
                >
                  <option value="">Todas</option>
                  <option value="true">En el menú</option>
                  <option value="false">Ocultas del menú</option>
                </CampoSelect>
              </div>
            </>
          }
          hayFiltrosActivos={hayFiltrosActivos}
          onLimpiarFiltros={limpiarFiltros}
          vacio={{
            icono: Inbox,
            titulo: 'No hay páginas registradas con estos filtros.',
            descripcion: 'Prueba quitando el filtro o crea una página nueva.',
            accion:
              puedeGestionar && (
                <Boton variante="primario" icono={Plus} onClick={() => setCreando(true)}>
                  Nueva página
                </Boton>
              ),
          }}
          vacioConFiltros={{
            icono: Inbox,
            titulo: 'No hay páginas registradas con estos filtros.',
            descripcion: 'Prueba quitando el filtro o crea una página nueva.',
          }}
        />
      </div>

      {(creando || editando) && (
        <FormularioPagina
          pagina={editando}
          onGuardado={(guardada) => {
            const msg = editando
              ? `Se actualizó la página «${guardada.titulo}».`
              : `Se creó la página «${guardada.titulo}».`;
            setCreando(false);
            setEditando(null);
            queryClient.invalidateQueries({ queryKey: CLAVE_PAGINAS });
            toast.exito(msg);
          }}
          onCerrar={() => {
            setCreando(false);
            setEditando(null);
          }}
        />
      )}

      {porEliminar && (
        <ConfirmarAccion
          titulo={`¿Eliminar «${porEliminar.titulo}»?`}
          pendiente={eliminarMut.isPending}
          error={eliminarMut.error}
          onConfirmar={() => eliminarMut.mutate(porEliminar)}
          onCancelar={() => {
            eliminarMut.reset();
            setPorEliminar(null);
          }}
        >
          Se quitará del portal junto con todos sus bloques de contenido.
        </ConfirmarAccion>
      )}
    </section>
  );
}
