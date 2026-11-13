import { Route, Routes } from 'react-router';

import NoEncontrada from '../paginas/NoEncontrada.jsx';
import ListadoPublicaciones from './ListadoPublicaciones.jsx';

// Pantalla de la sección Publicaciones. AdminApp la monta en /admin/publicaciones/*: sus subrutas
// (nueva, :id, :id/editar, revision) se declaran aquí, relativas a esa ruta.
export default function Publicaciones() {
  return (
    <Routes>
      <Route index element={<ListadoPublicaciones />} />
      <Route path="*" element={<NoEncontrada />} />
    </Routes>
  );
}
