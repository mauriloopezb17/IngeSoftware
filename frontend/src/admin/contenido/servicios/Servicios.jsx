import { useMemo, useRef, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, HelpCircle, Inbox, Pencil, Plus, Trash2 } from 'lucide-react';

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
import { pluralizar } from '../componentes/texto.js';
import {
  CLAVE_SERVICIOS,
  eliminarServicio,
  listarServiciosPaginados,
  reordenarServicios,
} from './api.js';
import FormularioServicio from './FormularioServicio.jsx';
import PreguntasFrecuentes from './PreguntasFrecuentes.jsx';

export default function Servicios() {
  const queryClient = useQueryClient();
  const { puede } = usePermisos();
  const toast = useToast();
  const puedeGestionar = puede('servicios.gestionar');

  const tituloRef = useRef(null);

  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState(null);
  const [faqServicio, setFaqServicio] = useState(null);
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

  const serviciosQuery = useQuery({
    queryKey: [...CLAVE_SERVICIOS, 'lista', filtrosActivos],
    queryFn: ({ signal }) => listarServiciosPaginados(filtrosActivos, signal),
    placeholderData: keepPreviousData,
  });

  const reordenarMut = useMutation({
    mutationFn: (ids) => reordenarServicios(ids),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLAVE_SERVICIOS }),
  });

  const eliminarMut = useMutation({
    mutationFn: (servicio) => eliminarServicio(servicio.id),
    onSuccess: (_, servicio) => {
      queryClient.invalidateQueries({ queryKey: CLAVE_SERVICIOS });
      toast.exito(`Se eliminó el servicio «${servicio.nombre}».`);
      setPorEliminar(null);
      setTimeout(() => tituloRef.current?.focus(), 0);
    },
  });

  const servicios = serviciosQuery.data?.datos ?? [];
  const totalPaginas = serviciosQuery.data?.paginacion?.totalPaginas ?? 1;
  const puedeReordenar = !hayFiltrosActivos && totalPaginas <= 1;

  function mover(indice, direccion) {
    if (!puedeReordenar) return;
    const destino = indice + direccion;
    if (destino < 0 || destino >= servicios.length) return;
    const ids = servicios.map((s) => s.id);
    [ids[indice], ids[destino]] = [ids[destino], ids[indice]];
    reordenarMut.mutate(ids);
  }

  const columnas = [
    {
      id: 'servicio',
      encabezado: 'Servicio',
      render: (servicio) => (
        <div className="flex items-start gap-3">
          {servicio.icono && (
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-gold-soft text-ink">
              <IconoDinamico nombre={servicio.icono} size={18} />
            </span>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-ink">{servicio.nombre}</p>
            <p className="mt-0.5 text-xs text-muted">/sacramentos/{servicio.slug}</p>
            {servicio.descripcionCorta && (
              <p className="mt-1 line-clamp-2 text-xs text-muted">{servicio.descripcionCorta}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'preguntas',
      encabezado: 'Preguntas frecuentes',
      render: (servicio) => (
        <span className="text-xs tabular-nums text-muted">
          {pluralizar(servicio.preguntasFrecuentes?.length ?? 0, 'pregunta')}
        </span>
      ),
    },
    {
      id: 'estado',
      encabezado: 'Estado',
      render: (servicio) => (
        <Insignia variante={servicio.visible ? 'publicado' : 'archivado'}>
          {servicio.visible ? 'Visible' : 'Oculto'}
        </Insignia>
      ),
    },
    ...(puedeGestionar
      ? [
          {
            id: 'acciones',
            encabezado: <span className="sr-only">Acciones</span>,
            claseCelda: 'text-right sm:w-px sm:whitespace-nowrap',
            render: (servicio) => {
              const indice = servicios.findIndex((s) => s.id === servicio.id);
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
                        aria-label={`Subir «${servicio.nombre}»`}
                      />
                      <Boton
                        variante="secundario"
                        tamano="sm"
                        icono={ArrowDown}
                        disabled={indice === servicios.length - 1 || reordenarMut.isPending}
                        onClick={() => mover(indice, 1)}
                        aria-label={`Bajar «${servicio.nombre}»`}
                      />
                    </>
                  )}
                  <Boton
                    variante="secundario"
                    tamano="sm"
                    icono={HelpCircle}
                    onClick={() => setFaqServicio(servicio)}
                    aria-label={`Preguntas frecuentes de «${servicio.nombre}»`}
                  >
                    Preguntas
                  </Boton>
                  <Boton
                    variante="secundario"
                    tamano="sm"
                    icono={Pencil}
                    onClick={() => setEditando(servicio)}
                    aria-label={`Editar «${servicio.nombre}»`}
                  >
                    Editar
                  </Boton>
                  <Boton
                    variante="secundario"
                    tamano="sm"
                    icono={Trash2}
                    onClick={() => setPorEliminar(servicio)}
                    aria-label={`Eliminar «${servicio.nombre}»`}
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
        titulo="Servicios y sacramentos"
        descripcion="Sacramentos, requisitos de inscripción y preguntas frecuentes de la sede."
        headingRef={tituloRef}
        acciones={
          puedeGestionar && (
            <Boton
              variante="primario"
              icono={Plus}
              onClick={() => setCreando(true)}
            >
              Nuevo servicio
            </Boton>
          )
        }
      />

      {!puedeGestionar && (
        <Aviso tipo="soloLectura" className="mt-4">
          <p>
            <strong className="font-semibold text-ink">Solo lectura:</strong> tu rol puede consultar los servicios, pero
            no realizar cambios.
          </p>
        </Aviso>
      )}

      {puedeGestionar && !puedeReordenar && (
        <Aviso tipo="info" className="mt-4">
          <p>Para reordenar los servicios, quita los filtros y asegúrate de ver todos en una sola página.</p>
        </Aviso>
      )}

      <div className="mt-6">
        <TablaListado
          caption="Servicios"
          nombrePaginacion="Paginación de servicios"
          columnas={columnas}
          datos={servicios}
          paginacion={serviciosQuery.data?.paginacion}
          onCambiarPagina={setPagina}
          cargando={serviciosQuery.isPending}
          tenue={serviciosQuery.isPlaceholderData}
          error={
            serviciosQuery.isError
              ? serviciosQuery.error?.message || 'No se pudieron cargar los datos.'
              : null
          }
          onReintentar={serviciosQuery.refetch}
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
            titulo: 'No hay servicios registrados con estos filtros.',
            descripcion: 'Prueba quitando el filtro o crea un nuevo servicio.',
            accion:
              puedeGestionar && (
                <Boton variante="primario" icono={Plus} onClick={() => setCreando(true)}>
                  Nuevo servicio
                </Boton>
              ),
          }}
          vacioConFiltros={{
            icono: Inbox,
            titulo: 'No hay servicios registrados con estos filtros.',
            descripcion: 'Prueba quitando el filtro o crea un nuevo servicio.',
          }}
        />
      </div>

      {(creando || editando) && (
        <FormularioServicio
          servicio={editando}
          onGuardado={(guardado) => {
            const msg = editando
              ? `Se actualizó el servicio «${guardado.nombre}».`
              : `Se creó el servicio «${guardado.nombre}».`;
            setCreando(false);
            setEditando(null);
            queryClient.invalidateQueries({ queryKey: CLAVE_SERVICIOS });
            toast.exito(msg);
          }}
          onCerrar={() => {
            setCreando(false);
            setEditando(null);
          }}
        />
      )}

      {faqServicio && (
        <PreguntasFrecuentes
          servicio={faqServicio}
          puedeGestionar={puedeGestionar}
          onActualizado={() => queryClient.invalidateQueries({ queryKey: CLAVE_SERVICIOS })}
          onCerrar={() => setFaqServicio(null)}
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
          Se quitará del portal público junto con sus requisitos y preguntas frecuentes.
        </ConfirmarAccion>
      )}
    </section>
  );
}
