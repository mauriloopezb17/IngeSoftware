import { Link, Route, Routes, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';

import { Cargando, ErrorConsulta } from '../componentes/EstadoConsulta.jsx';
import SinPermiso from '../componentes/SinPermiso.jsx';
import NoEncontrada from '../paginas/NoEncontrada.jsx';
import { usePermisos } from '../permisos/usePermisos.js';
import { CLAVE_EVENTOS, obtenerEvento } from './api.js';
import FormularioEvento from './FormularioEvento.jsx';
import ListadoEventos from './ListadoEventos.jsx';

function Encabezado({ titulo, subtitulo }) {
  return (
    <header>
      <h1 className="font-display text-4xl font-semibold text-ink">{titulo}</h1>
      {subtitulo && <p className="mt-2 text-muted">{subtitulo}</p>}
    </header>
  );
}

function NuevoEvento() {
  const { puede } = usePermisos();
  if (!puede('eventos.gestionar')) return <SinPermiso />;
  return (
    <section className="mx-auto max-w-5xl">
      <Encabezado titulo="Nuevo evento" subtitulo="Se agrega al calendario parroquial." />
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
  if (isPending) return <Cargando texto="Cargando el evento…" />;
  if (isError)
    return (
      <section className="mx-auto max-w-5xl">
        <ErrorConsulta texto="No se pudo cargar el evento" error={error} onReintentar={refetch} />
        <Link to="/admin/eventos" className="mt-4 inline-block text-sm font-medium underline">
          Volver a eventos
        </Link>
      </section>
    );

  return (
    <section className="mx-auto max-w-5xl">
      <Encabezado titulo="Editar evento" subtitulo={evento.titulo} />
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
