import { useId, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock3, Pencil, Plus, Trash2 } from 'lucide-react';

import { usePermisos } from '../../permisos/usePermisos.js';
import BannerSoloLectura from '../componentes/BannerSoloLectura.jsx';
import ConfirmarBorrado from '../componentes/ConfirmarBorrado.jsx';
import EstadoLista from '../componentes/EstadoLista.jsx';
import {
  CLAVE_CATALOGOS,
  CLAVE_HORARIOS,
  DIAS_SEMANA,
  eliminarHorario,
  listarHorarios,
  nombreDia,
  obtenerCatalogos,
} from './api.js';
import FormularioHorario from './FormularioHorario.jsx';

function agruparHorarios(horarios) {
  const porTipo = new Map();
  for (const h of horarios) {
    if (!porTipo.has(h.tipo.id)) {
      porTipo.set(h.tipo.id, { tipo: h.tipo, dias: new Map() });
    }
    const grupoTipo = porTipo.get(h.tipo.id);
    if (!grupoTipo.dias.has(h.diaSemana)) {
      grupoTipo.dias.set(h.diaSemana, []);
    }
    grupoTipo.dias.get(h.diaSemana).push(h);
  }

  return [...porTipo.values()].map(({ tipo, dias }) => ({
    tipo,
    dias: DIAS_SEMANA.filter((d) => dias.has(d.valor)).map((d) => ({
      dia: d.valor,
      nombre: d.nombre,
      horarios: dias.get(d.valor),
    })),
  }));
}

