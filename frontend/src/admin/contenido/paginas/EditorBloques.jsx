import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowLeft, ArrowUp, EyeOff, Inbox, Pencil, Plus, Trash2 } from 'lucide-react';

import ConfirmarAccion from '../../componentes/ConfirmarAccion.jsx';
import NoEncontrada from '../../paginas/NoEncontrada.jsx';
import {
  Aviso,
  Boton,
  EsqueletoTarjetas,
  EstadoVacio,
  Insignia,
  useToast,
} from '../../ui/index.js';
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

// Editor de bloques de una página (/admin/paginas/:id). `paginaId` sale de la ruta.
export default function EditorBloques({ paginaId, paginasDisponibles, puedeGestionar }) {
  const queryClient = useQueryClient();
  const toast = useToast();
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

  const eliminarMut = useMutation({
    mutationFn: (bloque) => eliminarBloque(paginaId, bloque.id),
    onSuccess: (_, bloque) => {
      queryClient.invalidateQueries({ queryKey: [...CLAVE_PAGINAS, paginaId] });
      const msg = `Se eliminó el bloque «${NOMBRES_TIPO_BLOQUE[bloque.tipo] ?? bloque.tipo}».`;
      setAviso(msg);
      toast.exito(msg);
      setBloquePorEliminar(null);
      setTimeout(() => tituloRef.current?.focus(), 0);
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

  // Una página que no existe (id desconocido) es una ruta desconocida.
  if (paginaQuery.isError && paginaQuery.error.estado === 404) return <NoEncontrada />;

  return (
    <section className="mx-auto max-w-5xl">
      <div className="mb-4">
        <Boton
          como={Link}
          to="/admin/paginas"
          state={{ enfocarTitulo: true }}
          variante="secundario"
          tamano="sm"
          icono={ArrowLeft}
        >
          Volver a páginas
        </Boton>
      </div>

      {paginaQuery.isPending && (
        <EsqueletoTarjetas cantidad={3} columnas="grid-cols-1" etiqueta="Cargando página y bloques…" />
      )}

      {paginaQuery.isError && (
        <Aviso
          tipo="error"
          accion={
            <Boton variante="secundario" tamano="sm" onClick={() => paginaQuery.refetch()}>
              Reintentar
            </Boton>
          }
        >
          <p>{paginaQuery.error.message || 'No se pudieron cargar los datos.'}</p>
        </Aviso>
      )}

      {!paginaQuery.isPending && !paginaQuery.isError && pagina && (
        <>
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1
                  ref={tituloRef}
                  tabIndex={-1}
                  className="font-body text-2xl font-semibold tracking-tight text-ink outline-none sm:text-[28px]"
                >
                  {pagina.titulo}
                </h1>
                <Insignia variante={pagina.estado.codigo === 'PUBLICADO' ? 'publicado' : 'borrador'}>
                  {pagina.estado.nombre}
                </Insignia>
              </div>
              <p className="mt-1.5 text-sm text-muted">
                Slug: <code>/{pagina.slug}</code>
                {pagina.paginaPadre && ` · Subpágina de «${pagina.paginaPadre.titulo}»`}
                {pagina.mostrarEnMenu && ` · En el menú (orden ${pagina.ordenMenu})`}
              </p>
            </div>

            {puedeGestionar && (
              <div className="flex flex-wrap gap-2">
                <Boton
                  variante="secundario"
                  icono={Pencil}
                  onClick={() => {
                    setAviso('');
                    setEditandoPagina(true);
                  }}
                >
                  Editar datos
                </Boton>
                <Boton
                  variante="primario"
                  icono={Plus}
                  onClick={() => {
                    setAviso('');
                    setCreandoBloque(true);
                  }}
                >
                  Agregar bloque
                </Boton>
              </div>
            )}
          </header>

          {!puedeGestionar && (
            <Aviso tipo="soloLectura" className="mt-4">
              <p>
                <strong className="font-semibold text-ink">Solo lectura:</strong> tu rol puede consultar esta página y
                sus bloques, pero no realizar cambios.
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

          {reordenarMut.isError && (
            <Aviso tipo="error" className="mt-4">
              <p>{reordenarMut.error.message}</p>
            </Aviso>
          )}

          <div className="mt-6">
            {bloques.length === 0 ? (
              <EstadoVacio
                icono={Inbox}
                titulo="Esta página todavía no tiene bloques."
                descripcion="Agrega bloques de texto, tarjetas, citas, videos o galería."
                accion={
                  puedeGestionar && (
                    <Boton variante="primario" icono={Plus} onClick={() => setCreandoBloque(true)}>
                      Agregar el primer bloque
                    </Boton>
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
                      className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-sand bg-white p-5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Insignia variante="borrador">#{bloque.orden}</Insignia>
                          <span className="font-semibold text-ink">{nombreTipo}</span>
                          {!bloque.visible && (
                            <Insignia variante="archivado">
                              <EyeOff className="mr-1 size-3" aria-hidden="true" />
                              Oculto
                            </Insignia>
                          )}
                        </div>
                        <p className="mt-1.5 break-words text-sm text-muted">{resumenBloque(bloque)}</p>
                      </div>

                      {puedeGestionar && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Boton
                            variante="secundario"
                            tamano="sm"
                            onClick={() => mover(indice, -1)}
                            disabled={indice === 0 || reordenarMut.isPending}
                            aria-label={`Subir bloque ${bloque.orden}: ${nombreTipo}`}
                          >
                            <ArrowUp className="size-3.5" aria-hidden="true" />
                          </Boton>
                          <Boton
                            variante="secundario"
                            tamano="sm"
                            onClick={() => mover(indice, 1)}
                            disabled={indice === bloques.length - 1 || reordenarMut.isPending}
                            aria-label={`Bajar bloque ${bloque.orden}: ${nombreTipo}`}
                          >
                            <ArrowDown className="size-3.5" aria-hidden="true" />
                          </Boton>
                          <Boton
                            variante="secundario"
                            tamano="sm"
                            icono={Pencil}
                            onClick={() => {
                              setAviso('');
                              setEditandoBloque(bloque);
                            }}
                            aria-label={`Editar bloque ${bloque.orden}: ${nombreTipo}`}
                          >
                            Editar
                          </Boton>
                          <Boton
                            variante="secundario"
                            tamano="sm"
                            icono={Trash2}
                            onClick={() => {
                              setAviso('');
                              setBloquePorEliminar(bloque);
                            }}
                            aria-label={`Eliminar bloque ${bloque.orden}: ${nombreTipo}`}
                          >
                            Eliminar
                          </Boton>
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
            const msg = editandoBloque
              ? `Se actualizó el bloque «${nombreTipo}».`
              : `Se agregó el bloque «${nombreTipo}».`;
            setAviso(msg);
            toast.exito(msg);
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
            const msg = `Se guardaron los cambios de la página «${guardada.titulo}».`;
            setAviso(msg);
            toast.exito(msg);
            setEditandoPagina(false);
            setTimeout(() => tituloRef.current?.focus(), 0);
          }}
          onCerrar={() => setEditandoPagina(false)}
        />
      )}

      {bloquePorEliminar && (
        <ConfirmarAccion
          titulo={`Eliminar bloque «${NOMBRES_TIPO_BLOQUE[bloquePorEliminar.tipo] ?? bloquePorEliminar.tipo}»`}
          pendiente={eliminarMut.isPending}
          error={eliminarMut.error}
          onConfirmar={() => eliminarMut.mutate(bloquePorEliminar)}
          onCancelar={() => {
            eliminarMut.reset();
            setBloquePorEliminar(null);
          }}
        >
          El bloque dejará de mostrarse en esta página.
        </ConfirmarAccion>
      )}
    </section>
  );
}
