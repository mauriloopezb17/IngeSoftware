import { Link, Route, Routes, useLocation, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';

import { AvisoSoloLectura, Cargando, ErrorConsulta } from '../componentes/EstadoConsulta.jsx';
import SinPermiso from '../componentes/SinPermiso.jsx';
import { formatearFecha } from '../multimedia/formato.js';
import NoEncontrada from '../paginas/NoEncontrada.jsx';
import { usePermisos } from '../permisos/usePermisos.js';
import { CLAVE_PROCLAMAS, obtenerProclama } from './api.js';
import FormularioProclama from './FormularioProclama.jsx';
import ListadoProclamas from './ListadoProclamas.jsx';
import PublicacionesProclama from './PublicacionesProclama.jsx';

function NuevaProclama() {
  const { puede } = usePermisos();
  if (!puede('proclamas.gestionar')) return <SinPermiso />;
  return (
    <section className="mx-auto max-w-4xl">
      <h1 className="font-display text-4xl font-semibold text-ink">Nueva proclama</h1>
      <p className="mt-2 text-muted">Registra a los contrayentes y la fecha del matrimonio.</p>
      <FormularioProclama />
    </section>
  );
}

// /admin/proclamas/:id/editar: datos de la proclama y su historial de publicaciones. Quien solo consulta
// (Marketing) ve los mismos datos en solo lectura.
function DetalleProclama() {
  const { id } = useParams();
  const { state } = useLocation();
  const { puede } = usePermisos();
  const editable = puede('proclamas.gestionar');
  const esId = /^\d+$/.test(id);

  const { data: proclama, isPending, isError, error, refetch } = useQuery({
    queryKey: [...CLAVE_PROCLAMAS, 'detalle', id],
    queryFn: ({ signal }) => obtenerProclama(id, signal),
    enabled: esId,
    staleTime: 0,
  });

  if (!esId || (isError && error.estado === 404)) return <NoEncontrada />;
  if (isPending) return <Cargando texto="Cargando la proclama…" />;
  if (isError)
    return (
      <section className="mx-auto max-w-4xl">
        <ErrorConsulta texto="No se pudo cargar la proclama" error={error} onReintentar={refetch} />
      </section>
    );

  return (
    <section className="mx-auto max-w-4xl">
      <h1 className="font-display text-4xl font-semibold text-ink">
        {editable ? 'Editar proclama' : 'Proclama'}
      </h1>
      <p className="mt-2 text-muted">
        {proclama.contrayente1} y {proclama.contrayente2}
      </p>
      {state?.aviso && (
        <p role="status" className="mt-4 rounded-md bg-goldPale px-3 py-2 text-sm text-goldDark">
          {state.aviso}
        </p>
      )}

      {editable ? (
        <FormularioProclama key={proclama.id} proclama={proclama} />
      ) : (
        <>
          <AvisoSoloLectura>Tu rol puede consultar las proclamas, pero no modificarlas.</AvisoSoloLectura>
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-[auto_1fr]">
            <dt className="font-semibold">Matrimonio</dt>
            <dd>{formatearFecha(proclama.fechaMatrimonio)}</dd>
          </dl>
          <Link to="/admin/proclamas" className="mt-4 inline-block text-sm font-medium underline">
            Volver a proclamas
          </Link>
        </>
      )}

      <PublicacionesProclama proclama={proclama} editable={editable} />
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
