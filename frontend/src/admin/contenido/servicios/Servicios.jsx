import { useId, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, HelpCircle, Pencil, Plus, Trash2 } from 'lucide-react';

import { IconoDinamico } from '../../../components/parroquia/IconoDinamico.jsx';
import { usePermisos } from '../../permisos/usePermisos.js';
import BannerSoloLectura from '../componentes/BannerSoloLectura.jsx';
import ConfirmarBorrado from '../componentes/ConfirmarBorrado.jsx';
import EstadoLista from '../componentes/EstadoLista.jsx';
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
  const puedeGestionar = puede('servicios.gestionar');

  const idFiltro = useId();
  const tituloRef = useRef(null);

  const [filtroVisible, setFiltroVisible] = useState('');
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState(null);
  const [faqServicio, setFaqServicio] = useState(null);
  const [porEliminar, setPorEliminar] = useState(null);
  const [aviso, setAviso] = useState('');

  const serviciosQuery = useQuery({
    queryKey: [...CLAVE_SERVICIOS, { visible: filtroVisible }],
    queryFn: () => listarServicios({ visible: filtroVisible || undefined }),
  });

  const reordenarMut = useMutation({
    mutationFn: (ids) => reordenarServicios(ids),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLAVE_SERVICIOS }),
  });

  const servicios = serviciosQuery.data ?? [];

  function mover(indice, direccion) {
    const destino = indice + direccion;
    if (destino < 0 || destino >= servicios.length) return;
    const ids = servicios.map((s) => s.id);
    [ids[indice], ids[destino]] = [ids[destino], ids[indice]];
    reordenarMut.mutate(ids);
  }

  async function confirmarEliminacion() {
    await eliminarServicio(porEliminar.id);
    await queryClient.invalidateQueries({ queryKey: CLAVE_SERVICIOS });
    setAviso(`Se eliminó el servicio «${porEliminar.nombre}».`);
    setPorEliminar(null);
    setTimeout(() => tituloRef.current?.focus(), 0);
  }

  return (
    <section className="mx-auto max-w-5xl">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1
            ref={tituloRef}
            tabIndex={-1}
            className="font-display text-4xl font-semibold text-ink outline-none"
          >
            Servicios y sacramentos
          </h1>
          <p className="mt-2 text-muted">
            Sacramentos, requisitos de inscripción y preguntas frecuentes de la sede.
          </p>
        </div>

        {puedeGestionar && (
          <button
            type="button"
            onClick={() => {
              setAviso('');
              setCreando(true);
            }}
            className="flex items-center gap-2 rounded-md bg-gold px-4 py-2.5 text-sm font-semibold text-ink hover:bg-goldDark hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-goldDark"
          >
            <Plus className="size-4" aria-hidden="true" />
            Nuevo servicio
          </button>
        )}
      </header>

      {!puedeGestionar && <BannerSoloLectura recurso="los servicios" />}

      <p
        role="status"
        className={aviso ? 'mt-4 rounded-md bg-goldPale px-3 py-2 text-sm text-goldDark' : 'sr-only'}
      >
        {aviso}
      </p>

      <div className="mt-6 flex flex-wrap gap-4 rounded-lg border border-borderSoft bg-white p-4">
        <div className="flex flex-col gap-1">
          <label htmlFor={idFiltro} className="text-xs font-semibold text-muted">
            Visibilidad
          </label>
          <select
            id={idFiltro}
            value={filtroVisible}
            onChange={(e) => setFiltroVisible(e.target.value)}
            className="rounded-md border border-borderSoft bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-goldDark"
          >
            <option value="">Todos</option>
            <option value="true">Visibles</option>
            <option value="false">Ocultos</option>
          </select>
        </div>
      </div>

      <div className="mt-6" aria-busy={serviciosQuery.isPending}>
        <EstadoLista
          cargando={serviciosQuery.isPending}
          error={serviciosQuery.error}
          vacio={!serviciosQuery.isPending && !serviciosQuery.error && servicios.length === 0}
          textoCargando="Cargando servicios…"
          textoVacio="No hay servicios registrados."
          onReintentar={() => serviciosQuery.refetch()}
        />

        {servicios.length > 0 && (
          <ul className="flex flex-col gap-3" aria-label="Servicios y sacramentos">
            {servicios.map((servicio, i) => (
              <li
                key={servicio.id}
                className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-borderSoft bg-white p-4"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="flex size-10 shrink-0 items-center justify-center rounded-md bg-goldPale text-goldDark"
                  >
                    <IconoDinamico nombre={servicio.icono} size={20} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-2xl font-semibold text-ink">
                        {servicio.nombre}
                      </h2>
                      {!servicio.visible && (
                        <span className="rounded-full bg-stone px-2 py-0.5 text-xs font-medium text-muted">
                          Oculto
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-charcoal">{servicio.descripcionCorta}</p>
                    <p className="mt-2 text-xs text-muted">
                      {servicio.contenido?.datos?.length ?? 0} requisitos ·{' '}
                      {servicio.preguntasFrecuentes?.length ?? 0} preguntas frecuentes
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setAviso('');
                      setFaqServicio(servicio);
                    }}
                    className="flex items-center gap-1 rounded-md border border-borderSoft bg-white px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark"
                  >
                    <HelpCircle className="size-3.5" aria-hidden="true" />
                    Preguntas frecuentes
                  </button>

                  {puedeGestionar && (
                    <>
                      {!filtroVisible && (
                        <>
                          <button
                            type="button"
                            onClick={() => mover(i, -1)}
                            disabled={i === 0 || reordenarMut.isPending}
                            aria-label={`Subir ${servicio.nombre}`}
                            className="rounded-md border border-borderSoft bg-white p-1.5 text-muted hover:bg-stone hover:text-ink disabled:opacity-40"
                          >
                            <ArrowUp className="size-3.5" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => mover(i, 1)}
                            disabled={i === servicios.length - 1 || reordenarMut.isPending}
                            aria-label={`Bajar ${servicio.nombre}`}
                            className="rounded-md border border-borderSoft bg-white p-1.5 text-muted hover:bg-stone hover:text-ink disabled:opacity-40"
                          >
                            <ArrowDown className="size-3.5" aria-hidden="true" />
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setAviso('');
                          setEditando(servicio);
                        }}
                        aria-label={`Editar ${servicio.nombre}`}
                        className="flex items-center gap-1 rounded-md border border-borderSoft bg-white px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark"
                      >
                        <Pencil className="size-3.5" aria-hidden="true" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAviso('');
                          setPorEliminar(servicio);
                        }}
                        aria-label={`Eliminar ${servicio.nombre}`}
                        className="flex items-center gap-1 rounded-md border border-redParish/30 bg-white px-2.5 py-1.5 text-xs font-medium text-redParish hover:bg-redParish/5 focus-visible:outline-2 focus-visible:outline-redParish"
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                        Eliminar
                      </button>
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
            setCreando(false);
            setEditando(null);
            setAviso(
              editando
                ? `Se actualizó el servicio «${guardado.nombre}».`
                : `Se creó el servicio «${guardado.nombre}».`,
            );
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
        <ConfirmarBorrado
          titulo={`¿Eliminar «${porEliminar.nombre}»?`}
          descripcion="Sus preguntas frecuentes quedarán sin servicio asociado para el asistente virtual. Esta acción no se puede deshacer."
          onConfirmar={confirmarEliminacion}
          onCancelar={() => setPorEliminar(null)}
        />
      )}
    </section>
  );
}

