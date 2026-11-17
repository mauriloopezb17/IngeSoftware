import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock3, Inbox, Pencil, Plus, Trash2 } from 'lucide-react';

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
  const toast = useToast();
  const puedeGestionar = puede('horarios.gestionar');

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

  const eliminarMut = useMutation({
    mutationFn: (horario) => eliminarHorario(horario.id),
    onSuccess: (_, horario) => {
      queryClient.invalidateQueries({ queryKey: CLAVE_HORARIOS });
      const msg = `Se eliminó el horario de ${horario.tipo.nombre} (${nombreDia(horario.diaSemana)}, ${horario.horaInicio}).`;
      setAviso(msg);
      toast.exito(msg);
      setPorEliminar(null);
      setTimeout(() => tituloRef.current?.focus(), 0);
    },
  });

  const tiposHorario = catalogosQuery.data?.tiposHorario ?? [];
  const horarios = useMemo(() => horariosQuery.data ?? [], [horariosQuery.data]);
  const grupos = useMemo(() => agruparHorarios(horarios), [horarios]);

  return (
    <section className="mx-auto max-w-5xl">
      <EncabezadoPantalla
        titulo="Horarios"
        descripcion="Horarios de misas, confesiones, adoración y atención en secretaría."
        headingRef={tituloRef}
        acciones={
          puedeGestionar && (
            <Boton
              variante="primario"
              icono={Plus}
              disabled={!tiposHorario.length}
              onClick={() => {
                setAviso('');
                setCreando(true);
              }}
            >
              Nuevo horario
            </Boton>
          )
        }
      />

      {!puedeGestionar && (
        <Aviso tipo="soloLectura" className="mt-4">
          <p>
            <strong className="font-semibold text-ink">Solo lectura:</strong> tu rol puede consultar los horarios, pero
            no realizar cambios.
          </p>
        </Aviso>
      )}

      {aviso ? (
        <Aviso tipo="exito" className="mt-4">
          {aviso}
        </Aviso>
      ) : (
        <p role="status" className="sr-only" />
      )}

      <div className="mt-6 grid gap-4 rounded-lg border border-sand bg-white p-4 sm:max-w-lg sm:grid-cols-2">
        <CampoSelect
          etiqueta="Tipo de horario"
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
        >
          <option value="">Todos los tipos</option>
          {tiposHorario.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
        </CampoSelect>

        <CampoSelect
          etiqueta="Estado"
          value={filtroActivo}
          onChange={(e) => setFiltroActivo(e.target.value)}
        >
          <option value="">Todos</option>
          <option value="true">Visibles</option>
          <option value="false">Ocultos</option>
        </CampoSelect>
      </div>

      <div className="mt-6" aria-busy={horariosQuery.isPending}>
        {horariosQuery.isPending && (
          <EsqueletoTarjetas cantidad={3} columnas="grid-cols-1" etiqueta="Cargando horarios…" />
        )}

        {horariosQuery.error && (
          <Aviso
            tipo="error"
            accion={
              <Boton variante="secundario" tamano="sm" onClick={() => horariosQuery.refetch()}>
                Reintentar
              </Boton>
            }
          >
            <p>{horariosQuery.error.message || 'No se pudieron cargar los datos.'}</p>
          </Aviso>
        )}

        {!horariosQuery.isPending && !horariosQuery.error && grupos.length === 0 && (
          <EstadoVacio
            icono={Inbox}
            titulo="No hay horarios registrados con estos filtros."
            descripcion="Ajusta los filtros o agrega un nuevo horario parroquial."
            accion={
              puedeGestionar &&
              tiposHorario.length > 0 && (
                <Boton
                  variante="primario"
                  icono={Plus}
                  onClick={() => {
                    setAviso('');
                    setCreando(true);
                  }}
                >
                  Agregar el primer horario
                </Boton>
              )
            }
          />
        )}

        {grupos.length > 0 && (
          <div className="flex flex-col gap-6">
            {grupos.map(({ tipo, dias }) => (
              <section
                key={tipo.id}
                aria-labelledby={`tipo-horario-${tipo.id}`}
                className="overflow-hidden rounded-lg border border-sand bg-white"
              >
                <header className="flex items-center gap-2 border-b border-sand bg-panel px-4 py-3">
                  <Clock3 className="size-4 text-ink" aria-hidden="true" />
                  <h2 id={`tipo-horario-${tipo.id}`} className="font-body text-base font-semibold text-ink">
                    {tipo.nombre}
                  </h2>
                </header>

                <div className="divide-y divide-sand">
                  {dias.map(({ dia, nombre, horarios: delDia }) => (
                    <div key={dia} className="grid gap-3 px-4 py-3.5 sm:grid-cols-[10rem_1fr] sm:items-start">
                      <p className="pt-1 text-sm font-semibold text-ink">{nombre}</p>
                      <ul className="flex flex-col gap-2" aria-label={`${tipo.nombre} · ${nombre}`}>
                        {delDia.map((h) => (
                          <li
                            key={h.id}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-sand bg-panel/60 px-3.5 py-2.5"
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold tabular-nums text-ink">
                                  {h.horaInicio}
                                  {h.horaFin ? ` – ${h.horaFin}` : ''}
                                </span>
                                {!h.activo && <Insignia variante="archivado">Oculto</Insignia>}
                              </div>
                              {h.descripcion && <p className="mt-0.5 text-sm text-muted">{h.descripcion}</p>}
                            </div>

                            {puedeGestionar && (
                              <div className="flex items-center gap-1.5">
                                <Boton
                                  variante="secundario"
                                  tamano="sm"
                                  icono={Pencil}
                                  onClick={() => {
                                    setAviso('');
                                    setEditando(h);
                                  }}
                                  aria-label={`Editar horario ${tipo.nombre} ${nombre} ${h.horaInicio}`}
                                >
                                  Editar
                                </Boton>
                                <Boton
                                  variante="secundario"
                                  tamano="sm"
                                  icono={Trash2}
                                  onClick={() => {
                                    setAviso('');
                                    setPorEliminar(h);
                                  }}
                                  aria-label={`Eliminar horario ${tipo.nombre} ${nombre} ${h.horaInicio}`}
                                >
                                  Eliminar
                                </Boton>
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
            const msg = editando
              ? `Se actualizó el horario de ${guardado.tipo.nombre} (${nombreDia(guardado.diaSemana)}, ${guardado.horaInicio}).`
              : `Se creó el horario de ${guardado.tipo.nombre} (${nombreDia(guardado.diaSemana)}, ${guardado.horaInicio}).`;
            setCreando(false);
            setEditando(null);
            setAviso(msg);
            toast.exito(msg);
          }}
        />
      )}

      {porEliminar && (
        <ConfirmarAccion
          titulo={`¿Eliminar horario de ${porEliminar.tipo.nombre}?`}
          pendiente={eliminarMut.isPending}
          error={eliminarMut.error}
          onConfirmar={() => eliminarMut.mutate(porEliminar)}
          onCancelar={() => {
            eliminarMut.reset();
            setPorEliminar(null);
          }}
        >
          Se eliminará el horario del {nombreDia(porEliminar.diaSemana).toLowerCase()} a las {porEliminar.horaInicio}.
          Esta acción no se puede deshacer.
        </ConfirmarAccion>
      )}
    </section>
  );
}
