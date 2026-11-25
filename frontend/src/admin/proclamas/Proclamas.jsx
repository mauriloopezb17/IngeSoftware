import { Link, Route, Routes, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';

import SinPermiso from '../componentes/SinPermiso.jsx';
import { formatearFecha } from '../multimedia/formato.js';
import NoEncontrada from '../paginas/NoEncontrada.jsx';
import { usePermisos } from '../permisos/usePermisos.js';
import { Aviso, Boton, EncabezadoPantalla, EsqueletoFormulario } from '../ui/index.js';
import { CLAVE_PROCLAMAS, obtenerProclama } from './api.js';
import FormularioProclama from './FormularioProclama.jsx';
import ListadoProclamas from './ListadoProclamas.jsx';
import PublicacionesProclama from './PublicacionesProclama.jsx';
import SeccionDetalleProclama from './SeccionDetalleProclama.jsx';

function NuevaProclama() {
  const { puede } = usePermisos();
  if (!puede('proclamas.gestionar')) return <SinPermiso />;
  return (
    <section className="mx-auto max-w-3xl">
      <EncabezadoPantalla titulo="Nueva proclama" descripcion="Registra a los contrayentes y la fecha del matrimonio." />
      <FormularioProclama />
    </section>
  );
}

// /admin/proclamas/:id/editar: datos de la proclama y su historial de publicaciones. Quien solo consulta
// (Marketing) ve los mismos datos en solo lectura.
function DetalleProclama() {
  const { id } = useParams();
  const { puede } = usePermisos();
  const editable = puede('proclamas.gestionar');
  const editableDetalle = puede('proclamas.detalle');
  const esId = /^\d+$/.test(id);

  const { data: proclama, isPending, isError, error, refetch } = useQuery({
    queryKey: [...CLAVE_PROCLAMAS, 'detalle', id],
    queryFn: ({ signal }) => obtenerProclama(id, signal),
    enabled: esId,
    staleTime: 0,
  });

  if (!esId || (isError && error.estado === 404)) return <NoEncontrada />;
  if (isPending)
    return (
      <section className="mx-auto max-w-3xl">
        <EsqueletoFormulario campos={4} etiqueta="Cargando la proclama…" />
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
          <p>No se pudo cargar la proclama: {error.message}</p>
        </Aviso>
      </section>
    );

  return (
    <section className="mx-auto max-w-3xl">
      <EncabezadoPantalla
        titulo={editable ? 'Editar proclama' : 'Proclama'}
        descripcion={`${proclama.contrayente1} y ${proclama.contrayente2}`}
      />

      {editable ? (
        <FormularioProclama key={proclama.id} proclama={proclama} />
      ) : (
        <>
          <Aviso tipo="soloLectura" className="mt-4">
            <p>
              <strong className="font-semibold text-ink">Solo lectura.</strong>{' '}
              {editableDetalle
                ? 'Tu rol no puede modificar los datos ni las fechas de la proclama, pero sí su página pública más abajo.'
                : 'Tu rol puede consultar las proclamas, pero no modificarlas.'}
            </p>
          </Aviso>
          <dl className="mt-4 grid gap-2 rounded-lg border border-sand bg-white p-5 text-sm sm:grid-cols-[auto_1fr]">
            <dt className="font-semibold text-ink">Matrimonio</dt>
            <dd className="text-muted">{formatearFecha(proclama.fechaMatrimonio)}</dd>
          </dl>
          <div className="mt-4">
            <Boton como={Link} to="/admin/proclamas" variante="secundario">
              Volver a proclamas
            </Boton>
          </div>
        </>
      )}

      <PublicacionesProclama proclama={proclama} editable={editable} />
      <SeccionDetalleProclama key={`detalle-${proclama.id}`} proclama={proclama} editable={editableDetalle} />
    </section>
  );
}

// Sección Proclamas: AdminApp la monta en /admin/proclamas/* y sus subrutas se declaran aquí.
export default function Proclamas() {
  return (
    <Routes>
      <Route index element={<ListadoProclamas />} />
      <Route path="nueva" element={<NuevaProclama />} />
      <Route path=":id/editar" element={<DetalleProclama />} />
      <Route path="*" element={<NoEncontrada />} />
    </Routes>
  );
}
