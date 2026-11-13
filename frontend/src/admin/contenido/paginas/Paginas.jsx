import { Route, Routes, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';

import NoEncontrada from '../../paginas/NoEncontrada.jsx';
import { usePermisos } from '../../permisos/usePermisos.js';
import { CLAVE_PAGINAS, listarPaginas } from './api.js';
import EditorBloques from './EditorBloques.jsx';
import ListadoPaginas from './ListadoPaginas.jsx';

// /admin/paginas/:id: la página y sus bloques. Necesita la lista para elegir la página padre al editar sus datos.
function EditorPagina() {
  const { id } = useParams();
  const { puede } = usePermisos();
  const esId = /^\d+$/.test(id);
  const paginasQuery = useQuery({
    queryKey: [...CLAVE_PAGINAS, { estado: '' }], // la misma que el listado sin filtro
    queryFn: () => listarPaginas({}),
    enabled: esId,
  });

  if (!esId) return <NoEncontrada />;
  return (
    <EditorBloques
      key={id}
      paginaId={Number(id)}
      paginasDisponibles={paginasQuery.data ?? []}
      puedeGestionar={puede('paginas.gestionar')}
    />
  );
}

// Sección Páginas: AdminApp la monta en /admin/paginas/* y sus subrutas se declaran aquí.
export default function Paginas() {
  return (
    <Routes>
      <Route index element={<ListadoPaginas />} />
      <Route path=":id" element={<EditorPagina />} />
      <Route path="*" element={<NoEncontrada />} />
    </Routes>
  );
}
