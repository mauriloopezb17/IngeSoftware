import { Link, useLocation, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';

import NoEncontrada from '../paginas/NoEncontrada.jsx';
import { Aviso, Boton, EncabezadoPantalla, EsqueletoFormulario } from '../ui/index.js';
import { CLAVE_PUBLICACIONES, obtenerPublicacion } from './api.js';
import { aCampoFecha, formatearCampoFecha } from './fechas.js';
import FormularioPublicacion from './FormularioPublicacion.jsx';

const enlaceVolver = (
  <div className="mt-4">
    <Boton como={Link} to="/admin/publicaciones" variante="secundario">
      Volver a publicaciones
    </Boton>
  </div>
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
      <section className="mx-auto max-w-3xl">
        <EsqueletoFormulario campos={5} etiqueta="Cargando la publicación…" />
      </section>
    );

  if (isError)
    return (
      <section className="mx-auto max-w-3xl">
        <Aviso
          tipo="error"
          accion={
            <Boton variante="secundario" tamano="sm" onClick={() => refetch()}>
              Reintentar
            </Boton>
          }
        >
          <p>No se pudo cargar la publicación: {error.message}</p>
        </Aviso>
        {enlaceVolver}
      </section>
    );

  if (!publicacion.acciones.includes('EDITAR'))
    return (
      <section className="mx-auto max-w-xl py-10 text-center">
        <h1 className="font-body text-2xl font-semibold text-ink sm:text-[28px]">No se puede editar</h1>
        <p className="mt-3 text-sm text-muted">
          «{publicacion.titulo}» no se puede editar ahora. {motivoSinEdicion(publicacion)}
        </p>
        {enlaceVolver}
      </section>
    );

  return (
    <section className="mx-auto max-w-3xl">
      <EncabezadoPantalla
        titulo={publicacion.tipo.codigo === 'AVISO' ? 'Editar aviso' : 'Editar publicación'}
        descripcion={publicacion.titulo}
      />
      {publicacion.estado.codigo === 'BORRADOR' && publicacion.revision?.observacion && (
        <section aria-label="Observación de la revisión" className="mt-5">
          <Aviso tipo="error" titulo="El Párroco devolvió esta publicación con una observación">
            <p>{publicacion.revision.observacion}</p>
            <p className="mt-1.5 text-xs">
              {publicacion.revision.revisadoPor.nombreCompleto} ·{' '}
              {formatearCampoFecha(aCampoFecha(publicacion.revision.fecha))}
            </p>
          </Aviso>
        </section>
      )}
      <FormularioPublicacion key={publicacion.id} publicacion={publicacion} errorInicial={state?.errorInicial} />
    </section>
  );
}
