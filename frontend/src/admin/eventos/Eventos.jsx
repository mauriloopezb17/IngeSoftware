import { Link, Route, Routes, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';

import SinPermiso from '../componentes/SinPermiso.jsx';
import NoEncontrada from '../paginas/NoEncontrada.jsx';
import { usePermisos } from '../permisos/usePermisos.js';
import { Aviso, Boton, EncabezadoPantalla, EsqueletoFormulario } from '../ui/index.js';
import { CLAVE_EVENTOS, obtenerEvento } from './api.js';
import FormularioEvento from './FormularioEvento.jsx';
import ListadoEventos from './ListadoEventos.jsx';

function NuevoEvento() {
  const { puede } = usePermisos();
  if (!puede('eventos.gestionar')) return <SinPermiso />;
  return (
    <section className="mx-auto max-w-3xl">
      <EncabezadoPantalla titulo="Nuevo evento" descripcion="Se agrega al calendario parroquial." />
      <FormularioEvento />
    </section>
  );
}

function EditarEvento() {
  const { id } = useParams();
  const { puede } = usePermisos();
  const esId = /^\d+$/.test(id);
  const { data: evento, isPending, isError, error, refetch } = useQuery({
    queryKey: [...CLAVE_EVENTOS, 'detalle', id],
    queryFn: ({ signal }) => obtenerEvento(id, signal),
    enabled: esId && puede('eventos.gestionar'),
    staleTime: 0,
  });

  if (!puede('eventos.gestionar')) return <SinPermiso />;
  if (!esId || (isError && error.estado === 404)) return <NoEncontrada />;
  if (isPending)
    return (
      <section className="mx-auto max-w-3xl">
        <EsqueletoFormulario campos={5} etiqueta="Cargando el evento…" />
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
          <p>No se pudo cargar el evento: {error.message}</p>
        </Aviso>
        <div className="mt-4">
          <Boton como={Link} to="/admin/eventos" variante="secundario">
            Volver a eventos
          </Boton>
        </div>
      </section>
    );

  return (
    <section className="mx-auto max-w-3xl">
      <EncabezadoPantalla titulo="Editar evento" descripcion={evento.titulo} />
      <FormularioEvento key={evento.id} evento={evento} />
    </section>
  );
}

// Sección Eventos: AdminApp la monta en /admin/eventos/* y sus subrutas se declaran aquí.
export default function Eventos() {
  return (
    <Routes>
      <Route index element={<ListadoEventos />} />
      <Route path="nuevo" element={<NuevoEvento />} />
      <Route path=":id/editar" element={<EditarEvento />} />
      <Route path="*" element={<NoEncontrada />} />
    </Routes>
  );
}
