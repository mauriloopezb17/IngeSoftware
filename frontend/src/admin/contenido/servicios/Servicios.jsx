import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, HelpCircle, Inbox, Pencil, Plus, Trash2 } from 'lucide-react';

import { IconoDinamico } from '../../../components/parroquia/IconoDinamico.jsx';
import ConfirmarAccion from '../../componentes/ConfirmarAccion.jsx';
import { usePermisos } from '../../permisos/usePermisos.js';
import {
  Aviso,
  Boton,
  CampoSelect,
  EncabezadoPantalla,
  EsqueletoTarjetas,
  EstadoVacio,
  Insignia,
  useToast,
} from '../../ui/index.js';
import { pluralizar } from '../componentes/texto.js';
import {
  CLAVE_SERVICIOS,
  eliminarServicio,
  listarServicios,
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

  const [filtroVisible, setFiltroVisible] = useState('');
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState(null);
  const [faqServicio, setFaqServicio] = useState(null);
  const [porEliminar, setPorEliminar] = useState(null);

  const serviciosQuery = useQuery({
    queryKey: [...CLAVE_SERVICIOS, { visible: filtroVisible }],
    queryFn: () => listarServicios({ visible: filtroVisible || undefined }),
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

  const servicios = serviciosQuery.data ?? [];

  function mover(indice, direccion) {
    const destino = indice + direccion;
    if (destino < 0 || destino >= servicios.length) return;
    const ids = servicios.map((s) => s.id);
    [ids[indice], ids[destino]] = [ids[destino], ids[indice]];
    reordenarMut.mutate(ids);
  }

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

      <div className="mt-6 rounded-lg border border-sand bg-white p-4 sm:max-w-xs">
        <CampoSelect
          etiqueta="Visibilidad"
          value={filtroVisible}
          onChange={(e) => setFiltroVisible(e.target.value)}
        >
          <option value="">Todos</option>
          <option value="true">Visibles</option>
          <option value="false">Ocultos</option>
        </CampoSelect>
      </div>

      <div className="mt-6" aria-busy={serviciosQuery.isPending}>
        {serviciosQuery.isPending && (
          <EsqueletoTarjetas cantidad={3} columnas="grid-cols-1" etiqueta="Cargando servicios…" />
        )}

        {serviciosQuery.error && (
          <Aviso
            tipo="error"
            accion={
              <Boton variante="secundario" tamano="sm" onClick={() => serviciosQuery.refetch()}>
                Reintentar
              </Boton>
            }
          >
            <p>{serviciosQuery.error.message || 'No se pudieron cargar los datos.'}</p>
          </Aviso>
        )}

        {!serviciosQuery.isPending && !serviciosQuery.error && servicios.length === 0 && (
          <EstadoVacio
            icono={Inbox}
            titulo="No hay servicios registrados."
            descripcion="Agrega sacramentos, horarios de atención y sus requisitos."
            accion={
              puedeGestionar && (
                <Boton
                  variante="primario"
                  icono={Plus}
                  onClick={() => setCreando(true)}
                >
                  Agregar el primer servicio
                </Boton>
              )
            }
          />
        )}

        {servicios.length > 0 && (
          <ul className="flex flex-col gap-3" aria-label="Servicios y sacramentos">
            {servicios.map((servicio, i) => (
              <li
                key={servicio.id}
                className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-sand bg-white p-5"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3.5">
                  <span
                    aria-hidden="true"
                    className="flex size-10 shrink-0 items-center justify-center rounded-md border border-sand bg-gold-soft text-ink"
                  >
                    <IconoDinamico nombre={servicio.icono} size={20} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-body text-base font-semibold text-ink">{servicio.nombre}</h2>
                      {!servicio.visible && <Insignia variante="archivado">Oculto</Insignia>}
                    </div>
                    <p className="mt-1 text-sm text-ink">{servicio.descripcionCorta}</p>
                    <p className="mt-2 text-xs text-muted">
                      {pluralizar(servicio.contenido?.datos?.length ?? 0, 'requisito', 'requisitos')} ·{' '}
                      {pluralizar(
                        servicio.preguntasFrecuentes?.length ?? 0,
                        'pregunta frecuente',
                        'preguntas frecuentes',
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Boton
                    variante="secundario"
                    tamano="sm"
                    icono={HelpCircle}
                    onClick={() => setFaqServicio(servicio)}
                  >
                    Preguntas frecuentes
                  </Boton>

                  {puedeGestionar && (
                    <>
                      {!filtroVisible && (
                        <>
                          <Boton
                            variante="secundario"
                            tamano="sm"
                            onClick={() => mover(i, -1)}
                            disabled={i === 0 || reordenarMut.isPending}
                            aria-label={`Subir ${servicio.nombre}`}
                          >
                            <ArrowUp className="size-3.5" aria-hidden="true" />
                          </Boton>
                          <Boton
                            variante="secundario"
                            tamano="sm"
                            onClick={() => mover(i, 1)}
                            disabled={i === servicios.length - 1 || reordenarMut.isPending}
                            aria-label={`Bajar ${servicio.nombre}`}
                          >
                            <ArrowDown className="size-3.5" aria-hidden="true" />
                          </Boton>
                        </>
                      )}
                      <Boton
                        variante="secundario"
                        tamano="sm"
                        icono={Pencil}
                        onClick={() => setEditando(servicio)}
                        aria-label={`Editar ${servicio.nombre}`}
                      >
                        Editar
                      </Boton>
                      <Boton
                        variante="secundario"
                        tamano="sm"
                        icono={Trash2}
                        onClick={() => setPorEliminar(servicio)}
                        aria-label={`Eliminar ${servicio.nombre}`}
                      >
                        Eliminar
                      </Boton>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {(creando || editando) && (
        <FormularioServicio
          servicio={editando}
          onCerrar={() => {
            setCreando(false);
            setEditando(null);
          }}
          onGuardado={(guardado) => {
            const msg = editando
              ? `Se actualizó el servicio «${guardado.nombre}».`
              : `Se creó el servicio «${guardado.nombre}».`;
            setCreando(false);
            setEditando(null);
            toast.exito(msg);
          }}
        />
      )}

      {faqServicio && (
        <PreguntasFrecuentes
          servicio={faqServicio}
          puedeGestionar={puedeGestionar}
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
          Sus preguntas frecuentes quedarán sin servicio asociado para el asistente virtual. Esta acción no se puede
          deshacer.
        </ConfirmarAccion>
      )}
    </section>
  );
}
