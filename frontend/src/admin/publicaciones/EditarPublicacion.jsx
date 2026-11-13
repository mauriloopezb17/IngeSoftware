import { Link, useLocation, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Loader2 } from 'lucide-react';

import NoEncontrada from '../paginas/NoEncontrada.jsx';
import { CLAVE_PUBLICACIONES, obtenerPublicacion } from './api.js';
import { aCampoFecha, formatearCampoFecha } from './fechas.js';
import FormularioPublicacion from './FormularioPublicacion.jsx';

const enlaceVolver = (
  <Link
    to="/admin/publicaciones"
    className="mt-4 inline-block rounded-md border border-borderSoft bg-white px-4 py-2.5 text-sm font-medium hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark"
  >
    Volver a publicaciones
  </Link>
);

// Por qué la sesión no puede editar la publicación (estados-publicacion.md §5).
function motivoSinEdicion(publicacion) {
  switch (publicacion.estado.codigo) {
    case 'ARCHIVADO':
      return 'Está archivada. Restáurala para poder editarla.';
    case 'EN_REVISION':
      return 'Está en revisión: solo el Párroco o el Administrador pueden corregirla antes de aprobarla.';
    default:
      return 'Solo puedes editar tus propios borradores.';
  }
}

// /admin/publicaciones/:id/editar
export default function EditarPublicacion() {
  const { id } = useParams();
  const { state } = useLocation();
  const esId = /^\d+$/.test(id);

  const { data: publicacion, isPending, isError, error, refetch } = useQuery({
    queryKey: [...CLAVE_PUBLICACIONES, 'detalle', id],
    queryFn: ({ signal }) => obtenerPublicacion(id, signal),
    enabled: esId,
    // Se edita siempre sobre lo último que hay en el servidor.
    staleTime: 0,
    gcTime: 0,
  });

  if (!esId || (isError && error.estado === 404)) return <NoEncontrada />;

  if (isPending)
    return (
      <p role="status" className="flex items-center gap-2 py-10 text-sm text-muted">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Cargando la publicación…
      </p>
    );

  if (isError)
    return (
      <section className="mx-auto max-w-6xl">
        <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-redParish/30 bg-redParish/5 p-4 text-sm text-redParish">
          <p className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            No se pudo cargar la publicación: {error.message}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-md border border-redParish/40 bg-white px-3 py-1.5 font-medium hover:bg-redParish/5 focus-visible:outline-2 focus-visible:outline-redParish"
          >
            Reintentar
          </button>
        </div>
        {enlaceVolver}
      </section>
    );

  if (!publicacion.acciones.includes('EDITAR'))
    return (
      <section className="mx-auto max-w-xl py-10 text-center">
        <h1 className="font-display text-4xl font-semibold text-ink">No se puede editar</h1>
        <p className="mt-3 text-muted">
          «{publicacion.titulo}» no se puede editar ahora. {motivoSinEdicion(publicacion)}
        </p>
        {enlaceVolver}
      </section>
    );

  return (
    <section className="mx-auto max-w-6xl">
      <header>
        <h1 className="font-display text-4xl font-semibold text-ink">Editar publicación</h1>
        <p className="mt-2 text-muted">{publicacion.titulo}</p>
      </header>
      {publicacion.estado.codigo === 'BORRADOR' && publicacion.revision?.observacion && (
        <section
          aria-label="Observación de la revisión"
          className="mt-4 rounded-lg border border-redParish/30 bg-redParish/5 p-4 text-sm"
        >
          <h2 className="font-semibold text-redParish">El Párroco devolvió esta publicación con una observación</h2>
          <p className="mt-1 text-charcoal">{publicacion.revision.observacion}</p>
          <p className="mt-2 text-xs text-muted">
            {publicacion.revision.revisadoPor.nombreCompleto} · {formatearCampoFecha(aCampoFecha(publicacion.revision.fecha))}
          </p>
        </section>
      )}
      <FormularioPublicacion key={publicacion.id} publicacion={publicacion} aviso={state?.aviso} />
    </section>
  );
}