export default function Horarios() {
  const queryClient = useQueryClient();
  const { puede } = usePermisos();
  const puedeGestionar = puede('horarios.gestionar');

  const idFiltroTipo = useId();
  const idFiltroEstado = useId();
  const tituloRef = useRef(null);

  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroActivo, setFiltroActivo] = useState('');
  const [editando, setEditando] = useState(null);
  const [creando, setCreando] = useState(false);
  const [porEliminar, setPorEliminar] = useState(null);
  const [aviso, setAviso] = useState('');

  const catalogosQuery = useQuery({
    queryKey: CLAVE_CATALOGOS,
    queryFn: obtenerCatalogos,
  });

  const horariosQuery = useQuery({
    queryKey: [...CLAVE_HORARIOS, { tipo: filtroTipo, activo: filtroActivo }],
    queryFn: () =>
      listarHorarios({
        tipo: filtroTipo || undefined,
        activo: filtroActivo || undefined,
      }),
  });

  const tiposHorario = catalogosQuery.data?.tiposHorario ?? [];
  const horarios = useMemo(() => horariosQuery.data ?? [], [horariosQuery.data]);
  const grupos = useMemo(() => agruparHorarios(horarios), [horarios]);

  async function confirmarEliminacion() {
    await eliminarHorario(porEliminar.id);
    await queryClient.invalidateQueries({ queryKey: CLAVE_HORARIOS });
    setAviso(`Se eliminó el horario de ${porEliminar.tipo.nombre} (${nombreDia(porEliminar.diaSemana)}, ${porEliminar.horaInicio}).`);
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
            Horarios
          </h1>
          <p className="mt-2 text-muted">
            Horarios de misas, confesiones, adoración y atención en secretaría.
          </p>
        </div>

        {puedeGestionar && (
          <button
            type="button"
            onClick={() => {
              setAviso('');
              setCreando(true);
            }}
            disabled={!tiposHorario.length}
            className="flex items-center gap-2 rounded-md bg-gold px-4 py-2.5 text-sm font-semibold text-ink hover:bg-goldDark hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-goldDark disabled:opacity-50"
          >
            <Plus className="size-4" aria-hidden="true" />
            Nuevo horario
          </button>
        )}
      </header>

      {!puedeGestionar && <BannerSoloLectura recurso="los horarios" />}

      <p
        role="status"
        className={aviso ? 'mt-4 rounded-md bg-goldPale px-3 py-2 text-sm text-goldDark' : 'sr-only'}
      >
        {aviso}
      </p>

      <div className="mt-6 flex flex-wrap gap-4 rounded-lg border border-borderSoft bg-white p-4">
        <div className="flex flex-col gap-1">
          <label htmlFor={idFiltroTipo} className="text-xs font-semibold text-muted">
            Tipo de horario
          </label>
          <select
            id={idFiltroTipo}
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="rounded-md border border-borderSoft bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-goldDark"
          >
            <option value="">Todos los tipos</option>
            {tiposHorario.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={idFiltroEstado} className="text-xs font-semibold text-muted">
            Estado
          </label>
          <select
            id={idFiltroEstado}
            value={filtroActivo}
            onChange={(e) => setFiltroActivo(e.target.value)}
            className="rounded-md border border-borderSoft bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-goldDark"
          >
            <option value="">Todos</option>
            <option value="true">Visibles</option>
            <option value="false">Ocultos</option>
          </select>
        </div>
      </div>

      <div className="mt-6" aria-busy={horariosQuery.isPending}>
        <EstadoLista
          cargando={horariosQuery.isPending}
          error={horariosQuery.error}
          vacio={!horariosQuery.isPending && !horariosQuery.error && grupos.length === 0}
          textoCargando="Cargando horarios…"
          textoVacio="No hay horarios registrados con estos filtros."
          onReintentar={() => horariosQuery.refetch()}
        />

        {grupos.length > 0 && (
          <div className="flex flex-col gap-6">
            {grupos.map(({ tipo, dias }) => (
              <section
                key={tipo.id}
                aria-labelledby={`tipo-horario-${tipo.id}`}
                className="overflow-hidden rounded-lg border border-borderSoft bg-white"
              >
                <header className="flex items-center gap-2 border-b border-borderSoft bg-stone/50 px-4 py-3">
                  <Clock3 className="size-4 text-goldDark" aria-hidden="true" />
                  <h2 id={`tipo-horario-${tipo.id}`} className="font-display text-2xl font-semibold text-ink">
                    {tipo.nombre}
                  </h2>
                </header>

                <div className="divide-y divide-borderSoft">
                  {dias.map(({ dia, nombre, horarios: delDia }) => (
                    <div key={dia} className="grid gap-3 px-4 py-3 sm:grid-cols-[10rem_1fr] sm:items-start">
                      <p className="pt-1 text-sm font-semibold text-charcoal">{nombre}</p>
                      <ul className="flex flex-col gap-2" aria-label={`${tipo.nombre} · ${nombre}`}>
                        {delDia.map((h) => (
                          <li
                            key={h.id}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-borderSoft/80 bg-cream/40 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-ink">
                                  {h.horaInicio}
                                  {h.horaFin ? ` – ${h.horaFin}` : ''}
                                </span>
                                {!h.activo && (
                                  <span className="rounded-full bg-stone px-2 py-0.5 text-xs font-medium text-muted">
                                    Oculto
                                  </span>
                                )}
                              </div>
                              {h.descripcion && (
                                <p className="mt-0.5 text-sm text-muted">{h.descripcion}</p>
                              )}
                            </div>

                            {puedeGestionar && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAviso('');
                                    setEditando(h);
                                  }}
                                  aria-label={`Editar horario ${tipo.nombre} ${nombre} ${h.horaInicio}`}
                                  className="flex items-center gap-1 rounded-md border border-borderSoft bg-white px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark"
                                >
                                  <Pencil className="size-3.5" aria-hidden="true" />
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAviso('');
                                    setPorEliminar(h);
                                  }}
                                  aria-label={`Eliminar horario ${tipo.nombre} ${nombre} ${h.horaInicio}`}
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
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {(creando || editando) && (
        <FormularioHorario
          horario={editando}
          tiposHorario={tiposHorario}
          onCerrar={() => {
            setCreando(false);
            setEditando(null);
          }}
          onGuardado={(guardado) => {
            setCreando(false);
            setEditando(null);
            setAviso(
              editando
                ? `Se actualizó el horario de ${guardado.tipo.nombre} (${nombreDia(guardado.diaSemana)}, ${guardado.horaInicio}).`
                : `Se creó el horario de ${guardado.tipo.nombre} (${nombreDia(guardado.diaSemana)}, ${guardado.horaInicio}).`,
            );
          }}
        />
      )}

      {porEliminar && (
        <ConfirmarBorrado
          titulo={`¿Eliminar horario de ${porEliminar.tipo.nombre}?`}
          descripcion={`Se eliminará el horario del ${nombreDia(porEliminar.diaSemana).toLowerCase()} a las ${porEliminar.horaInicio}. Esta acción no se puede deshacer.`}
          onConfirmar={confirmarEliminacion}
          onCancelar={() => setPorEliminar(null)}
        />
      )}
    </section>
  );
}

