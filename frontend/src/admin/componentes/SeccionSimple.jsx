import { Route, Routes } from 'react-router';

import NoEncontrada from '../paginas/NoEncontrada.jsx';

// Envuelve la pantalla de una sección que todavía no tiene subrutas: responde en su raíz y cualquier
// otra ruta debajo de ella es «no encontrada». Cuando la sección gane subrutas (nuevo, :id...), su
// pantalla declara sus propias <Routes> y deja de usar este envoltorio.
//   horarios: <SeccionSimple><Horarios /></SeccionSimple>
export default function SeccionSimple({ children }) {
  return (
    <Routes>
      <Route index element={children} />
      <Route path="*" element={<NoEncontrada />} />
    </Routes>
  );
}
