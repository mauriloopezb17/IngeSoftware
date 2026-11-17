import { Link, Route, Routes, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';

import SinPermiso from '../componentes/SinPermiso.jsx';
import NoEncontrada from '../paginas/NoEncontrada.jsx';
import { usePermisos } from '../permisos/usePermisos.js';
import { Aviso, Boton, EncabezadoPantalla, EsqueletoFormulario } from '../ui/index.js';
import { CLAVE_BOLETINES, obtenerBoletin } from './api.js';
import FormularioBoletin from './FormularioBoletin.jsx';
import ListadoBoletines from './ListadoBoletines.jsx';

function NuevoBoletin() {
  const { puede } = usePermisos();
  if (!puede('boletines.gestionar')) return <SinPermiso />;
  return (
    <section className="mx-auto max-w-3xl">
      <EncabezadoPantalla
        titulo="Nuevo boletín"
        descripcion="Se publica directamente, sin revisión. Solo puede haber un boletín por mes."
      />
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
  if (isPending)
    return (
      <section className="mx-auto max-w-3xl">
        <EsqueletoFormulario campos={3} etiqueta="Cargando el boletín…" />
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
          <p>No se pudo cargar el boletín: {error.message}</p>
        </Aviso>
        <div className="mt-4">
          <Boton como={Link} to="/admin/boletines" variante="secundario">
            Volver a boletines
          </Boton>
        </div>
      </section>
    );

  return (
    <section className="mx-auto max-w-3xl">
      <EncabezadoPantalla titulo="Editar boletín" descripcion={boletin.titulo} />
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
