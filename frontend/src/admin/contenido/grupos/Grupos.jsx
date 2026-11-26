import { useMemo, useRef, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Inbox, Pencil, Plus, Trash2 } from 'lucide-react';

import { IconoDinamico } from '../../../components/parroquia/IconoDinamico.jsx';
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
import { CLAVE_GRUPOS, eliminarGrupo, listarGruposPaginados, reordenarGrupos } from './api.js';
import FormularioGrupo from './FormularioGrupo.jsx';

export default function Grupos() {
  const queryClient = useQueryClient();
  const { puede } = usePermisos();
  const toast = useToast();
  const puedeGestionar = puede('grupos.gestionar');

  const tituloRef = useRef(null);

  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState(null);
  const [porEliminar, setPorEliminar] = useState(null);

  const configFiltros = useMemo(
    () => ({
      visible: { defecto: '', validar: (v) => v === 'true' || v === 'false' },
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

  const gruposQuery = useQuery({
    queryKey: [...CLAVE_GRUPOS, 'lista', filtrosActivos],
    queryFn: ({ signal }) => listarGruposPaginados(filtrosActivos, signal),
    placeholderData: keepPreviousData,
  });

  const reordenarMut = useMutation({
    mutationFn: (ids) => reordenarGrupos(ids),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLAVE_GRUPOS }),
  });

  const eliminarMut = useMutation({
    mutationFn: (grupo) => eliminarGrupo(grupo.id),
    onSuccess: (_, grupo) => {
      queryClient.invalidateQueries({ queryKey: CLAVE_GRUPOS });
      toast.exito(`Se eliminó el grupo «${grupo.nombre}».`);
      setPorEliminar(null);
      setTimeout(() => tituloRef.current?.focus(), 0);
    },
  });

  const grupos = gruposQuery.data?.datos ?? [];
  const totalPaginas = gruposQuery.data?.paginacion?.totalPaginas ?? 1;
  const puedeReordenar = !hayFiltrosActivos && totalPaginas <= 1;

  function mover(indice, direccion) {
    if (!puedeReordenar) return;
    const destino = indice + direccion;
    if (destino < 0 || destino >= grupos.length) return;
    const ids = grupos.map((g) => g.id);
    [ids[indice], ids[destino]] = [ids[destino], ids[indice]];
    reordenarMut.mutate(ids);
  }

  const columnas = [
    {
      id: 'grupo',
      encabezado: 'Grupo pastoral',
      render: (grupo) => (
        <div className="flex items-start gap-3">
          {grupo.icono && (
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-gold-soft text-ink">
              <IconoDinamico nombre={grupo.icono} size={18} />
            </span>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-ink">{grupo.nombre}</p>
            {grupo.horarioReunion && (
              <p className="mt-0.5 text-xs text-muted">Reuniones: {grupo.horarioReunion}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'estado',
      encabezado: 'Estado',
      render: (grupo) => (
        <Insignia variante={grupo.visible ? 'publicado' : 'archivado'}>
          {grupo.visible ? 'Visible' : 'Oculto'}
        </Insignia>
      ),
    },
    ...(puedeGestionar
      ? [
          {
            id: 'acciones',
            encabezado: <span className="sr-only">Acciones</span>,
            claseCelda: 'text-right sm:w-px sm:whitespace-nowrap',
            render: (grupo) => {
              const indice = grupos.findIndex((g) => g.id === grupo.id);
              return (
                <div className="flex flex-wrap justify-end gap-1.5">
                  {puedeReordenar && (
                    <>
                      <Boton
                        variante="secundario"
                        tamano="sm"
                        icono={ArrowUp}
                        disabled={indice <= 0 || reordenarMut.isPending}
                        onClick={() => mover(indice, -1)}
                        aria-label={`Subir «${grupo.nombre}»`}
                      />
                      <Boton
                        variante="secundario"
                        tamano="sm"
                        icono={ArrowDown}
                        disabled={indice === grupos.length - 1 || reordenarMut.isPending}
                        onClick={() => mover(indice, 1)}
                        aria-label={`Bajar «${grupo.nombre}»`}
                      />
                    </>
                  )}
                  <Boton
                    variante="secundario"
                    tamano="sm"
                    icono={Pencil}
                    onClick={() => setEditando(grupo)}
                    aria-label={`Editar «${grupo.nombre}»`}
                  >
                    Editar
                  </Boton>
                  <Boton
                    variante="secundario"
                    tamano="sm"
                    icono={Trash2}
                    onClick={() => setPorEliminar(grupo)}
                    aria-label={`Eliminar «${grupo.nombre}»`}
                  >
                    Eliminar
                  </Boton>
                </div>
              );
            },
          },
        ]
      : []),
  ];

  return (
    <section className="mx-auto max-w-5xl">
      <EncabezadoPantalla
        titulo="Grupos pastorales"
        descripcion="Movimientos, ministerios y pastorales de la comunidad parroquial."
        headingRef={tituloRef}
        acciones={
          puedeGestionar && (
            <Boton
              variante="primario"
              icono={Plus}
              onClick={() => setCreando(true)}
            >
              Nuevo grupo
            </Boton>
          )
        }
      />

      {!puedeGestionar && (
        <Aviso tipo="soloLectura" className="mt-4">
          <p>
            <strong className="font-semibold text-ink">Solo lectura:</strong> tu rol puede consultar los grupos
            pastorales, pero no realizar cambios.
          </p>
        </Aviso>
      )}

      {puedeGestionar && !puedeReordenar && (
        <Aviso tipo="info" className="mt-4">
          <p>Para reordenar los grupos, quita los filtros y asegúrate de ver todos en una sola página.</p>
        </Aviso>
      )}

      <div className="mt-6">
        <TablaListado
          caption="Grupos pastorales"
          nombrePaginacion="Paginación de grupos"
          columnas={columnas}
          datos={grupos}
          paginacion={gruposQuery.data?.paginacion}
          onCambiarPagina={setPagina}
          cargando={gruposQuery.isPending}
          tenue={gruposQuery.isPlaceholderData}
          error={
            gruposQuery.isError
              ? gruposQuery.error?.message || 'No se pudieron cargar los datos.'
              : null
          }
          onReintentar={gruposQuery.refetch}
          busqueda={busqueda}
          onCambiarBusqueda={setBusqueda}
          placeholderBusqueda="Nombre o descripción"
          filtrosExtra={
            <div className="min-w-[160px]">
              <CampoSelect
                etiqueta="Visibilidad"
                value={valores.visible}
                onChange={(e) => actualizarFiltro('visible', e.target.value)}
              >
                <option value="">Todos</option>
                <option value="true">Visibles</option>
                <option value="false">Ocultos</option>
              </CampoSelect>
            </div>
          }
          hayFiltrosActivos={hayFiltrosActivos}
          onLimpiarFiltros={limpiarFiltros}
          vacio={{
            icono: Inbox,
            titulo: 'No hay grupos pastorales registrados con estos filtros.',
            descripcion: 'Prueba quitando el filtro o crea un nuevo grupo pastoral.',
            accion:
              puedeGestionar && (
                <Boton variante="primario" icono={Plus} onClick={() => setCreando(true)}>
                  Nuevo grupo
                </Boton>
              ),
          }}
          vacioConFiltros={{
            icono: Inbox,
            titulo: 'No hay grupos pastorales registrados con estos filtros.',
            descripcion: 'Prueba quitando el filtro o crea un nuevo grupo pastoral.',
          }}
        />
      </div>

      {(creando || editando) && (
        <FormularioGrupo
          grupo={editando}
          onGuardado={(guardado) => {
            const msg = editando
              ? `Se actualizó el grupo «${guardado.nombre}».`
              : `Se creó el grupo «${guardado.nombre}».`;
            setCreando(false);
            setEditando(null);
            queryClient.invalidateQueries({ queryKey: CLAVE_GRUPOS });
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
          titulo={`¿Eliminar «${porEliminar.nombre}»?`}
          pendiente={eliminarMut.isPending}
          error={eliminarMut.error}
          onConfirmar={() => eliminarMut.mutate(porEliminar)}
          onCancelar={() => {
            eliminarMut.reset();
            setPorEliminar(null);
          }}
        >
          El grupo dejará de mostrarse en el portal público.
        </ConfirmarAccion>
      )}
    </section>
  );
}
