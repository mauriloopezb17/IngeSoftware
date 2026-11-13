import { Route, Routes } from 'react-router';

import NoEncontrada from '../paginas/NoEncontrada.jsx';
import BandejaRevision from './BandejaRevision.jsx';
import EditarPublicacion from './EditarPublicacion.jsx';
import ListadoPublicaciones from './ListadoPublicaciones.jsx';
import NuevaPublicacion from './NuevaPublicacion.jsx';
import NuevoAviso from './NuevoAviso.jsx';

// Pantalla de la sección Publicaciones. AdminApp la monta en /admin/publicaciones/*: sus subrutas
// (nueva, avisos, avisos/nuevo, revision y :id/editar) se declaran aquí, relativas a esa ruta.
export default function Publicaciones() {
  return (
    <Routes>
      <Route index element={<ListadoPublicaciones />} />
      <Route path="nueva" element={<NuevaPublicacion />} />
      <Route path="avisos" element={<ListadoPublicaciones modo="avisos" />} />
      <Route path="avisos/nuevo" element={<NuevoAviso />} />
      <Route path="revision" element={<BandejaRevision />} />
      <Route path=":id/editar" element={<EditarPublicacion />} />
      <Route path="*" element={<NoEncontrada />} />
    </Routes>
  );
}
