import { useState } from 'react';
import { Link } from 'react-router';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Inbox, Pencil, X } from 'lucide-react';

import Paginacion from '../componentes/Paginacion.jsx';
import SinPermiso from '../componentes/SinPermiso.jsx';
import { formatearFecha } from '../multimedia/formato.js';
import { usePermisos } from '../permisos/usePermisos.js';
import { Aviso, Boton, EncabezadoPantalla, EsqueletoTarjetas, EstadoVacio, useToast } from '../ui/index.js';
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
  const toast = useToast();
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
    toast.exito(mensaje);
    // Listado y bandeja salen de la misma clave: se refrescan juntos.
    clienteConsultas.invalidateQueries({ queryKey: CLAVE_PUBLICACIONES });
    // Si era la última de una página posterior, se vuelve a la anterior.
    if (publicaciones.length === 1 && pagina > 1) setPagina(pagina - 1);
  }

  return (
    <section className="mx-auto max-w-5xl">
      <EncabezadoPantalla
        titulo="Bandeja de revisión"
        descripcion="Publicaciones que esperan tu aprobación."
        acciones={
          <Boton como={Link} to="/admin/publicaciones" variante="secundario">
            Volver a publicaciones
          </Boton>
        }
      />

      {aviso && (
        <Aviso tipo="exito" className="mt-5">
          <p>{aviso}</p>
        </Aviso>
      )}

      <div className="mt-6" aria-busy={isPending || isPlaceholderData}>
        {isPending && <EsqueletoTarjetas cantidad={3} columnas="grid-cols-1" etiqueta="Cargando la bandeja…" />}

        {isError && !data && (
          <Aviso
            tipo="error"
            accion={
              <Boton variante="secundario" tamano="sm" onClick={() => refetch()}>
                Reintentar
              </Boton>
            }
          >
            <p>No se pudo cargar la bandeja: {error.message}</p>
          </Aviso>
        )}

        {data && (
          <>
            <p className="mb-3 text-sm tabular-nums text-muted" aria-live="polite">
              {data.paginacion.total} {data.paginacion.total === 1 ? 'publicación en revisión' : 'publicaciones en revisión'}
            </p>

            {publicaciones.length ? (
              <ul aria-label="Publicaciones en revisión" className={`flex flex-col gap-3 ${isPlaceholderData ? 'opacity-60' : ''}`}>
                {publicaciones.map((publicacion) => (
                  <li key={publicacion.id} className="rounded-lg border border-sand bg-white p-5">
                    <article aria-label={publicacion.titulo} className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h2 className="text-base font-semibold text-ink">{publicacion.titulo}</h2>
                        <p className="mt-1 text-xs text-muted">
                          {publicacion.tipo.nombre}
                          {publicacion.categoria && ` · ${publicacion.categoria.nombre}`} · {publicacion.autor.nombreCompleto} ·
                          creada el {formatearFecha(publicacion.fechaCreacion)}
                        </p>
                        {publicacion.resumen && <p className="mt-2 text-sm text-ink">{publicacion.resumen}</p>}
                      </div>
                      {/* Los botones salen de `acciones`: la API dice qué puede hacer esta sesión. */}
                      <div className="flex flex-wrap gap-2">
                        {publicacion.acciones.includes('EDITAR') && (
                          <Boton
                            como={Link}
                            to={`/admin/publicaciones/${publicacion.id}/editar`}
                            variante="secundario"
                            tamano="sm"
                            icono={Pencil}
                            aria-label={`Revisar el contenido de «${publicacion.titulo}»`}
                          >
                            Revisar
                          </Boton>
                        )}
                        {publicacion.acciones.includes('APROBAR') && (
                          <Boton
                            variante="primario"
                            tamano="sm"
                            icono={Check}
                            onClick={() => setRevisando({ publicacion, accion: 'aprobar' })}
                            aria-label={`Aprobar «${publicacion.titulo}»`}
                          >
                            Aprobar
                          </Boton>
                        )}
                        {publicacion.acciones.includes('RECHAZAR') && (
                          <Boton
                            variante="peligro"
                            tamano="sm"
                            icono={X}
                            onClick={() => setRevisando({ publicacion, accion: 'rechazar' })}
                            aria-label={`Rechazar «${publicacion.titulo}»`}
                          >
                            Rechazar
                          </Boton>
                        )}
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            ) : (
              <EstadoVacio
                icono={Inbox}
                titulo="No hay publicaciones esperando revisión."
                descripcion="Cuando el equipo envíe noticias para aprobar, aparecerán aquí."
              />
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
