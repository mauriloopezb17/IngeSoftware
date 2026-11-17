import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Inbox, Pencil, Plus, Trash2 } from 'lucide-react';

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
import { CLAVE_GRUPOS, eliminarGrupo, listarGrupos, reordenarGrupos } from './api.js';
import FormularioGrupo from './FormularioGrupo.jsx';

export default function Grupos() {
  const queryClient = useQueryClient();
  const { puede } = usePermisos();
  const toast = useToast();
  const puedeGestionar = puede('grupos.gestionar');

  const tituloRef = useRef(null);

  const [filtroVisible, setFiltroVisible] = useState('');
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState(null);
  const [porEliminar, setPorEliminar] = useState(null);

  const gruposQuery = useQuery({
    queryKey: [...CLAVE_GRUPOS, { visible: filtroVisible }],
    queryFn: () => listarGrupos({ visible: filtroVisible || undefined }),
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

  const grupos = gruposQuery.data ?? [];

  function mover(indice, direccion) {
    const destino = indice + direccion;
    if (destino < 0 || destino >= grupos.length) return;
    const ids = grupos.map((g) => g.id);
    [ids[indice], ids[destino]] = [ids[destino], ids[indice]];
    reordenarMut.mutate(ids);
  }

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

      <div className="mt-6" aria-busy={gruposQuery.isPending}>
        {gruposQuery.isPending && (
          <EsqueletoTarjetas cantidad={3} columnas="grid-cols-1" etiqueta="Cargando grupos pastorales…" />
        )}

        {gruposQuery.error && (
          <Aviso
            tipo="error"
            accion={
              <Boton variante="secundario" tamano="sm" onClick={() => gruposQuery.refetch()}>
                Reintentar
              </Boton>
            }
          >
            <p>{gruposQuery.error.message || 'No se pudieron cargar los datos.'}</p>
          </Aviso>
        )}

        {!gruposQuery.isPending && !gruposQuery.error && grupos.length === 0 && (
          <EstadoVacio
            icono={Inbox}
            titulo="No hay grupos pastorales registrados."
            descripcion="Agrega movimientos, ministerios y pastorales de la parroquia."
            accion={
              puedeGestionar && (
                <Boton
                  variante="primario"
                  icono={Plus}
                  onClick={() => setCreando(true)}
                >
                  Agregar el primer grupo
                </Boton>
              )
            }
          />
        )}

        {grupos.length > 0 && (
          <ul className="flex flex-col gap-3" aria-label="Grupos pastorales">
            {grupos.map((grupo, i) => (
              <li
                key={grupo.id}
                className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-sand bg-white p-5"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3.5">
                  {grupo.imagen ? (
                    <img
                      src={grupo.imagen.url}
                      alt={grupo.imagen.textoAlternativo || grupo.nombre}
                      className="size-14 shrink-0 rounded-md border border-sand object-cover"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="flex size-12 shrink-0 items-center justify-center rounded-md border border-sand bg-gold-soft text-ink"
                    >
                      <IconoDinamico nombre={grupo.icono} size={22} />
                    </span>
                  )}

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-body text-base font-semibold text-ink">{grupo.nombre}</h2>
                      {!grupo.visible && <Insignia variante="archivado">Oculto</Insignia>}
                    </div>
                    {grupo.horarioReunion && (
                      <p className="mt-1 text-sm font-medium text-ink">{grupo.horarioReunion}</p>
                    )}
                    {grupo.descripcion && <p className="mt-1 text-sm text-muted">{grupo.descripcion}</p>}
                    {grupo.contacto && <p className="mt-1 text-xs text-muted">{grupo.contacto}</p>}
                  </div>
                </div>

                {puedeGestionar && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {!filtroVisible && (
                      <>
                        <Boton
                          variante="secundario"
                          tamano="sm"
                          onClick={() => mover(i, -1)}
                          disabled={i === 0 || reordenarMut.isPending}
                          aria-label={`Subir ${grupo.nombre}`}
                        >
                          <ArrowUp className="size-3.5" aria-hidden="true" />
                        </Boton>
                        <Boton
                          variante="secundario"
                          tamano="sm"
                          onClick={() => mover(i, 1)}
                          disabled={i === grupos.length - 1 || reordenarMut.isPending}
                          aria-label={`Bajar ${grupo.nombre}`}
                        >
                          <ArrowDown className="size-3.5" aria-hidden="true" />
                        </Boton>
                      </>
                    )}
                    <Boton
                      variante="secundario"
                      tamano="sm"
                      icono={Pencil}
                      onClick={() => setEditando(grupo)}
                      aria-label={`Editar ${grupo.nombre}`}
                    >
                      Editar
                    </Boton>
                    <Boton
                      variante="secundario"
                      tamano="sm"
                      icono={Trash2}
                      onClick={() => setPorEliminar(grupo)}
                      aria-label={`Eliminar ${grupo.nombre}`}
                    >
                      Eliminar
                    </Boton>
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
            const msg = editando
              ? `Se actualizó el grupo «${guardado.nombre}».`
              : `Se creó el grupo «${guardado.nombre}».`;
            setCreando(false);
            setEditando(null);
            toast.exito(msg);
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
          El grupo dejará de mostrarse en el portal. Esta acción no se puede deshacer.
        </ConfirmarAccion>
      )}
    </section>
  );
}
