import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowLeft, ArrowUp, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';

import BannerSoloLectura from '../componentes/BannerSoloLectura.jsx';
import ConfirmarBorrado from '../componentes/ConfirmarBorrado.jsx';
import EstadoLista from '../componentes/EstadoLista.jsx';
import {
  CLAVE_PAGINAS,
  eliminarBloque,
  NOMBRES_TIPO_BLOQUE,
  obtenerPagina,
  reordenarBloques,
  resumenBloque,
} from './api.js';
import FormularioBloque from './FormularioBloque.jsx';
import FormularioPagina from './FormularioPagina.jsx';

export default function EditorBloques({
  paginaId,
  paginasDisponibles,
  puedeGestionar,
  onVolver,
}) {
  const queryClient = useQueryClient();
  const tituloRef = useRef(null);

  const [creandoBloque, setCreandoBloque] = useState(false);
  const [editandoBloque, setEditandoBloque] = useState(null);
  const [editandoPagina, setEditandoPagina] = useState(false);
  const [bloquePorEliminar, setBloquePorEliminar] = useState(null);
  const [aviso, setAviso] = useState('');

  const paginaQuery = useQuery({
    queryKey: [...CLAVE_PAGINAS, paginaId],
    queryFn: () => obtenerPagina(paginaId),
  });

  const reordenarMut = useMutation({
    mutationFn: (ids) => reordenarBloques(paginaId, ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...CLAVE_PAGINAS, paginaId] });
    },
  });

  const pagina = paginaQuery.data;
  const bloques = pagina?.bloques ?? [];

  function mover(indice, direccion) {
    const destino = indice + direccion;
    if (destino < 0 || destino >= bloques.length) return;
    const ids = bloques.map((b) => b.id);
    [ids[indice], ids[destino]] = [ids[destino], ids[indice]];
    reordenarMut.mutate(ids);
  }

  async function confirmarBorradoBloque() {
    await eliminarBloque(paginaId, bloquePorEliminar.id);
    await queryClient.invalidateQueries({ queryKey: [...CLAVE_PAGINAS, paginaId] });
    setAviso(
      `Se eliminó el bloque «${NOMBRES_TIPO_BLOQUE[bloquePorEliminar.tipo] ?? bloquePorEliminar.tipo}».`,
    );
    setBloquePorEliminar(null);
    setTimeout(() => tituloRef.current?.focus(), 0);
  }

  return (
    <section className="mx-auto max-w-5xl">
      <div className="mb-4">
        <button
          type="button"
          onClick={onVolver}
          className="inline-flex items-center gap-1.5 rounded-md border border-borderSoft bg-white px-3 py-1.5 text-sm font-medium text-ink hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver a páginas
        </button>
      </div>

      {paginaQuery.isPending || paginaQuery.isError ? (
        <EstadoLista
          cargando={paginaQuery.isPending}
          error={paginaQuery.isError ? paginaQuery.error : null}
          vacio={false}
          textoCargando="Cargando página y bloques…"
          onReintentar={() => paginaQuery.refetch()}
        />
      ) : (
        <>
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1
                  ref={tituloRef}
                  tabIndex={-1}
                  className="font-display text-4xl font-semibold text-ink outline-none"
                >
                  {pagina.titulo}
                </h1>
                <span className="rounded-full bg-goldPale px-2.5 py-0.5 text-xs font-semibold text-goldDark">
                  {pagina.estado.nombre}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted">
                Slug: <code>/{pagina.slug}</code>
                {pagina.paginaPadre && ` · Subpágina de «${pagina.paginaPadre.titulo}»`}
                {pagina.mostrarEnMenu && ` · En el menú (orden ${pagina.ordenMenu})`}
              </p>
            </div>

            {puedeGestionar && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAviso('');
                    setEditandoPagina(true);
                  }}
                  className="flex items-center gap-1.5 rounded-md border border-borderSoft bg-white px-3.5 py-2.5 text-sm font-medium text-ink hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark"
                >
                  <Pencil className="size-4" aria-hidden="true" />
                  Editar datos
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAviso('');
                    setCreandoBloque(true);
                  }}
                  className="flex items-center gap-2 rounded-md bg-gold px-4 py-2.5 text-sm font-semibold text-ink hover:bg-goldDark hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-goldDark"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Agregar bloque
                </button>
              </div>
            )}
          </header>

          {!puedeGestionar && <BannerSoloLectura recurso="esta página y sus bloques" />}

          <p
            role="status"
            className={aviso ? 'mt-4 rounded-md bg-goldPale px-3 py-2 text-sm text-goldDark' : 'sr-only'}
          >
            {aviso}
          </p>

          {reordenarMut.isError && (
            <p
              role="alert"
              className="mt-4 rounded-md border border-redParish/30 bg-redParish/5 px-3 py-2 text-sm text-redParish"
            >
              {reordenarMut.error.message}
            </p>
          )}

          <div className="mt-6">
            {bloques.length === 0 ? (
              <EstadoLista
                cargando={false}
                error={null}
                vacio
                textoVacio="Esta página todavía no tiene bloques."
                accionVacio={
                  puedeGestionar && (
                    <button
                      type="button"
                      onClick={() => setCreandoBloque(true)}
                      className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-ink hover:bg-goldDark hover:text-white"
                    >
                      Agregar el primer bloque
                    </button>
                  )
                }
              />
            ) : (
              <ul aria-label="Bloques de la página" className="flex flex-col gap-3">
                {bloques.map((bloque, indice) => {
                  const nombreTipo = NOMBRES_TIPO_BLOQUE[bloque.tipo] ?? bloque.tipo;
                  return (
                    <li
                      key={bloque.id}
                      className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-borderSoft bg-white p-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded bg-stone px-2 py-0.5 text-xs font-semibold text-charcoal">
                            #{bloque.orden}
                          </span>
                          <span className="font-semibold text-ink">{nombreTipo}</span>
                          {!bloque.visible && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-stone px-2 py-0.5 text-xs font-medium text-muted">
                              <EyeOff className="size-3" aria-hidden="true" />
                              Oculto
                            </span>
                          )}
                        </div>
                        <p className="mt-1.5 break-words text-sm text-charcoal">
                          {resumenBloque(bloque)}
                        </p>
                      </div>

                      {puedeGestionar && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => mover(indice, -1)}
                            disabled={indice === 0 || reordenarMut.isPending}
                            aria-label={`Subir bloque ${bloque.orden}: ${nombreTipo}`}
                            className="rounded-md border border-borderSoft bg-white p-2 text-charcoal hover:bg-stone disabled:opacity-40"
                          >
                            <ArrowUp className="size-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => mover(indice, 1)}
                            disabled={indice === bloques.length - 1 || reordenarMut.isPending}
                            aria-label={`Bajar bloque ${bloque.orden}: ${nombreTipo}`}
                            className="rounded-md border border-borderSoft bg-white p-2 text-charcoal hover:bg-stone disabled:opacity-40"
                          >
                            <ArrowDown className="size-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAviso('');
                              setEditandoBloque(bloque);
                            }}
                            aria-label={`Editar bloque ${bloque.orden}: ${nombreTipo}`}
                            className="flex items-center gap-1.5 rounded-md border border-borderSoft bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark"
                          >
                            <Pencil className="size-4" aria-hidden="true" />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAviso('');
                              setBloquePorEliminar(bloque);
                            }}
                            aria-label={`Eliminar bloque ${bloque.orden}: ${nombreTipo}`}
                            className="flex items-center gap-1.5 rounded-md border border-borderSoft bg-white px-3 py-2 text-sm font-medium text-redParish hover:bg-redParish/5 focus-visible:outline-2 focus-visible:outline-redParish"
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                            Eliminar
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}

      {(creandoBloque || editandoBloque) && (
        <FormularioBloque
          paginaId={paginaId}
          bloque={editandoBloque}
          onGuardado={(guardado) => {
            const nombreTipo = NOMBRES_TIPO_BLOQUE[guardado.tipo] ?? guardado.tipo;
            setAviso(
              editandoBloque
                ? `Se actualizó el bloque «${nombreTipo}».`
                : `Se agregó el bloque «${nombreTipo}».`,
            );
            setCreandoBloque(false);
            setEditandoBloque(null);
            setTimeout(() => tituloRef.current?.focus(), 0);
          }}
          onCerrar={() => {
            setCreandoBloque(false);
            setEditandoBloque(null);
          }}
        />
      )}

      {editandoPagina && pagina && (
        <FormularioPagina
          pagina={pagina}
          paginasDisponibles={paginasDisponibles}
          onGuardado={async (guardada) => {
            await queryClient.invalidateQueries({ queryKey: [...CLAVE_PAGINAS, paginaId] });
            setAviso(`Se guardaron los cambios de la página «${guardada.titulo}».`);
            setEditandoPagina(false);
            setTimeout(() => tituloRef.current?.focus(), 0);
          }}
          onCerrar={() => setEditandoPagina(false)}
        />
      )}

      {bloquePorEliminar && (
        <ConfirmarBorrado
          titulo={`Eliminar bloque «${NOMBRES_TIPO_BLOQUE[bloquePorEliminar.tipo] ?? bloquePorEliminar.tipo}»`}
          descripcion="El bloque dejará de mostrarse en esta página."
          onConfirmar={confirmarBorradoBloque}
          onCancelar={() => setBloquePorEliminar(null)}
        />
      )}
    </section>
  );
}

