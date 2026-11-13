import { useState } from 'react';
import { Link } from 'react-router';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Check, Inbox, Loader2, Pencil, X } from 'lucide-react';

import Paginacion from '../componentes/Paginacion.jsx';
import SinPermiso from '../componentes/SinPermiso.jsx';
import { formatearFecha } from '../multimedia/formato.js';
import { usePermisos } from '../permisos/usePermisos.js';
import { CLAVE_PUBLICACIONES, listarPublicaciones, POR_PAGINA } from './api.js';
import { DialogoAprobar, DialogoRechazar } from './DialogosRevision.jsx';

// La bandeja vive bajo la clave de las publicaciones: invalidar CLAVE_PUBLICACIONES refresca a la vez
// el listado y la bandeja después de aprobar o rechazar.
const claveBandeja = (pagina) => [...CLAVE_PUBLICACIONES, 'bandeja', pagina];

// /admin/publicaciones/revision: lo que espera la revisión del Párroco en su sede. La sección la decide
// matriz.js (permiso noticias.publicar); los botones de cada publicación, el campo `acciones` de la API.
export default function BandejaRevision() {
  const { puede } = usePermisos();
  const clienteConsultas = useQueryClient();
  const [pagina, setPagina] = useState(1);
  const [aviso, setAviso] = useState('');
  // { publicacion, accion: 'aprobar' | 'rechazar' } mientras hay un diálogo abierto.
  const [revisando, setRevisando] = useState(null);
  const autorizado = puede('noticias.publicar');

  const { data, isPending, isError, error, isPlaceholderData, refetch } = useQuery({
    queryKey: claveBandeja(pagina),
    queryFn: ({ signal }) => listarPublicaciones({ estado: 'EN_REVISION', pagina, porPagina: POR_PAGINA }, signal),
    placeholderData: keepPreviousData,
    enabled: autorizado,
  });

  if (!autorizado) return <SinPermiso />;

  const publicaciones = data?.datos ?? [];

  function terminar(mensaje) {
    setRevisando(null);
    setAviso(mensaje);
    // Listado y bandeja salen de la misma clave: se refrescan juntos.
    clienteConsultas.invalidateQueries({ queryKey: CLAVE_PUBLICACIONES });
    // Si era la última de una página posterior, se vuelve a la anterior.
    if (publicaciones.length === 1 && pagina > 1) setPagina(pagina - 1);
  }

  return (
    <section className="mx-auto max-w-6xl">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold text-ink">Bandeja de revisión</h1>
          <p className="mt-2 text-muted">Publicaciones que esperan tu aprobación.</p>
        </div>
        <Link
          to="/admin/publicaciones"
          className="rounded-md border border-borderSoft bg-white px-4 py-2.5 text-sm font-medium hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark"
        >
          Volver a publicaciones
        </Link>
      </header>

      {aviso && (
        <p role="status" className="mt-4 rounded-md bg-goldPale px-3 py-2 text-sm text-goldDark">
          {aviso}
        </p>
      )}

      <div className="mt-6" aria-busy={isPending || isPlaceholderData}>
        {isPending && (
          <p role="status" className="flex items-center gap-2 py-10 text-sm text-muted">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Cargando la bandeja…
          </p>
        )}

        {isError && !data && (
          <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-redParish/30 bg-redParish/5 p-4 text-sm text-redParish">
            <p className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              No se pudo cargar la bandeja: {error.message}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-md border border-redParish/40 bg-white px-3 py-1.5 font-medium hover:bg-redParish/5 focus-visible:outline-2 focus-visible:outline-redParish"
            >
              Reintentar
            </button>
          </div>
        )}

        {data && (
          <>
            <p className="mb-3 text-sm text-muted" aria-live="polite">
              {data.paginacion.total} {data.paginacion.total === 1 ? 'publicación en revisión' : 'publicaciones en revisión'}
            </p>

            {publicaciones.length ? (
              <ul aria-label="Publicaciones en revisión" className={`flex flex-col gap-3 ${isPlaceholderData ? 'opacity-60' : ''}`}>
                {publicaciones.map((publicacion) => (
                  <li key={publicacion.id} className="rounded-lg border border-borderSoft bg-white p-4">
                    <article aria-label={publicacion.titulo} className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h2 className="font-semibold text-ink">{publicacion.titulo}</h2>
                        <p className="mt-1 text-xs text-muted">
                          {publicacion.tipo.nombre}
                          {publicacion.categoria && ` · ${publicacion.categoria.nombre}`} · {publicacion.autor.nombreCompleto} ·
                          creada el {formatearFecha(publicacion.fechaCreacion)}
                        </p>
                        {publicacion.resumen && <p className="mt-2 text-sm text-charcoal">{publicacion.resumen}</p>}
                      </div>
                      {/* Los botones salen de `acciones`: la API dice qué puede hacer esta sesión. */}
                      <div className="flex flex-wrap gap-2">
                        {publicacion.acciones.includes('EDITAR') && (
                          <Link
                            to={`/admin/publicaciones/${publicacion.id}/editar`}
                            aria-label={`Revisar el contenido de «${publicacion.titulo}»`}
                            className="inline-flex items-center gap-1.5 rounded-md border border-borderSoft bg-white px-3 py-1.5 text-xs font-medium hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark"
                          >
                            <Pencil className="size-3.5" aria-hidden="true" /> Revisar
                          </Link>
                        )}
                        {publicacion.acciones.includes('APROBAR') && (
                          <button
                            type="button"
                            onClick={() => setRevisando({ publicacion, accion: 'aprobar' })}
                            aria-label={`Aprobar «${publicacion.titulo}»`}
                            className="inline-flex items-center gap-1.5 rounded-md bg-gold px-3 py-1.5 text-xs font-semibold text-ink hover:bg-goldDark hover:text-white focus-visible:outline-2 focus-visible:outline-goldDark"
                          >
                            <Check className="size-3.5" aria-hidden="true" /> Aprobar
                          </button>
                        )}
                        {publicacion.acciones.includes('RECHAZAR') && (
                          <button
                            type="button"
                            onClick={() => setRevisando({ publicacion, accion: 'rechazar' })}
                            aria-label={`Rechazar «${publicacion.titulo}»`}
                            className="inline-flex items-center gap-1.5 rounded-md border border-redParish/40 bg-white px-3 py-1.5 text-xs font-semibold text-redParish hover:bg-redParish/5 focus-visible:outline-2 focus-visible:outline-redParish"
                          >
                            <X className="size-3.5" aria-hidden="true" /> Rechazar
                          </button>
                        )}
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-borderSoft bg-white py-12 text-center text-muted">
                <Inbox className="size-10" aria-hidden="true" />
                <p>No hay publicaciones esperando revisión.</p>
              </div>
            )}

            <Paginacion paginacion={data.paginacion} nombre="Paginación de la bandeja" onCambiar={setPagina} />
          </>
        )}
      </div>

      {revisando?.accion === 'aprobar' && (
        <DialogoAprobar publicacion={revisando.publicacion} onCerrar={() => setRevisando(null)} onHecho={terminar} />
      )}
      {revisando?.accion === 'rechazar' && (
        <DialogoRechazar publicacion={revisando.publicacion} onCerrar={() => setRevisando(null)} onHecho={terminar} />
      )}
    </section>
  );
}
