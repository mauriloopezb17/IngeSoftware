import { useId, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Layers, Pencil, Plus, Trash2 } from 'lucide-react';

import { usePermisos } from '../../permisos/usePermisos.js';
import BannerSoloLectura from '../componentes/BannerSoloLectura.jsx';
import ConfirmarBorrado from '../componentes/ConfirmarBorrado.jsx';
import EstadoLista from '../componentes/EstadoLista.jsx';
import {
  CLAVE_PAGINAS,
  eliminarPagina,
  ESTADOS_PAGINA,
  listarPaginas,
} from './api.js';
import EditorBloques from './EditorBloques.jsx';
import FormularioPagina from './FormularioPagina.jsx';

export default function Paginas() {
  const queryClient = useQueryClient();
  const { puede } = usePermisos();
  const puedeGestionar = puede('paginas.gestionar');

  const idFiltroEstado = useId();
  const tituloRef = useRef(null);

  const [filtroEstado, setFiltroEstado] = useState('');
  const [paginaActivaId, setPaginaActivaId] = useState(null);
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState(null);
  const [porEliminar, setPorEliminar] = useState(null);
  const [aviso, setAviso] = useState('');

  const paginasQuery = useQuery({
    queryKey: [...CLAVE_PAGINAS, { estado: filtroEstado }],
    queryFn: () => listarPaginas({ estado: filtroEstado || undefined }),
  });

  const paginas = paginasQuery.data ?? [];

  if (paginaActivaId !== null) {
    return (
      <EditorBloques
        paginaId={paginaActivaId}
        paginasDisponibles={paginas}
        puedeGestionar={puedeGestionar}
        onVolver={() => {
          setPaginaActivaId(null);
          setTimeout(() => tituloRef.current?.focus(), 0);
        }}
      />
    );
  }

  async function confirmarEliminacion() {
    await eliminarPagina(porEliminar.id);
    await queryClient.invalidateQueries({ queryKey: CLAVE_PAGINAS });
    setAviso(`Se eliminó la página «${porEliminar.titulo}».`);
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
            Páginas
          </h1>
          <p className="mt-2 text-muted">
            Páginas institucionales del portal y sus bloques de contenido.
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
            Nueva página
          </button>
        )}
      </header>

      {!puedeGestionar && <BannerSoloLectura recurso="las páginas y sus bloques" />}

      <p
        role="status"
        className={aviso ? 'mt-4 rounded-md bg-goldPale px-3 py-2 text-sm text-goldDark' : 'sr-only'}
      >
        {aviso}
      </p>

      <div className="mt-6 flex flex-wrap gap-4 rounded-lg border border-borderSoft bg-white p-4">
        <div className="flex min-w-52 flex-col gap-1">
          <label htmlFor={idFiltroEstado} className="text-xs font-semibold text-muted">
            Estado
          </label>
          <select
            id={idFiltroEstado}
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="rounded-md border border-borderSoft bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-goldDark"
          >
            <option value="">Todos los estados</option>
            {ESTADOS_PAGINA.map((est) => (
              <option key={est.codigo} value={est.codigo}>
                {est.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6">
        <EstadoLista
          cargando={paginasQuery.isPending}
          error={paginasQuery.isError ? paginasQuery.error : null}
          vacio={!paginasQuery.isPending && !paginasQuery.isError && paginas.length === 0}
          textoCargando="Cargando páginas…"
          textoVacio="No hay páginas para el filtro seleccionado."
          onReintentar={() => paginasQuery.refetch()}
        />

        {paginas.length > 0 && (
          <ul aria-label="Páginas" className="flex flex-col gap-3">
            {paginas.map((pagina) => (
              <li
                key={pagina.id}
                className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-borderSoft bg-white p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-ink">{pagina.titulo}</h2>
                    <span className="rounded-full bg-goldPale px-2.5 py-0.5 text-xs font-semibold text-goldDark">
                      {pagina.estado.nombre}
                    </span>
                    {pagina.mostrarEnMenu && (
                      <span className="rounded-full bg-stone px-2.5 py-0.5 text-xs font-medium text-charcoal">
                        Menú · orden {pagina.ordenMenu}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    Slug: <code>/{pagina.slug}</code>
                    {pagina.paginaPadre && ` · Subpágina de «${pagina.paginaPadre.titulo}»`}
                  </p>
                  {pagina.descripcionSeo && (
                    <p className="mt-1 break-words text-sm text-charcoal">{pagina.descripcionSeo}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAviso('');
                      setPaginaActivaId(pagina.id);
                    }}
                    className="flex items-center gap-1.5 rounded-md border border-borderSoft bg-cream px-3 py-2 text-sm font-medium text-ink hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark"
                  >
                    <Layers className="size-4" aria-hidden="true" />
                    {puedeGestionar ? 'Bloques' : 'Ver bloques'}
                  </button>

                  {puedeGestionar && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setAviso('');
                          setEditando(pagina);
                        }}
                        aria-label={`Editar datos de «${pagina.titulo}»`}
                        className="flex items-center gap-1.5 rounded-md border border-borderSoft bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark"
                      >
                        <Pencil className="size-4" aria-hidden="true" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAviso('');
                          setPorEliminar(pagina);
                        }}
                        aria-label={`Eliminar «${pagina.titulo}»`}
                        className="flex items-center gap-1.5 rounded-md border border-borderSoft bg-white px-3 py-2 text-sm font-medium text-redParish hover:bg-redParish/5 focus-visible:outline-2 focus-visible:outline-redParish"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
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
        <FormularioPagina
          pagina={editando}
          paginasDisponibles={paginas}
          onGuardado={(guardada) => {
            setAviso(
              editando
                ? `Se actualizaron los datos de «${guardada.titulo}».`
                : `Se creó la página «${guardada.titulo}».`,
            );
            setCreando(false);
            setEditando(null);
            setTimeout(() => tituloRef.current?.focus(), 0);
          }}
          onCerrar={() => {
            setCreando(false);
            setEditando(null);
          }}
        />
      )}

      {porEliminar && (
        <ConfirmarBorrado
          titulo={`Eliminar «${porEliminar.titulo}»`}
          descripcion="Se eliminarán la página y todos sus bloques."
          onConfirmar={confirmarEliminacion}
          onCancelar={() => setPorEliminar(null)}
        />
      )}
    </section>
  );
}

