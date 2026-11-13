import { useId, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react';

import { IconoDinamico } from '../../../components/parroquia/IconoDinamico.jsx';
import { usePermisos } from '../../permisos/usePermisos.js';
import BannerSoloLectura from '../componentes/BannerSoloLectura.jsx';
import ConfirmarBorrado from '../componentes/ConfirmarBorrado.jsx';
import EstadoLista from '../componentes/EstadoLista.jsx';
import {
  CLAVE_GRUPOS,
  eliminarGrupo,
  listarGrupos,
  reordenarGrupos,
} from './api.js';
import FormularioGrupo from './FormularioGrupo.jsx';

export default function Grupos() {
  const queryClient = useQueryClient();
  const { puede } = usePermisos();
  const puedeGestionar = puede('grupos.gestionar');

  const idFiltro = useId();
  const tituloRef = useRef(null);

  const [filtroVisible, setFiltroVisible] = useState('');
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState(null);
  const [porEliminar, setPorEliminar] = useState(null);
  const [aviso, setAviso] = useState('');

  const gruposQuery = useQuery({
    queryKey: [...CLAVE_GRUPOS, { visible: filtroVisible }],
    queryFn: () => listarGrupos({ visible: filtroVisible || undefined }),
  });

  const reordenarMut = useMutation({
    mutationFn: (ids) => reordenarGrupos(ids),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLAVE_GRUPOS }),
  });

  const grupos = gruposQuery.data ?? [];

  function mover(indice, direccion) {
    const destino = indice + direccion;
    if (destino < 0 || destino >= grupos.length) return;
    const ids = grupos.map((g) => g.id);
    [ids[indice], ids[destino]] = [ids[destino], ids[indice]];
    reordenarMut.mutate(ids);
  }

  async function confirmarEliminacion() {
    await eliminarGrupo(porEliminar.id);
    await queryClient.invalidateQueries({ queryKey: CLAVE_GRUPOS });
    setAviso(`Se eliminó el grupo «${porEliminar.nombre}».`);
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
            Grupos pastorales
          </h1>
          <p className="mt-2 text-muted">
            Movimientos, ministerios y pastorales de la comunidad parroquial.
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
            Nuevo grupo
          </button>
        )}
      </header>

      {!puedeGestionar && <BannerSoloLectura recurso="los grupos pastorales" />}

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

      <div className="mt-6" aria-busy={gruposQuery.isPending}>
        <EstadoLista
          cargando={gruposQuery.isPending}
          error={gruposQuery.error}
          vacio={!gruposQuery.isPending && !gruposQuery.error && grupos.length === 0}
          textoCargando="Cargando grupos pastorales…"
          textoVacio="No hay grupos pastorales registrados."
          onReintentar={() => gruposQuery.refetch()}
        />

        {grupos.length > 0 && (
          <ul className="flex flex-col gap-3" aria-label="Grupos pastorales">
            {grupos.map((grupo, i) => (
              <li
                key={grupo.id}
                className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-borderSoft bg-white p-4"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  {grupo.imagen ? (
                    <img
                      src={grupo.imagen.url}
                      alt={grupo.imagen.textoAlternativo || grupo.nombre}
                      className="size-14 shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="flex size-12 shrink-0 items-center justify-center rounded-md bg-goldPale text-goldDark"
                    >
                      <IconoDinamico nombre={grupo.icono} size={22} />
                    </span>
                  )}

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-2xl font-semibold text-ink">
                        {grupo.nombre}
                      </h2>
                      {!grupo.visible && (
                        <span className="rounded-full bg-stone px-2 py-0.5 text-xs font-medium text-muted">
                          Oculto
                        </span>
                      )}
                    </div>
                    {grupo.horarioReunion && (
                      <p className="mt-0.5 text-sm font-medium text-goldDark">
                        {grupo.horarioReunion}
                      </p>
                    )}
                    {grupo.descripcion && (
                      <p className="mt-1 text-sm text-charcoal">{grupo.descripcion}</p>
                    )}
                    {grupo.contacto && (
                      <p className="mt-1 text-xs text-muted">{grupo.contacto}</p>
                    )}
                  </div>
                </div>

                {puedeGestionar && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {!filtroVisible && (
                      <>
                        <button
                          type="button"
                          onClick={() => mover(i, -1)}
                          disabled={i === 0 || reordenarMut.isPending}
                          aria-label={`Subir ${grupo.nombre}`}
                          className="rounded-md border border-borderSoft bg-white p-1.5 text-muted hover:bg-stone hover:text-ink disabled:opacity-40"
                        >
                          <ArrowUp className="size-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => mover(i, 1)}
                          disabled={i === grupos.length - 1 || reordenarMut.isPending}
                          aria-label={`Bajar ${grupo.nombre}`}
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
                        setEditando(grupo);
                      }}
                      aria-label={`Editar ${grupo.nombre}`}
                      className="flex items-center gap-1 rounded-md border border-borderSoft bg-white px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark"
                    >
                      <Pencil className="size-3.5" aria-hidden="true" />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAviso('');
                        setPorEliminar(grupo);
                      }}
                      aria-label={`Eliminar ${grupo.nombre}`}
                      className="flex items-center gap-1 rounded-md border border-redParish/30 bg-white px-2.5 py-1.5 text-xs font-medium text-redParish hover:bg-redParish/5 focus-visible:outline-2 focus-visible:outline-redParish"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                      Eliminar
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {(creando || editando) && (
        <FormularioGrupo
          grupo={editando}
          onCerrar={() => {
            setCreando(false);
            setEditando(null);
          }}
          onGuardado={(guardado) => {
            setCreando(false);
            setEditando(null);
            setAviso(
              editando
                ? `Se actualizó el grupo «${guardado.nombre}».`
                : `Se creó el grupo «${guardado.nombre}».`,
            );
          }}
        />
      )}

      {porEliminar && (
        <ConfirmarBorrado
          titulo={`¿Eliminar «${porEliminar.nombre}»?`}
          descripcion="El grupo dejará de mostrarse en el portal. Esta acción no se puede deshacer."
          onConfirmar={confirmarEliminacion}
          onCancelar={() => setPorEliminar(null)}
        />
      )}
    </section>
  );
}

