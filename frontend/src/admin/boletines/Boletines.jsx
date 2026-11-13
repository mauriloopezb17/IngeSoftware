import { Link, Route, Routes, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';

import { Cargando, ErrorConsulta } from '../componentes/EstadoConsulta.jsx';
import SinPermiso from '../componentes/SinPermiso.jsx';
import NoEncontrada from '../paginas/NoEncontrada.jsx';
import { usePermisos } from '../permisos/usePermisos.js';
import { CLAVE_BOLETINES, obtenerBoletin } from './api.js';
import FormularioBoletin from './FormularioBoletin.jsx';
import ListadoBoletines from './ListadoBoletines.jsx';

function NuevoBoletin() {
  const { puede } = usePermisos();
  if (!puede('boletines.gestionar')) return <SinPermiso />;
  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="font-display text-4xl font-semibold text-ink">Nuevo boletín</h1>
      <p className="mt-2 text-muted">Se publica directamente, sin revisión. Solo puede haber un boletín por mes.</p>
      <FormularioBoletin />
    </section>
  );
}

function EditarBoletin() {
  const { id } = useParams();
  const { puede } = usePermisos();
  const esId = /^\d+$/.test(id);
  const { data: boletin, isPending, isError, error, refetch } = useQuery({
    queryKey: [...CLAVE_BOLETINES, 'detalle', id],
    queryFn: ({ signal }) => obtenerBoletin(id, signal),
    enabled: esId && puede('boletines.gestionar'),
    staleTime: 0,
  });

  if (!puede('boletines.gestionar')) return <SinPermiso />;
  if (!esId || (isError && error.estado === 404)) return <NoEncontrada />;
  if (isPending) return <Cargando texto="Cargando el boletín…" />;
  if (isError)
    return (
      <section className="mx-auto max-w-3xl">
        <ErrorConsulta texto="No se pudo cargar el boletín" error={error} onReintentar={refetch} />
        <Link to="/admin/boletines" className="mt-4 inline-block text-sm font-medium underline">
          Volver a boletines
        </Link>
      </section>
    );

  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="font-display text-4xl font-semibold text-ink">Editar boletín</h1>
      <p className="mt-2 text-muted">{boletin.titulo}</p>
      <FormularioBoletin key={boletin.id} boletin={boletin} />
    </section>
  );
}

// Sección Boletines: AdminApp la monta en /admin/boletines/* y sus subrutas se declaran aquí.
export default function Boletines() {
  return (
    <Routes>
      <Route index element={<ListadoBoletines />} />
      <Route path="nuevo" element={<NuevoBoletin />} />
      <Route path=":id/editar" element={<EditarBoletin />} />
      <Route path="*" element={<NoEncontrada />} />
    </Routes>
  );
}
